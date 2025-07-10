import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create a new goal
export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    deadline: v.number(),
    pledgeAmount: v.number(),
    userId: v.id("users"),
    paymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate input
    if (args.title.trim().length === 0) {
      throw new Error("Goal title cannot be empty")
    }

    if (typeof args.description === 'string' && args.description.trim().length === 0) {
      // If description is provided but empty, treat as no description
      args.description = undefined;
    }

    if (args.pledgeAmount < 0.5) {
      throw new Error("Pledge amount must be at least $0.50")
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
      // First, check if a goal with this stripeSessionId already exists
      if (args.stripeSessionId) {
        const existingGoalBySession = await ctx.db
          .query("goals")
          .withIndex("by_stripe_session", (q) => q.eq("stripeSessionId", args.stripeSessionId))
          .unique()

        if (existingGoalBySession) {
          console.log(`Goal already exists for session ${args.stripeSessionId}: ${existingGoalBySession._id}`)
          return existingGoalBySession._id
        }
      }

      // Deduplication: check for existing active goal with same userId, title, and deadline
      const existingGoal = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("title"), args.title.trim()),
            q.eq(q.field("deadline"), args.deadline),
            q.eq(q.field("status"), "active")
          )
        )
        .unique()

      if (existingGoal) {
        console.log(`Duplicate goal detected for user ${args.userId}: ${existingGoal._id}`)
        return existingGoal._id
      }

      // Allowed statuses for a goal
      const allowedStatuses = ["pending", "active", "completed", "failed", "cancelled"] as const;
      type Status = typeof allowedStatuses[number];
      const status: Status = allowedStatuses.includes(args.status as Status)
        ? (args.status as Status)
        : "active";

      const goalId = await ctx.db.insert("goals", {
        title: args.title.trim(),
        description: typeof args.description === 'string' ? args.description.trim() : undefined,
        deadline: args.deadline,
        pledgeAmount: args.pledgeAmount,
        status: status,
        completed: false,
        paymentIntentId: args.paymentIntentId,
        stripeSessionId: args.stripeSessionId,
        paymentProcessed: false,
        userId: args.userId,
        category: args.category,
        tags: args.tags || [],
        isPublic: args.isPublic ?? true,
        remindersSent: 0,
        paymentSetupComplete: false,
      })

      // Create goal update log
      await ctx.db.insert("goalUpdates", {
        goalId,
        userId: args.userId,
        type: "created",
        message: `Goal "${args.title}" created with $${args.pledgeAmount} pledge`,
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
        .filter((q) => q.eq(q.field("paymentSetupComplete"), true))
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
                  username: user.username,
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

      // Get user data for each goal
      const goalsWithUsers = await Promise.all(
        goals.map(async (goal) => {
          const user = await ctx.db.get(goal.userId)
          return {
            ...goal,
            user: user
              ? {
                  name: user.name,
                  username: user.username,
                  imageUrl: user.imageUrl,
                  clerkId: user.clerkId,
                }
              : null,
          }
        }),
      )

      console.log(`Retrieved ${goalsWithUsers.length} goals for user ${args.userId}`)
      return goalsWithUsers
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
              username: user.username,
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
        // Remove automatic status change to prevent race conditions
        // Status should be managed by the calling code
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
        .withIndex("by_stripe_session", (q) => q.eq("stripeSessionId", args.sessionId))
        .unique()
      
      return goal
    } catch (error) {
      console.error("Error fetching goal by session ID:", error)
      return null
    }
  },
})

// Get duplicate goals for a user (for debugging and cleanup)
export const getDuplicateGoals = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      const userGoals = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()
      
      // Group goals by title and deadline to find duplicates
      const goalGroups = new Map<string, any[]>()
      
      userGoals.forEach(goal => {
        const key = `${goal.title.trim()}-${goal.deadline}`
        if (!goalGroups.has(key)) {
          goalGroups.set(key, [])
        }
        goalGroups.get(key)!.push(goal)
      })
      
      // Return only groups with more than one goal
      const duplicates = Array.from(goalGroups.entries())
        .filter(([_, goals]) => goals.length > 1)
        .map(([key, goals]) => ({
          key,
          goals: goals.sort((a, b) => a._creationTime - b._creationTime) // Sort by creation time
        }))
      
      return duplicates
    } catch (error) {
      console.error("Error fetching duplicate goals:", error)
      return []
    }
  },
})

