import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create a new goal
export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    deadline: v.number(),
    pledgeAmount: v.number(),
    userId: v.id("users"),
    paymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate input
    if (args.title.trim().length === 0) {
      throw new Error("Goal title cannot be empty")
    }

    if (args.description.trim().length === 0) {
      throw new Error("Goal description cannot be empty")
    }

    if (args.pledgeAmount <= 0) {
      throw new Error("Pledge amount must be greater than 0")
    }

    // Allow same-day goals (deadline can be today)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    
    if (args.deadline < today.getTime()) {
      throw new Error("Deadline cannot be in the past")
    }

    // Verify user exists
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error("User not found")
    }

    try {
      const goalId = await ctx.db.insert("goals", {
        title: args.title.trim(),
        description: args.description.trim(),
        deadline: args.deadline,
        pledgeAmount: args.pledgeAmount,
        status: "active",
        completed: false,
        paymentIntentId: args.paymentIntentId,
        stripeSessionId: args.stripeSessionId,
        paymentProcessed: false,
        userId: args.userId,
        category: args.category,
        tags: args.tags || [],
        isPublic: args.isPublic ?? true,
        remindersSent: 0,
      })

      // Create goal update log
      await ctx.db.insert("goalUpdates", {
        goalId,
        userId: args.userId,
        type: "created",
        message: `Goal "${args.title}" created with $${args.pledgeAmount} pledge`,
      })

      // Update user statistics
      await ctx.db.patch(args.userId, {
        totalGoalsCreated: (user.totalGoalsCreated || 0) + 1,
        totalMoneyPledged: (user.totalMoneyPledged || 0) + args.pledgeAmount,
      })

      console.log(`Goal created: ${goalId} by user ${args.userId}`)
      return goalId
    } catch (error) {
      console.error("Error creating goal:", error)
      throw new Error("Failed to create goal")
    }
  },
})

// Get all public goals (for feed)
export const getPublicGoals = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100) // Cap at 100 items

    try {
      let query = ctx.db
        .query("goals")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .order("desc")

      if (args.cursor) {
        const cursorTime = Number.parseInt(args.cursor)
        if (!isNaN(cursorTime)) {
          query = query.filter((q) => q.lt(q.field("_creationTime"), cursorTime))
        }
      }

      let goals = await query.take(limit + 1)

      // Filter by category if specified
      if (args.category) {
        goals = goals.filter((goal) => goal.category === args.category)
      }

      const hasMore = goals.length > limit
      const items = hasMore ? goals.slice(0, -1) : goals

      // Get user data for each goal
      const goalsWithUsers = await Promise.all(
        items.map(async (goal) => {
          const user = await ctx.db.get(goal.userId)
          return {
            ...goal,
            user: user
              ? {
                  name: user.name,
                  imageUrl: user.imageUrl,
                  clerkId: user.clerkId,
                }
              : null,
          }
        }),
      )

      return {
        goals: goalsWithUsers,
        hasMore,
        nextCursor: hasMore ? items[items.length - 1]._creationTime.toString() : null,
      }
    } catch (error) {
      console.error("Error fetching public goals:", error)
      throw new Error("Failed to fetch goals")
    }
  },
})

// Get user's goals
export const getUserGoals = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(v.literal("active"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100) // Cap at 100 items

    try {
      let query = ctx.db.query("goals").withIndex("by_user", (q) => q.eq("userId", args.userId))

      if (args.status) {
        query = query.filter((q) => q.eq(q.field("status"), args.status))
      }

      const goals = await query.order("desc").take(limit)

      console.log(`Retrieved ${goals.length} goals for user ${args.userId}`)
      return goals
    } catch (error) {
      console.error("Error fetching user goals:", error)
      throw new Error("Failed to fetch user goals")
    }
  },
})

// Get goal by ID
export const getGoalById = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    try {
      const goal = await ctx.db.get(args.goalId)
      if (!goal) return null

      const user = await ctx.db.get(goal.userId)
      return {
        ...goal,
        user: user
          ? {
              name: user.name,
              imageUrl: user.imageUrl,
              clerkId: user.clerkId,
            }
          : null,
      }
    } catch (error) {
      console.error("Error fetching goal by ID:", error)
      throw new Error("Failed to fetch goal")
    }
  },
})

