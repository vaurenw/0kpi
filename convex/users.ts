import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Generate a unique username from a name
async function generateUniqueUsername(ctx: any, baseName: string): Promise<string> {
  // Convert name to username format: lowercase, replace spaces/special chars with underscores
  let username = baseName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_') // Replace any non-alphanumeric chars (except underscore) with underscore
    .replace(/_+/g, '_') // Replace multiple consecutive underscores with single underscore
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores

  // If username is empty after cleaning, use 'user'
  if (!username) {
    username = 'user'
  }

  // Check if username exists and add numbers if needed
  let finalUsername = username
  let counter = 1

  while (true) {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", finalUsername))
      .unique()

    if (!existingUser) {
      break // Username is available
    }

    // Username taken, add number
    finalUsername = `${username}${counter}`
    counter++

    // Prevent infinite loop (shouldn't happen in practice)
    if (counter > 1000) {
      finalUsername = `${username}_${Date.now()}`
      break
    }
  }

  return finalUsername
}

// Create or update user from Clerk
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.clerkId || args.clerkId.trim().length === 0) {
      throw new Error("Clerk ID is required")
    }

    if (!args.email || args.email.trim().length === 0) {
      throw new Error("Email is required")
    }

    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required")
    }

    try {
      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .unique()

      if (existingUser) {
        // Update existing user (preserve custom display name and username)
        const updates: any = {
          email: args.email.trim(),
          imageUrl: args.imageUrl,
        }
        
        // Only update name if it's the default Clerk name and user hasn't set a custom one
        // This prevents overwriting custom display names
        if (!existingUser.name || existingUser.name === args.name.trim()) {
          updates.name = args.name.trim()
        }
        
        // Generate username if user doesn't have one
        if (!existingUser.username) {
          updates.username = await generateUniqueUsername(ctx, args.name.trim())
        }
        
        await ctx.db.patch(existingUser._id, updates)
        console.log(`Updated existing user: ${existingUser._id}`)
        return existingUser._id
      } else {
        // Generate unique username for new user
        const username = await generateUniqueUsername(ctx, args.name.trim())

        // Create new user with display name and username
        const userId = await ctx.db.insert("users", {
          clerkId: args.clerkId.trim(),
          email: args.email.trim(),
          name: args.name.trim(),
          username: username,
          imageUrl: args.imageUrl,
          emailNotifications: true,
          totalGoalsCreated: 0,
          totalGoalsCompleted: 0,
          totalMoneyPledged: 0,
          totalMoneySaved: 0,
          totalMoneyLost: 0,
        })
        console.log(`Created new user: ${userId} with username: ${username}`)
        return userId
      }
    } catch (error) {
      console.error("Error creating/updating user:", error)
      throw new Error("Failed to create or update user")
    }
  },
})

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkId || args.clerkId.trim().length === 0) {
      throw new Error("Clerk ID is required")
    }

    try {
      return await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .unique()
    } catch (error) {
      console.error("Error fetching user by Clerk ID:", error)
      throw new Error("Failed to fetch user")
    }
  },
})

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      return await ctx.db.get(args.userId)
    } catch (error) {
      console.error("Error fetching user by ID:", error)
      throw new Error("Failed to fetch user")
    }
  },
})

// Update user statistics (called by system)
export const updateUserStats = mutation({
  args: {
    userId: v.id("users"),
    totalGoalsCreated: v.optional(v.number()),
    totalGoalsCompleted: v.optional(v.number()),
    totalMoneyPledged: v.optional(v.number()),
    totalMoneySaved: v.optional(v.number()),
    totalMoneyLost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args

    // Validate that all numbers are non-negative
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "number" && value < 0) {
        throw new Error(`${key} cannot be negative`)
      }
    }

    try {
      await ctx.db.patch(userId, updates)
      console.log(`Updated statistics for user: ${userId}`)
    } catch (error) {
      console.error("Error updating user statistics:", error)
      throw new Error("Failed to update user statistics")
    }
  },
})

// Update user Stripe customer ID
export const updateStripeCustomerId = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.stripeCustomerId || args.stripeCustomerId.trim().length === 0) {
      throw new Error("Stripe customer ID is required")
    }

    try {
      await ctx.db.patch(args.userId, {
        stripeCustomerId: args.stripeCustomerId.trim(),
      })
      console.log(`Updated Stripe customer ID for user: ${args.userId}`)
    } catch (error) {
      console.error("Error updating Stripe customer ID:", error)
      throw new Error("Failed to update Stripe customer ID")
    }
  },
})

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    userId: v.id("users"),
    emailNotifications: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args

    try {
      await ctx.db.patch(userId, updates)
      console.log(`Updated preferences for user: ${userId}`)
    } catch (error) {
      console.error("Error updating user preferences:", error)
      throw new Error("Failed to update user preferences")
    }
  },
})

