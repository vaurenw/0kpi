import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('[WEBHOOK] No signature header received')
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('[WEBHOOK] Event received:', event.type, event.id)
  } catch (err) {
    console.error('[WEBHOOK] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        console.log('[WEBHOOK] checkout.session.completed metadata:', session.metadata)
        await handleCheckoutSessionCompleted(session)
        break

      case 'setup_intent.succeeded':
        const setupIntent = event.data.object
        console.log('[WEBHOOK] setup_intent.succeeded metadata:', setupIntent.metadata)
        await handleSetupIntentSucceeded(setupIntent)
        break

      case 'setup_intent.setup_failed':
        const failedSetupIntent = event.data.object
        console.log('[WEBHOOK] setup_intent.setup_failed metadata:', failedSetupIntent.metadata)
        await handleSetupIntentFailed(failedSetupIntent)
        break

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object
        console.log('[WEBHOOK] payment_intent.succeeded metadata:', paymentIntent.metadata)
        await handlePaymentIntentSucceeded(paymentIntent)
        break

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object
        console.log('[WEBHOOK] payment_intent.payment_failed metadata:', failedPaymentIntent.metadata)
        await handlePaymentIntentFailed(failedPaymentIntent)
        break

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('[WEBHOOK] Checkout session completed:', session.id)
  if (session.mode === 'setup') {
    const { userId, goalId, amount, setupType } = session.metadata
    console.log('[WEBHOOK] Session metadata:', session.metadata)
    
    if (session.setup_intent) {
      try {
        // Retrieve the SetupIntent with expanded payment_method
        const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent, {
          expand: ['payment_method'],
        })
        
        console.log('[WEBHOOK] Retrieved setupIntent:', setupIntent.id, setupIntent.metadata)
        
        if (setupIntent.payment_method && session.customer) {
          // The payment method should already be attached to the customer
          // but let's verify and attach if needed
          const paymentMethod = setupIntent.payment_method as any
          
          if (paymentMethod.customer !== session.customer) {
            await stripe.paymentMethods.attach(paymentMethod.id, {
              customer: session.customer,
            })
            console.log('[WEBHOOK] Payment method attached to customer:', session.customer)
          } else {
            console.log('[WEBHOOK] Payment method already attached to customer')
          }
          
          // Save the payment method ID to the goal and mark payment setup as complete
          if (goalId && paymentMethod.id) {
            try {
              const result = await convex.mutation(api.goals.savePaymentMethodId, {
                goalId,
                paymentMethodId: paymentMethod.id,
              })
              console.log('[WEBHOOK] Payment method ID saved to goal:', goalId, 'Result:', result)
              // Mark payment setup as complete
              await convex.mutation(api.goals.updatePaymentSetupComplete, { goalId })
              console.log('[WEBHOOK] Payment setup marked complete for goal:', goalId)
            } catch (error) {
              console.error('[WEBHOOK] Error saving payment method ID to goal or updating payment setup complete:', error)
            }
          }
        } else {
          console.warn('[WEBHOOK] Missing payment_method or customer in setup intent')
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing setup intent:', error)
      }
    } else {
      console.warn('[WEBHOOK] No setup_intent on session')
    }
  }
}

async function handleSetupIntentSucceeded(setupIntent: any) {
  console.log('[WEBHOOK] Setup intent succeeded:', setupIntent.id)
  const { userId, goalId, amount, setupType } = setupIntent.metadata
  console.log('[WEBHOOK] SetupIntent metadata:', setupIntent.metadata)
  
  if (setupIntent.payment_method && goalId) {
    console.log('[WEBHOOK] Payment method ready for future use:', setupIntent.payment_method)
    
    try {
      const result = await convex.mutation(api.goals.savePaymentMethodId, {
        goalId,
        paymentMethodId: setupIntent.payment_method,
      })
      console.log('[WEBHOOK] Payment method ID saved to goal:', goalId, 'Result:', result)
    } catch (error) {
      console.error('[WEBHOOK] Error saving payment method ID to goal:', error)
    }
  } else {
    console.warn('[WEBHOOK] Missing goalId or payment_method in setup_intent.succeeded')
  }
}

async function handleSetupIntentFailed(setupIntent: any) {
  console.log('[WEBHOOK] Setup intent failed:', setupIntent.id)
  const { userId, goalId, amount } = setupIntent.metadata
  
  if (goalId) {
    try {
      // Update goal status or create notification about setup failure
      await convex.mutation(api.goals.updateGoalStatus, {
        goalId,
        status: 'cancelled',
        reason: 'Payment method setup failed',
      })
      
      // Create notification for user
      await convex.mutation(api.notifications.createNotification, {
        userId,
        goalId,
        type: 'payment_failed',
        title: 'Payment Setup Failed',
        message: 'Failed to set up payment method for your goal. Please try again.',
      })
    } catch (error) {
      console.error('[WEBHOOK] Error handling setup intent failure:', error)
    }
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('[WEBHOOK] Payment intent succeeded:', paymentIntent.id)
  const { goalId, type } = paymentIntent.metadata
  
  if (goalId && type === 'goal_pledge_charge') {
    try {
      // Update goal payment status
      await convex.mutation(api.goals.updatePaymentStatus, {
        goalId,
        paymentProcessed: true,
        paymentProcessedAt: Date.now(),
      })
      
      // Create payment record
      await convex.mutation(api.payments.createPayment, {
        goalId,
        userId: paymentIntent.metadata.userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
      })
      
      console.log('[WEBHOOK] Payment processed successfully for goal:', goalId)
    } catch (error) {
      console.error('[WEBHOOK] Error processing successful payment:', error)
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('[WEBHOOK] Payment intent failed:', paymentIntent.id)
  const { goalId, type, userId } = paymentIntent.metadata
  
  if (goalId && type === 'goal_pledge_charge') {
    try {
      // Create notification for failed payment
      await convex.mutation(api.notifications.createNotification, {
        userId,
        goalId,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Your payment for the failed goal could not be processed. Please update your payment method.',
      })
      
      console.log('[WEBHOOK] Payment failure notification created for goal:', goalId)
    } catch (error) {
      console.error('[WEBHOOK] Error handling payment failure:', error)
    }
  }
} 