import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { goalId, customerId, amount } = await request.json()

    // Validate input
    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // Get the goal to check current payment method
    const goal = await convex.query(api.goals.getGoalById, { goalId })
    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    // Create a new Checkout session for payment method update
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'setup',
      currency: 'usd',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&update_payment=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-goals?canceled=true`,
      metadata: {
        goalId: goalId,
        userId: goal.userId,
        type: 'payment_method_update',
        amount: amount.toString(),
        setupType: 'payment_recovery',
      },
      setup_intent_data: {
        metadata: {
          goalId: goalId,
          userId: goal.userId,
          type: 'payment_method_update',
          amount: amount.toString(),
          setupType: 'payment_recovery',
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      amount: amount,
      isUpdate: true,
    })
  } catch (error) {
    console.error('Error creating payment method update session:', error)
    return NextResponse.json(
      { error: 'Failed to create update session' },
      { status: 500 }
    )
  }
} 