// Complete a goal
export const completeGoal = mutation({
  args: {
    goalId: v.id("goals"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      const goal = await ctx.db.get(args.goalId)
      if (!goal) {
        throw new Error("Goal not found")
      }

      if (goal.userId !== args.userId) {
        throw new Error("Unauthorized: You can only complete your own goals")
      }

      if (goal.completed || goal.status !== "active") {
        throw new Error("Goal is already completed or not active")
      }

      if (Date.now() > goal.deadline) {
        throw new Error("Cannot complete goal after deadline has passed")
      }

      const now = Date.now()
      await ctx.db.patch(args.goalId, {
        status: "completed",
        completed: true,
        completedAt: now,
      })

      // Create goal update log
      await ctx.db.insert("goalUpdates", {
        goalId: args.goalId,
        userId: args.userId,
        type: "completed",
        message: `Goal "${goal.title}" completed successfully`,
      })

      // Update user statistics
      const user = await ctx.db.get(args.userId)
      if (user) {
        await ctx.db.patch(args.userId, {
          totalGoalsCompleted: (user.totalGoalsCompleted || 0) + 1,
          totalMoneySaved: (user.totalMoneySaved || 0) + goal.pledgeAmount,
        })
      }

      // Create notification
      await ctx.db.insert("notifications", {
        userId: args.userId,
        goalId: args.goalId,
        type: "goal_completed",
        title: "Goal Completed! 🎉",
        message: `Congratulations! You completed "${goal.title}" and saved $${goal.pledgeAmount}`,
        read: false,
      })

      console.log(`Goal completed: ${args.goalId} by user ${args.userId}`)
      return args.goalId
    } catch (error) {
      console.error("Error completing goal:", error)
      throw error
    }
  },
})

// Cancel a goal (only if not started and within 24 hours of creation)
export const cancelGoal = mutation({
  args: {
    goalId: v.id("goals"),
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const goal = await ctx.db.get(args.goalId)
      if (!goal) {
        throw new Error("Goal not found")
      }

      if (goal.userId !== args.userId) {
        throw new Error("Unauthorized: You can only cancel your own goals")
      }

      if (goal.status !== "active") {
        throw new Error("Can only cancel active goals")
      }

      // Allow cancellation within 24 hours of creation
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
      if (goal._creationTime < twentyFourHoursAgo) {
        throw new Error("Goals can only be cancelled within 24 hours of creation")
      }

      await ctx.db.patch(args.goalId, {
        status: "cancelled",
      })

      // Create goal update log
      await ctx.db.insert("goalUpdates", {
        goalId: args.goalId,
        userId: args.userId,
        type: "cancelled",
        message: `Goal "${goal.title}" cancelled${args.reason ? `: ${args.reason}` : ""}`,
      })

      // Update user statistics (subtract from pledged amount)
      const user = await ctx.db.get(args.userId)
      if (user) {
        await ctx.db.patch(args.userId, {
          totalGoalsCreated: Math.max((user.totalGoalsCreated || 1) - 1, 0),
          totalMoneyPledged: Math.max((user.totalMoneyPledged || goal.pledgeAmount) - goal.pledgeAmount, 0),
        })
      }

      console.log(`Goal cancelled: ${args.goalId} by user ${args.userId}`)
      return args.goalId
    } catch (error) {
      console.error("Error cancelling goal:", error)
      throw error
    }
  },
})

// Get expired goals that need payment processing
export const getExpiredGoals = query({
  handler: async (ctx) => {
    const now = Date.now()

    try {
      return await ctx.db
        .query("goals")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .filter((q) =>
          q.and(
            q.lt(q.field("deadline"), now),
            q.eq(q.field("completed"), false),
            q.eq(q.field("paymentProcessed"), false),
          ),
        )
        .collect()
    } catch (error) {
      console.error("Error fetching expired goals:", error)
      throw new Error("Failed to fetch expired goals")
    }
  },
})

