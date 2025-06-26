import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { paymentMethodId, amount, goalData } = await request.json()

    // Create a payment intent using the saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents for Stripe
      currency: 'usd',
      customer: goalData.userId, // This should be the customer ID
      payment_method: paymentMethodId,
      confirm: false, // Don't confirm yet, just authorize
      capture_method: 'manual',
      setup_future_usage: 'off_session',
      metadata: {
        goalId: goalData.goalId || '',
        userId: goalData.userId,
        type: 'goal_pledge_authorization',
      },
    })

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      success: true,
    })
  } catch (error) {
    console.error('Error using saved card:', error)
    return NextResponse.json(
      { error: 'Failed to use saved card' },
      { status: 500 }
    )
  }
} 