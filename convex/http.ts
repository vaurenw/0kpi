import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { api, internal } from "./_generated/api"

const http = httpRouter()

// Stripe webhook handler
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      console.error("Missing stripe-signature header")
      return new Response("Missing stripe-signature header", { status: 400 })
    }

    try {
      const body = await request.text()

      // Get webhook secret from environment
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not configured")
        return new Response("Webhook secret not configured", { status: 500 })
      }

      // Note: In a real implementation, you would verify the webhook signature here
      // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

      // For now, we'll parse the body as JSON (replace with proper verification)
      const event = JSON.parse(body)

      console.log(`Processing Stripe webhook: ${event.type}`)

      switch (event.type) {
        case "payment_intent.succeeded":
          await ctx.runMutation(api.payments.updatePaymentStatus, {
            stripePaymentIntentId: event.data.object.id,
            status: "succeeded",
          })
          console.log(`Payment succeeded: ${event.data.object.id}`)
          break

        case "payment_intent.payment_failed":
          await ctx.runMutation(api.payments.updatePaymentStatus, {
            stripePaymentIntentId: event.data.object.id,
            status: "failed",
            failureReason: event.data.object.last_payment_error?.message || "Payment failed",
          })
          console.log(`Payment failed: ${event.data.object.id}`)
          break

        case "payment_intent.canceled":
          await ctx.runMutation(api.payments.updatePaymentStatus, {
            stripePaymentIntentId: event.data.object.id,
            status: "cancelled",
          })
          console.log(`Payment cancelled: ${event.data.object.id}`)
          break

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`)
      }

      return new Response("OK", { status: 200 })
    } catch (error) {
      console.error("Stripe webhook error:", error)
      return new Response("Webhook processing failed", { status: 400 })
    }
  }),
})

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  }),
})

// Cron job trigger endpoint (secured with secret)
http.route({
  path: "/cron/process-expired-goals",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 })
    }

    try {
      const result = await ctx.runMutation(internal.cron.processExpiredGoals, {})
      console.log(`Processed ${result.processedCount} expired goals`)

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error("Cron job error:", error)
      return new Response("Internal server error", { status: 500 })
    }
  }),
})

// Cron job for sending reminders
http.route({
  path: "/cron/send-reminders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 })
    }

    try {
      const result = await ctx.runMutation(internal.cron.sendDeadlineReminders, {})
      console.log(`Sent ${result.remindersSent} deadline reminders`)

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error("Reminder cron job error:", error)
      return new Response("Internal server error", { status: 500 })
    }
  }),
})

export default http
