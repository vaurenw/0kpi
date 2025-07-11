import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function mask(str?: string) {
  if (!str) return '[undefined]'
  if (str.length <= 8) return '[too short]'
  return str.slice(0, 4) + '...' + str.slice(-4)
}

export async function POST(request: NextRequest) {
  try {
    const { paymentMethodId, amount, customerId, goalId } = await request.json()

    // Validate and sanitize input
    if (!paymentMethodId || typeof paymentMethodId !== 'string' || paymentMethodId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid payment method ID is required' },
        { status: 400 }
      )
    }

    if (!amount || typeof amount !== 'number' || amount < 0.5 || amount > 10000) {
      return NextResponse.json(
        { error: 'Valid amount is required (between $0.50 and $10,000)' },
        { status: 400 }
      )
    }

    if (!customerId || typeof customerId !== 'string' || customerId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid customer ID is required' },
        { status: 400 }
      )
    }

    if (goalId && (typeof goalId !== 'string' || goalId.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Invalid goal ID' },
        { status: 400 }
      )
    }

    // Verify the request is authorized
    const apiKey = request.headers.get('x-internal-api-key')
    const envKey = process.env.INTERNAL_API_KEY
    console.log('[DEBUG] X-Internal-Api-Key header:', mask(apiKey ?? undefined))
    console.log('[DEBUG] INTERNAL_API_KEY:', mask(envKey ?? undefined))
    if (apiKey !== envKey) {
      console.error('[DEBUG] Authorization failed. Header:', mask(apiKey ?? undefined), 'Expected:', mask(envKey ?? undefined))
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

    return NextResponse.json({ paymentIntentId: paymentIntent.id }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}