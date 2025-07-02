import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    // Clerk user ID
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    // Stripe customer ID for payments
    stripeCustomerId: v.optional(v.string()),
    // User preferences
    emailNotifications: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
    // Statistics
    totalGoalsCreated: v.optional(v.number()),
    totalGoalsCompleted: v.optional(v.number()),
    totalMoneyPledged: v.optional(v.number()),
    totalMoneySaved: v.optional(v.number()),
    totalMoneyLost: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  goals: defineTable({
    // Goal details
    title: v.string(),
    description: v.string(),
    deadline: v.number(), // Unix timestamp
    pledgeAmount: v.number(),

    // Status
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),

    // Payment information
    paymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    paymentMethodId: v.optional(v.string()),
    paymentProcessed: v.boolean(),
    paymentProcessedAt: v.optional(v.number()),

    // User reference
    userId: v.id("users"),

    // Metadata
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),

    // Tracking
    remindersSent: v.optional(v.number()),
    lastReminderSent: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_deadline", ["deadline"])
    .index("by_user_status", ["userId", "status"])
    .index("by_public", ["isPublic"])
    .index("by_category", ["category"])
    .index("by_stripe_session", ["stripeSessionId"]),

  goalUpdates: defineTable({
    goalId: v.id("goals"),
    userId: v.id("users"),
    type: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("reminder_sent"),
      v.literal("payment_processed"),
    ),
    message: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_goal", ["goalId"])
    .index("by_user", ["userId"])
    .index("by_type", ["type"]),

  payments: defineTable({
    goalId: v.id("goals"),
    userId: v.id("users"),
    stripePaymentIntentId: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("succeeded"), v.literal("failed"), v.literal("cancelled")),
    processedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_goal", ["goalId"])
    .index("by_user", ["userId"])
    .index("by_stripe_payment_intent", ["stripePaymentIntentId"])
    .index("by_status", ["status"]),

  notifications: defineTable({
    userId: v.id("users"),
    goalId: v.optional(v.id("goals")),
    type: v.union(
      v.literal("goal_reminder"),
      v.literal("goal_deadline_approaching"),
      v.literal("goal_completed"),
      v.literal("goal_failed"),
      v.literal("payment_processed"),
      v.literal("payment_failed"),
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    sentAt: v.optional(v.number()),
    emailSent: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_goal", ["goalId"])
    .index("by_type", ["type"]),

  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  }).index("by_name", ["name"]),
})
