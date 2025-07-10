import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
  typescript: true,
})

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: "usd",
  country: "US",
  // Product IDs for different payment types
  goalPledgeProductId: process.env.STRIPE_GOAL_PLEDGE_PRODUCT_ID,
} as const

// Validate Stripe configuration
export function validateStripeConfig() {
  const requiredEnvVars = ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(`Missing required Stripe environment variables: ${missingVars.join(", ")}`)
  }

  return true
}
