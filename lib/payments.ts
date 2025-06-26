// Future payment service
export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  status: "requires_payment_method" | "requires_confirmation" | "succeeded" | "canceled" | "processing"
}

export interface PaymentSetupData {
  amount: number
  goalId?: string
  userId: string
}

import { stripe, STRIPE_CONFIG } from './stripe'

// Payment service with actual Stripe integration
export const paymentService = {
  async createPaymentIntent(data: PaymentSetupData): Promise<PaymentIntent> {
    try {
      // Create a price for this specific amount if using products
      let priceId: string | undefined
      
      if (STRIPE_CONFIG.goalPledgeProductId) {
        const price = await stripe.prices.create({
          unit_amount: Math.round(data.amount * 100), // Convert dollars to cents for Stripe
          currency: 'usd',
          product: STRIPE_CONFIG.goalPledgeProductId,
        })
        priceId = price.id
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert dollars to cents for Stripe
        currency: 'usd',
        capture_method: 'manual', // Authorization only
        setup_future_usage: 'off_session', // Allow future charges
        metadata: {
          goalId: data.goalId || '',
          userId: data.userId,
          type: 'goal_pledge',
          productId: STRIPE_CONFIG.goalPledgeProductId || '',
          priceId: priceId || '',
        },
      })

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        status: paymentIntent.status as PaymentIntent['status'],
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw error
    }
  },

  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      })

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        status: paymentIntent.status as PaymentIntent['status'],
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
      throw error
    }
  },

  async capturePayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
      return paymentIntent.status === 'succeeded'
    } catch (error) {
      console.error('Error capturing payment:', error)
      throw error
    }
  },

  async cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId)
      return paymentIntent.status === 'canceled'
    } catch (error) {
      console.error('Error canceling payment intent:', error)
      throw error
    }
  },

  async processExpiredGoals(): Promise<{ processed: number; failed: number }> {
    // This will be handled by your Convex cron job
    // For now, return mock data
    return { processed: 0, failed: 0 }
  },
}