// Clean up duplicate goals for a user
export const cleanupDuplicateGoals = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      const userGoals = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()
      
      // Group goals by title and deadline to find duplicates
      const goalGroups = new Map<string, any[]>()
      
      userGoals.forEach(goal => {
        const key = `${goal.title.trim()}-${goal.deadline}`
        if (!goalGroups.has(key)) {
          goalGroups.set(key, [])
        }
        goalGroups.get(key)!.push(goal)
      })
      
      let deletedCount = 0
      
      // Process each group of duplicates
      for (const [key, goals] of goalGroups.entries()) {
        if (goals.length > 1) {
          // Sort by creation time and completeness
          const sortedGoals = goals.sort((a, b) => {
            // Prefer goals with stripeSessionId
            const aHasSession = a.stripeSessionId ? 1 : 0
            const bHasSession = b.stripeSessionId ? 1 : 0
            if (aHasSession !== bHasSession) {
              return bHasSession - aHasSession
            }
            
            // Prefer active status over pending
            const aStatus = a.status === 'active' ? 1 : 0
            const bStatus = b.status === 'active' ? 1 : 0
            if (aStatus !== bStatus) {
              return bStatus - aStatus
            }
            
            // Prefer goals with paymentSetupComplete
            const aComplete = a.paymentSetupComplete ? 1 : 0
            const bComplete = b.paymentSetupComplete ? 1 : 0
            if (aComplete !== bComplete) {
              return bComplete - aComplete
            }
            
            // Finally, prefer newer goals
            return b._creationTime - a._creationTime
          })
          
          // Keep the first (best) goal, delete the rest
          const [keepGoal, ...deleteGoals] = sortedGoals
          
          for (const deleteGoal of deleteGoals) {
            await ctx.db.delete(deleteGoal._id)
            deletedCount++
            console.log(`Deleted duplicate goal: ${deleteGoal._id}`)
          }
        }
      }
      
      console.log(`Cleaned up ${deletedCount} duplicate goals for user ${args.userId}`)
      return deletedCount
    } catch (error) {
      console.error("Error cleaning up duplicate goals:", error)
      throw new Error("Failed to clean up duplicate goals")
    }
  },
})

// Update goal status
export const updateGoalStatus = mutation({
  args: {
    goalId: v.id("goals"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const goal = await ctx.db.get(args.goalId)
      if (!goal) {
        throw new Error("Goal not found")
      }

      const allowedStatuses = ["pending", "active", "completed", "failed", "cancelled"] as const;
      type Status = typeof allowedStatuses[number];
      const status: Status = allowedStatuses.includes(args.status as Status)
        ? (args.status as Status)
        : "active";

      await ctx.db.patch(args.goalId, {
        status: status,
      })

      // Create goal update log
      await ctx.db.insert("goalUpdates", {
        goalId: args.goalId,
        userId: goal.userId,
        type: status === "completed" ? "completed" : status === "failed" ? "failed" : "updated",
        message: args.reason || `Goal status updated to ${status}`,
      })

      console.log(`Goal status updated: ${args.goalId} -> ${status}`)
      return args.goalId
    } catch (error) {
      console.error("Error updating goal status:", error)
      throw error
    }
  },
})

