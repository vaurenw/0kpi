import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { paymentMethodId, amount, customerId, goalId } = await request.json()

    // Validate input
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Verify the request is authorized
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get goal details for better error handling
    const goal = goalId ? await convex.query(api.goals.getGoalById, { goalId }) : null

    // Create and confirm a PaymentIntent using the saved payment method
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert dollars to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          goalId: goalId || '',
          type: 'goal_pledge_charge',
          userId: goal?.userId || '',
        },
      }, {
        idempotencyKey: goalId ? `goal-charge-${goalId}` : undefined,
      })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create PaymentIntent' }, { status: 500 })
    }

    return NextResponse.json({ paymentIntent: paymentIntent.client_secret }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}