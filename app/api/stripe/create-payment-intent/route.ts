import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { amount, goalId, userId } = await request.json()

    // Validate and sanitize input
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000) {
      return NextResponse.json({ error: 'Invalid amount (must be between $0.01 and $10,000)' }, { status: 400 })
    }
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json({ error: 'Valid user ID is required' }, { status: 400 })
    }
    if (goalId && (typeof goalId !== 'string' || goalId.trim().length === 0)) {
      return NextResponse.json({ error: 'Invalid goal ID' }, { status: 400 })
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

    // Create a Stripe Checkout session in setup mode
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'setup',
      currency: 'usd', // Required for setup mode with dynamic payment methods
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/create-goal?canceled=true`,
      metadata: {
        goalId: goalId || '',
        userId: userId,
        type: 'goal_pledge_setup',
        amount: amount.toString(),
        setupType: 'future_payment',
      },
      setup_intent_data: {
        metadata: {
          goalId: goalId || '',
          userId: userId,
          type: 'goal_pledge_setup',
          amount: amount.toString(),
          setupType: 'future_payment',
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      amount: amount,
      hasSavedCards: paymentMethods.data.length > 0,
      customerId: customerId,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 