// Update goal payment status (alias for updateGoalPaymentStatus)
export const updatePaymentStatus = mutation({
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

// Add upvote to a goal
export const upvoteGoal = mutation({
  args: {
    goalId: v.id("goals"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate upvotes
    const existing = await ctx.db
      .query("goalUpvotes")
      .withIndex("by_goal_user", (q) => q.eq("goalId", args.goalId).eq("userId", args.userId))
      .unique()
    if (existing) return existing._id
    return await ctx.db.insert("goalUpvotes", {
      goalId: args.goalId,
      userId: args.userId,
      createdAt: Date.now(),
    })
  },
})

// Remove upvote from a goal
export const unupvoteGoal = mutation({
  args: {
    goalId: v.id("goals"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("goalUpvotes")
      .withIndex("by_goal_user", (q) => q.eq("goalId", args.goalId).eq("userId", args.userId))
      .unique()
    if (existing) {
      await ctx.db.delete(existing._id)
      return true
    }
    return false
  },
})

// Get upvote count for a goal
export const getGoalUpvoteCount = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const upvotes = await ctx.db
      .query("goalUpvotes")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect()
    return upvotes.length
  },
})

// Get all goalIds upvoted by a user
export const getUserUpvotedGoalIds = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const upvotes = await ctx.db
      .query("goalUpvotes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()
    return upvotes.map((u) => u.goalId)
  },
})

// Get upvote counts for multiple goals
export const getGoalUpvoteCounts = query({
  args: { goalIds: v.array(v.id("goals")) },
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {}
    for (const goalId of args.goalIds) {
      const upvotes = await ctx.db
        .query("goalUpvotes")
        .withIndex("by_goal", (q) => q.eq("goalId", goalId))
        .collect()
      counts[goalId] = upvotes.length
    }
    return counts
  },
})

// Mark payment setup as complete for a goal
export const updatePaymentSetupComplete = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.goalId, { paymentSetupComplete: true })
      console.log(`Payment setup marked complete for goal: ${args.goalId}`)
      return true
    } catch (error) {
      console.error("Error updating paymentSetupComplete:", error)
      throw new Error("Failed to update payment setup status")
    }
  },
})

// Get goal completion data for calendar graph
export const getGoalCompletionData = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Get the user to find their account creation date
      const user = await ctx.db.get(args.userId)
      if (!user) {
        throw new Error("User not found")
      }

      // Use the user's account creation date as the start date
      const startDate = new Date(user._creationTime)
      const startTimestamp = startDate.getTime()

      // Get all completed goals for the user since account creation
      const completedGoals = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("completed"), true),
            q.gte(q.field("completedAt"), startTimestamp)
          )
        )
        .collect()

      // Group goals by completion date
      const completionMap = new Map<string, number>()
      
      completedGoals.forEach(goal => {
        if (goal.completedAt) {
          const date = new Date(goal.completedAt)
          const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD format
          completionMap.set(dateString, (completionMap.get(dateString) || 0) + 1)
        }
      })

      // Convert to array format expected by the calendar component
      const result = Array.from(completionMap.entries()).map(([date, count]) => ({
        date,
        count
      }))

      return {
        data: result,
        startDate: startDate.toISOString().split('T')[0] // YYYY-MM-DD format
      }
    } catch (error) {
      console.error("Error fetching goal completion data:", error)
      throw new Error("Failed to fetch goal completion data")
    }
  },
})

// Get pending goal by user, title, and deadline
export const getPendingGoalByUser = query({
  args: {
    userId: v.id("users"),
    title: v.string(),
    deadline: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // First try to find a pending goal with exact match
      let goal = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("title"), args.title.trim()),
            q.eq(q.field("deadline"), args.deadline),
            q.eq(q.field("status"), "pending")
          )
        )
        .unique()
      
      // If not found, try to find any goal by this user with the same title and deadline
      // (in case the status was already changed)
      if (!goal) {
        goal = await ctx.db
          .query("goals")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("title"), args.title.trim()),
              q.eq(q.field("deadline"), args.deadline)
            )
          )
          .unique()
      }
      
      return goal
    } catch (error) {
      console.error("Error fetching pending goal:", error)
      return null
    }
  },
})

// Update goal with session ID
export const updateGoalWithSession = mutation({
  args: {
    goalId: v.id("goals"),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.goalId, {
        stripeSessionId: args.stripeSessionId,
      })
      console.log(`Goal updated with session ID: ${args.goalId} -> ${args.stripeSessionId}`)
      return args.goalId
    } catch (error) {
      console.error("Error updating goal with session ID:", error)
      throw error
    }
  },
})
