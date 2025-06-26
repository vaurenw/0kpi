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
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        await handleCheckoutSessionCompleted(session)
        break

      case 'setup_intent.succeeded':
        const setupIntent = event.data.object
        await handleSetupIntentSucceeded(setupIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('Checkout session completed:', session.id)
  
  if (session.mode === 'setup') {
    const { userId, goalId, amount } = session.metadata
    
    // Store the payment method with the customer
    if (session.setup_intent) {
      const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent)
      
      // Attach payment method to customer if not already attached
      if (setupIntent.payment_method && session.customer) {
        await stripe.paymentMethods.attach(setupIntent.payment_method, {
          customer: session.customer,
        })
        console.log('Payment method attached to customer:', session.customer)
        
        // Also save the payment method ID to the goal
        if (goalId && setupIntent.payment_method) {
          try {
            await convex.mutation(api.goals.savePaymentMethodId, {
              goalId,
              paymentMethodId: setupIntent.payment_method,
            })
            console.log('Payment method ID saved to goal from checkout session:', goalId)
          } catch (error) {
            console.error('Error saving payment method ID to goal from checkout session:', error)
          }
        }
      }
    }
  }
}

async function handleSetupIntentSucceeded(setupIntent: any) {
  console.log('Setup intent succeeded:', setupIntent.id)
  
  const { userId, goalId, amount } = setupIntent.metadata
  
  // Payment method is now available for future use
  if (setupIntent.payment_method && goalId) {
    console.log('Payment method ready for future use:', setupIntent.payment_method)
    
    // Store the payment method ID on the goal
    try {
      await convex.mutation(api.goals.savePaymentMethodId, {
        goalId,
        paymentMethodId: setupIntent.payment_method,
      })
      console.log('Payment method ID saved to goal:', goalId)
    } catch (error) {
      console.error('Error saving payment method ID to goal:', error)
    }
  }
} 