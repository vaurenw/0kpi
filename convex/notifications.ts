import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Get user notifications
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100)

    try {
      let query = ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", args.userId))

      if (args.unreadOnly) {
        query = query.filter((q) => q.eq(q.field("read"), false))
      }

      return await query.order("desc").take(limit)
    } catch (error) {
      console.error("Error fetching user notifications:", error)
      throw new Error("Failed to fetch notifications")
    }
  },
})

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      const notification = await ctx.db.get(args.notificationId)
      if (!notification) {
        throw new Error("Notification not found")
      }

      if (notification.userId !== args.userId) {
        throw new Error("Unauthorized: You can only mark your own notifications as read")
      }

      if (notification.read) {
        return args.notificationId // Already read, no need to update
      }

      await ctx.db.patch(args.notificationId, { read: true })
      console.log(`Notification marked as read: ${args.notificationId}`)
      return args.notificationId
    } catch (error) {
      console.error("Error marking notification as read:", error)
      throw error
    }
  },
})

// Mark all notifications as read
export const markAllNotificationsAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) => q.eq("userId", args.userId).eq("read", false))
        .collect()

      const updatePromises = notifications.map((notification) => ctx.db.patch(notification._id, { read: true }))

      await Promise.all(updatePromises)

      console.log(`Marked ${notifications.length} notifications as read for user: ${args.userId}`)
      return notifications.length
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      throw new Error("Failed to mark all notifications as read")
    }
  },
})

// Create notification
export const createNotification = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.title || args.title.trim().length === 0) {
      throw new Error("Notification title is required")
    }

    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Notification message is required")
    }

    try {
      // Verify user exists
      const user = await ctx.db.get(args.userId)
      if (!user) {
        throw new Error("User not found")
      }

      // Verify goal exists if goalId is provided
      if (args.goalId) {
        const goal = await ctx.db.get(args.goalId)
        if (!goal) {
          throw new Error("Goal not found")
        }

        if (goal.userId !== args.userId) {
          throw new Error("Goal does not belong to user")
        }
      }

      const notificationId = await ctx.db.insert("notifications", {
        userId: args.userId,
        goalId: args.goalId,
        type: args.type,
        title: args.title.trim(),
        message: args.message.trim(),
        read: false,
      })

      console.log(`Notification created: ${notificationId} for user: ${args.userId}`)
      return notificationId
    } catch (error) {
      console.error("Error creating notification:", error)
      throw error
    }
  },
})

// Get unread notification count
export const getUnreadNotificationCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) => q.eq("userId", args.userId).eq("read", false))
        .collect()

      return notifications.length
    } catch (error) {
      console.error("Error fetching unread notification count:", error)
      throw new Error("Failed to fetch unread notification count")
    }
  },
})

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      const notification = await ctx.db.get(args.notificationId)
      if (!notification) {
        throw new Error("Notification not found")
      }

      if (notification.userId !== args.userId) {
        throw new Error("Unauthorized: You can only delete your own notifications")
      }

      await ctx.db.delete(args.notificationId)
      console.log(`Notification deleted: ${args.notificationId}`)
      return args.notificationId
    } catch (error) {
      console.error("Error deleting notification:", error)
      throw error
    }
  },
})

// Delete all read notifications for user
export const deleteAllReadNotifications = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const readNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) => q.eq("userId", args.userId).eq("read", true))
        .collect()

      const deletePromises = readNotifications.map((notification) => ctx.db.delete(notification._id))

      await Promise.all(deletePromises)

      console.log(`Deleted ${readNotifications.length} read notifications for user: ${args.userId}`)
      return readNotifications.length
    } catch (error) {
      console.error("Error deleting read notifications:", error)
      throw new Error("Failed to delete read notifications")
    }
  },
})

// Get notification statistics
export const getNotificationStatistics = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const allNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()

      const unreadCount = allNotifications.filter((n) => !n.read).length
      const readCount = allNotifications.filter((n) => n.read).length

      const typeBreakdown = allNotifications.reduce(
        (acc, notification) => {
          acc[notification.type] = (acc[notification.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      return {
        total: allNotifications.length,
        unread: unreadCount,
        read: readCount,
        typeBreakdown,
      }
    } catch (error) {
      console.error("Error fetching notification statistics:", error)
      throw new Error("Failed to fetch notification statistics")
    }
  },
})