// Update goal payment status
export const updateGoalPaymentStatus = mutation({
  args: {
    goalId: v.id("goals"),
    paymentProcessed: v.boolean(),
    paymentProcessedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.goalId, {
        paymentProcessed: args.paymentProcessed,
        paymentProcessedAt: args.paymentProcessedAt || Date.now(),
      })

      if (args.paymentProcessed) {
        const goal = await ctx.db.get(args.goalId)
        if (goal) {
          // Update user statistics
          const user = await ctx.db.get(goal.userId)
          if (user) {
            await ctx.db.patch(goal.userId, {
              totalMoneyLost: (user.totalMoneyLost || 0) + goal.pledgeAmount,
            })
          }

          // Create notification
          await ctx.db.insert("notifications", {
            userId: goal.userId,
            goalId: args.goalId,
            type: "payment_processed",
            title: "Payment Processed",
            message: `Payment of $${goal.pledgeAmount} has been processed for the missed goal "${goal.title}"`,
            read: false,
          })

          console.log(`Payment processed for goal: ${args.goalId}`)
        }
      }
    } catch (error) {
      console.error("Error updating goal payment status:", error)
      throw new Error("Failed to update payment status")
    }
  },
})

// Get goals by category
export const getGoalsByCategory = query({
  args: {
    category: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100)

    try {
      const goals = await ctx.db
        .query("goals")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .filter((q) => q.eq(q.field("isPublic"), true))
        .order("desc")
        .take(limit)

      // Get user data for each goal
      const goalsWithUsers = await Promise.all(
        goals.map(async (goal) => {
          const user = await ctx.db.get(goal.userId)
          return {
            ...goal,
            user: user
              ? {
                  name: user.name,
                  imageUrl: user.imageUrl,
                }
              : null,
          }
        }),
      )

      return goalsWithUsers
    } catch (error) {
      console.error("Error fetching goals by category:", error)
      throw new Error("Failed to fetch goals by category")
    }
  },
})

// Get goal statistics
export const getGoalStatistics = query({
  handler: async (ctx) => {
    try {
      const allGoals = await ctx.db.query("goals").collect()

      const totalGoals = allGoals.length
      const activeGoals = allGoals.filter((goal) => goal.status === "active").length
      const completedGoals = allGoals.filter((goal) => goal.status === "completed").length
      const failedGoals = allGoals.filter((goal) => goal.status === "failed").length
      const totalPledged = allGoals.reduce((sum, goal) => sum + goal.pledgeAmount, 0)
      const totalSaved = allGoals.filter((goal) => goal.completed).reduce((sum, goal) => sum + goal.pledgeAmount, 0)
      const totalLost = allGoals
        .filter((goal) => goal.status === "failed" && goal.paymentProcessed)
        .reduce((sum, goal) => sum + goal.pledgeAmount, 0)

      return {
        totalGoals,
        activeGoals,
        completedGoals,
        failedGoals,
        totalPledged,
        totalSaved,
        totalLost,
        completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      }
    } catch (error) {
      console.error("Error fetching goal statistics:", error)
      throw new Error("Failed to fetch goal statistics")
    }
  },
})

// Save payment method ID to goal
export const savePaymentMethodId = mutation({
  args: {
    goalId: v.id("goals"),
    paymentMethodId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.goalId, {
        paymentMethodId: args.paymentMethodId,
      })
      console.log(`Payment method ID saved for goal: ${args.goalId}`)
    } catch (error) {
      console.error("Error saving payment method ID:", error)
      throw new Error("Failed to save payment method ID")
    }
  },
})

// Get goal by Stripe session ID
export const getGoalBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    try {
      const goal = await ctx.db
        .query("goals")
        .filter((q) => q.eq(q.field("stripeSessionId"), args.sessionId))
        .unique()
      
      return goal
    } catch (error) {
      console.error("Error fetching goal by session ID:", error)
      return null
    }
  },
})