// Get user profile with statistics
export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId)
      if (!user) return null

      // Get user's goals for additional statistics
      const userGoals = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()

      const now = Date.now()
      const activeGoals = userGoals.filter((goal) => goal.status === "active" && goal.deadline > now)
      const completedGoals = userGoals.filter((goal) => goal.completed)
      const failedGoals = userGoals.filter((goal) => goal.status === "failed")
      const expiredGoals = userGoals.filter((goal) => goal.status === "active" && goal.deadline <= now)

      return {
        ...user,
        statistics: {
          totalGoals: userGoals.length,
          activeGoals: activeGoals.length,
          completedGoals: completedGoals.length,
          failedGoals: failedGoals.length,
          expiredGoals: expiredGoals.length,
          completionRate: userGoals.length > 0 ? Math.round((completedGoals.length / userGoals.length) * 100) : 0,
        },
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      throw new Error("Failed to fetch user profile")
    }
  },
})

// Delete user account (GDPR compliance)
export const deleteUserAccount = mutation({
  args: {
    userId: v.id("users"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify user ownership
      const user = await ctx.db.get(args.userId)
      if (!user || user.clerkId !== args.clerkId) {
        throw new Error("Unauthorized: User verification failed")
      }

      // Check for active goals
      const activeGoals = await ctx.db
        .query("goals")
        .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "active"))
        .collect()

      if (activeGoals.length > 0) {
        throw new Error("Cannot delete account with active goals. Please complete or cancel all active goals first.")
      }

      // Delete user's data
      const userGoals = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()

      const userNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()

      const userPayments = await ctx.db
        .query("payments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()

      const userGoalUpdates = await ctx.db
        .query("goalUpdates")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()

      // Delete all related data
      await Promise.all([
        ...userGoals.map((goal) => ctx.db.delete(goal._id)),
        ...userNotifications.map((notification) => ctx.db.delete(notification._id)),
        ...userPayments.map((payment) => ctx.db.delete(payment._id)),
        ...userGoalUpdates.map((update) => ctx.db.delete(update._id)),
      ])

      // Finally delete the user
      await ctx.db.delete(args.userId)

      console.log(`Deleted user account: ${args.userId}`)
      return { success: true }
    } catch (error) {
      console.error("Error deleting user account:", error)
      throw error
    }
  },
})

// Check if username is available
export const checkUsernameAvailability = query({
  args: { 
    username: v.string(),
    currentUserId: v.optional(v.id("users"))
  },
  handler: async (ctx, args) => {
    // Early return if username is empty or invalid
    if (!args.username || typeof args.username !== 'string' || args.username.trim().length === 0) {
      return { available: false, error: "Username is required" }
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]+$/
    const cleanUsername = args.username.trim().toLowerCase()
    if (!usernameRegex.test(cleanUsername)) {
      return { available: false, error: "Username can only contain lowercase letters, numbers, and underscores" }
    }

    if (cleanUsername.length < 3) {
      return { available: false, error: "Username must be at least 3 characters long" }
    }

    if (cleanUsername.length > 20) {
      return { available: false, error: "Username must be 20 characters or less" }
    }

    try {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", cleanUsername))
        .unique()

      // If it's the user's own username, it's available
      if (existingUser && args.currentUserId && existingUser._id === args.currentUserId) {
        return { available: true }
      }

      return { available: !existingUser }
    } catch (error) {
      console.error("Error checking username availability:", error)
      return { available: false, error: "Failed to check username availability" }
    }
  },
})

// Update username
export const updateUsername = mutation({
  args: {
    userId: v.id("users"),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.username || args.username.trim().length === 0) {
      throw new Error("Username is required")
    }

    const cleanUsername = args.username.trim().toLowerCase()

    // Validate username format
    const usernameRegex = /^[a-z0-9_]+$/
    if (!usernameRegex.test(cleanUsername)) {
      throw new Error("Username can only contain lowercase letters, numbers, and underscores")
    }

    if (cleanUsername.length < 3) {
      throw new Error("Username must be at least 3 characters long")
    }

    if (cleanUsername.length > 20) {
      throw new Error("Username must be 20 characters or less")
    }

    try {
      // Check if username is already taken by another user
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", cleanUsername))
        .unique()

      if (existingUser && existingUser._id !== args.userId) {
        throw new Error("Username is already taken")
      }

      // Update the username
      await ctx.db.patch(args.userId, { username: cleanUsername })
      console.log(`Updated username for user: ${args.userId} to: ${cleanUsername}`)
      return true
    } catch (error) {
      console.error("Error updating username:", error)
      throw error
    }
  },
})

// Migration: Add usernames to existing users
export const migrateExistingUsersToUsernames = mutation({
  handler: async (ctx) => {
    try {
      // Get all users without usernames
      const usersWithoutUsernames = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("username"), undefined))
        .collect()

      console.log(`Found ${usersWithoutUsernames.length} users without usernames`)

      // Generate usernames for each user
      for (const user of usersWithoutUsernames) {
        const username = await generateUniqueUsername(ctx, user.name)
        await ctx.db.patch(user._id, { username })
        console.log(`Added username "${username}" to user ${user._id}`)
      }

      return { success: true, usersUpdated: usersWithoutUsernames.length }
    } catch (error) {
      console.error("Error migrating users to usernames:", error)
      throw new Error("Failed to migrate users to usernames")
    }
  },
})
