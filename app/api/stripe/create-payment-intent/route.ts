import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { amount, goalId, userId } = await request.json()

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user from Convex
    const user = await convex.query(api.users.getUserById, { userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let customerId = user.stripeCustomerId

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          convexUserId: userId,
          clerkId: user.clerkId,
        },
      })
      
      customerId = customer.id
      
      // Update user with Stripe customer ID
      await convex.mutation(api.users.updateStripeCustomerId, {
        userId,
        stripeCustomerId: customerId,
      })
    }

    // Check if user has existing payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    // Always create a Stripe Checkout session for payment method setup
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/create-goal?canceled=true`,
      metadata: {
        goalId: goalId || '',
        userId: userId,
        type: 'goal_pledge_setup',
        amount: amount.toString(),
      },
      setup_intent_data: {
        metadata: {
          goalId: goalId || '',
          userId: userId,
          type: 'goal_pledge_setup',
          amount: amount.toString(),
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      amount: amount,
      hasSavedCards: false,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 