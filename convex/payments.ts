import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create payment record
export const createPayment = mutation({
  args: {
    goalId: v.id("goals"),
    userId: v.id("users"),
    stripePaymentIntentId: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.stripePaymentIntentId || args.stripePaymentIntentId.trim().length === 0) {
      throw new Error("Stripe payment intent ID is required")
    }

    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than 0")
    }

    if (!args.currency || args.currency.trim().length === 0) {
      throw new Error("Currency is required")
    }

    try {
      // Verify goal and user exist
      const goal = await ctx.db.get(args.goalId)
      const user = await ctx.db.get(args.userId)

      if (!goal) {
        throw new Error("Goal not found")
      }

      if (!user) {
        throw new Error("User not found")
      }

      if (goal.userId !== args.userId) {
        throw new Error("Goal does not belong to user")
      }

      // Check if payment already exists
      const existingPayment = await ctx.db
        .query("payments")
        .withIndex("by_stripe_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
        .unique()

      if (existingPayment) {
        throw new Error("Payment record already exists for this payment intent")
      }

      const paymentId = await ctx.db.insert("payments", {
        goalId: args.goalId,
        userId: args.userId,
        stripePaymentIntentId: args.stripePaymentIntentId.trim(),
        amount: args.amount,
        currency: args.currency.toLowerCase().trim(),
        status: "pending",
      })

      console.log(`Payment record created: ${paymentId}`)
      return paymentId
    } catch (error) {
      console.error("Error creating payment record:", error)
      throw error
    }
  },
})

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    stripePaymentIntentId: v.string(),
    status: v.union(v.literal("succeeded"), v.literal("failed"), v.literal("cancelled")),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.stripePaymentIntentId || args.stripePaymentIntentId.trim().length === 0) {
      throw new Error("Stripe payment intent ID is required")
    }

    try {
      const payment = await ctx.db
        .query("payments")
        .withIndex("by_stripe_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
        .unique()

      if (!payment) {
        throw new Error("Payment not found")
      }

      const now = Date.now()
      await ctx.db.patch(payment._id, {
        status: args.status,
        processedAt: now,
        failureReason: args.failureReason,
      })

      // Update goal payment status if payment succeeded
      if (args.status === "succeeded") {
        await ctx.db.patch(payment.goalId, {
          paymentProcessed: true,
          paymentProcessedAt: now,
        })

        // Fetch the goal to get its title
        const goal = await ctx.db.get(payment.goalId);
        const goalTitle = goal ? goal.title : "your goal";

        // Create notification
        await ctx.db.insert("notifications", {
          userId: payment.userId,
          goalId: payment.goalId,
          type: "payment_processed",
          title: "Payment Processed",
          message: `Payment of $${payment.amount} has been processed for "${goalTitle}"`,
          read: false,
        })
      } else if (args.status === "failed") {
        // Create notification for failed payment
        const goal = await ctx.db.get(payment.goalId)
        if (goal) {
          await ctx.db.insert("notifications", {
            userId: payment.userId,
            goalId: payment.goalId,
            type: "payment_failed",
            title: "Payment Failed",
            message: `Payment processing failed for "${goal.title}". ${args.failureReason || "Please check your payment method."}`,
            read: false,
          })
        }
      }

      console.log(`Payment status updated: ${payment._id} -> ${args.status}`)
      return payment._id
    } catch (error) {
      console.error("Error updating payment status:", error)
      throw error
    }
  },
})

// Get payments for user
export const getUserPayments = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100)

    try {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(limit)

      // Get goal details for each payment
      const paymentsWithGoals = await Promise.all(
        payments.map(async (payment) => {
          const goal = await ctx.db.get(payment.goalId)
          return {
            ...payment,
            goal: goal
              ? {
                  title: goal.title,
                  deadline: goal.deadline,
                  status: goal.status,
                }
              : null,
          }
        }),
      )

      return paymentsWithGoals
    } catch (error) {
      console.error("Error fetching user payments:", error)
      throw new Error("Failed to fetch user payments")
    }
  },
})

// Get payment by Stripe payment intent ID
export const getPaymentByStripeId = query({
  args: { stripePaymentIntentId: v.string() },
  handler: async (ctx, args) => {
    if (!args.stripePaymentIntentId || args.stripePaymentIntentId.trim().length === 0) {
      throw new Error("Stripe payment intent ID is required")
    }

    try {
      return await ctx.db
        .query("payments")
        .withIndex("by_stripe_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
        .unique()
    } catch (error) {
      console.error("Error fetching payment by Stripe ID:", error)
      throw new Error("Failed to fetch payment")
    }
  },
})

// Get payment statistics
export const getPaymentStatistics = query({
  handler: async (ctx) => {
    try {
      const allPayments = await ctx.db.query("payments").collect()

      const totalPayments = allPayments.length
      const succeededPayments = allPayments.filter((p) => p.status === "succeeded")
      const failedPayments = allPayments.filter((p) => p.status === "failed")
      const pendingPayments = allPayments.filter((p) => p.status === "pending")

      const totalProcessed = succeededPayments.reduce((sum, p) => sum + p.amount, 0)
      const totalFailed = failedPayments.reduce((sum, p) => sum + p.amount, 0)
      const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0)

      return {
        totalPayments,
        succeededCount: succeededPayments.length,
        failedCount: failedPayments.length,
        pendingCount: pendingPayments.length,
        totalProcessed,
        totalFailed,
        totalPending,
        successRate: totalPayments > 0 ? Math.round((succeededPayments.length / totalPayments) * 100) : 0,
      }
    } catch (error) {
      console.error("Error fetching payment statistics:", error)
      throw new Error("Failed to fetch payment statistics")
    }
  },
})

// Get payments by goal
export const getPaymentsByGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("payments")
        .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
        .order("desc")
        .collect()
    } catch (error) {
      console.error("Error fetching payments by goal:", error)
      throw new Error("Failed to fetch payments for goal")
    }
  },
})
