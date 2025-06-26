import { internalMutation } from "./_generated/server"

// Process expired goals and trigger payments
export const processExpiredGoals = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()

    try {
      // Get all active goals that have passed their deadline
      const expiredGoals = await ctx.db
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

      console.log(`Found ${expiredGoals.length} expired goals to process`)

      let processedCount = 0
      let errorCount = 0

      for (const goal of expiredGoals) {
        try {
          // Mark goal as failed
          await ctx.db.patch(goal._id, {
            status: "failed",
          })

          // Capture the payment if payment method exists
          if (goal.paymentMethodId) {
            try {
              // Get user to get their Stripe customer ID
              const user = await ctx.db.get(goal.userId)
              if (!user || !user.stripeCustomerId) {
                console.error(`No Stripe customer ID found for user ${goal.userId}`)
                continue
              }

              // Create a PaymentIntent using the saved payment method
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/charge-payment-method`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
                },
                body: JSON.stringify({
                  paymentMethodId: goal.paymentMethodId,
                  amount: goal.pledgeAmount, // Use the pledge amount as-is (in dollars)
                  customerId: user.stripeCustomerId,
                  goalId: goal._id,
                }),
              })

              if (response.ok) {
                const result = await response.json()
                await ctx.db.patch(goal._id, {
                  paymentProcessed: true,
                  paymentProcessedAt: now,
                  paymentIntentId: result.paymentIntentId, // Store the new payment intent ID
                })
                console.log(`Payment processed successfully for goal ${goal._id}: ${result.paymentIntentId}`)
              } else {
                const errorData = await response.json()
                console.error(`Payment processing failed for goal ${goal._id}:`, errorData)
              }
            } catch (paymentError) {
              console.error(`Payment charge failed for goal ${goal._id}:`, paymentError)
            }
          } else {
            console.log(`No payment method found for goal ${goal._id}, skipping payment processing`)
          }

          // Create goal update log
          await ctx.db.insert("goalUpdates", {
            goalId: goal._id,
            userId: goal.userId,
            type: "failed",
            message: `Goal "${goal.title}" failed - deadline missed`,
          })

          // Create notification
          await ctx.db.insert("notifications", {
            userId: goal.userId,
            goalId: goal._id,
            type: "goal_failed",
            title: "Goal Failed",
            message: `Unfortunately, you missed the deadline for "${goal.title}". Payment processing will begin.`,
            read: false,
          })

          processedCount++
          console.log(`Successfully processed expired goal: ${goal._id}`)
        } catch (error) {
          errorCount++
          console.error(`Error processing expired goal ${goal._id}:`, error)
        }
      }

      const result = {
        processedCount,
        errorCount,
        totalFound: expiredGoals.length,
        timestamp: now,
      }

      console.log(`Expired goals processing complete:`, result)
      return result
    } catch (error) {
      console.error("Critical error in processExpiredGoals:", error)
      throw error
    }
  },
})

// Send deadline reminders
export const sendDeadlineReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const oneDayFromNow = now + 24 * 60 * 60 * 1000 // 24 hours
    const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000 // 3 days
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000 // 7 days

    try {
      // Get goals with deadlines in the next 1-7 days
      const upcomingGoals = await ctx.db
        .query("goals")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .filter((q) =>
          q.and(
            q.gt(q.field("deadline"), now),
            q.lt(q.field("deadline"), oneWeekFromNow),
            q.eq(q.field("completed"), false),
          ),
        )
        .collect()

      let remindersSent = 0
      let errorCount = 0

      for (const goal of upcomingGoals) {
        try {
          const timeUntilDeadline = goal.deadline - now
          const daysUntilDeadline = Math.ceil(timeUntilDeadline / (24 * 60 * 60 * 1000))

          // Send reminder if deadline is in 1, 3, or 7 days and we haven't sent too many reminders
          const shouldSendReminder =
            (daysUntilDeadline === 1 || daysUntilDeadline === 3 || daysUntilDeadline === 7) &&
            (goal.remindersSent || 0) < 10 && // Max 10 reminders per goal
            (!goal.lastReminderSent || now - goal.lastReminderSent > 12 * 60 * 60 * 1000) // At least 12 hours since last reminder

          if (shouldSendReminder) {
            const urgencyLevel = daysUntilDeadline === 1 ? "urgent" : daysUntilDeadline === 3 ? "important" : "reminder"
            const emoji = daysUntilDeadline === 1 ? "🚨" : daysUntilDeadline === 3 ? "⏰" : "📅"

            // Create notification
            await ctx.db.insert("notifications", {
              userId: goal.userId,
              goalId: goal._id,
              type: "goal_deadline_approaching",
              title: `${emoji} Deadline Approaching: ${goal.title}`,
              message: `Your goal "${goal.title}" is due in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? "s" : ""}. Don't forget to complete it to avoid the $${goal.pledgeAmount} charge!`,
              read: false,
            })

            // Update reminder tracking
            await ctx.db.patch(goal._id, {
              remindersSent: (goal.remindersSent || 0) + 1,
              lastReminderSent: now,
            })

            // Create goal update log
            await ctx.db.insert("goalUpdates", {
              goalId: goal._id,
              userId: goal.userId,
              type: "reminder_sent",
              message: `${urgencyLevel} deadline reminder sent - ${daysUntilDeadline} day${daysUntilDeadline > 1 ? "s" : ""} remaining`,
            })

            remindersSent++
            console.log(`Sent ${urgencyLevel} reminder for goal ${goal._id} (${daysUntilDeadline} days remaining)`)
          }
        } catch (error) {
          errorCount++
          console.error(`Error sending reminder for goal ${goal._id}:`, error)
        }
      }

      const result = {
        remindersSent,
        errorCount,
        totalGoalsChecked: upcomingGoals.length,
        timestamp: now,
      }

      console.log(`Deadline reminders processing complete:`, result)
      return result
    } catch (error) {
      console.error("Critical error in sendDeadlineReminders:", error)
      throw error
    }
  },
})

// Clean up old notifications (older than 30 days)
export const cleanupOldNotifications = internalMutation({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    try {
      const oldNotifications = await ctx.db
        .query("notifications")
        .filter((q) => q.lt(q.field("_creationTime"), thirtyDaysAgo))
        .collect()

      let deletedCount = 0
      let errorCount = 0

      for (const notification of oldNotifications) {
        try {
          await ctx.db.delete(notification._id)
          deletedCount++
        } catch (error) {
          errorCount++
          console.error(`Error deleting notification ${notification._id}:`, error)
        }
      }

      const result = {
        deletedCount,
        errorCount,
        totalFound: oldNotifications.length,
        timestamp: Date.now(),
      }

      console.log(`Notification cleanup complete:`, result)
      return result
    } catch (error) {
      console.error("Critical error in cleanupOldNotifications:", error)
      throw error
    }
  },
})

// Clean up old goal updates (older than 90 days)
export const cleanupOldGoalUpdates = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000

    try {
      const oldUpdates = await ctx.db
        .query("goalUpdates")
        .filter((q) => q.lt(q.field("_creationTime"), ninetyDaysAgo))
        .collect()

      let deletedCount = 0
      let errorCount = 0

      for (const update of oldUpdates) {
        try {
          await ctx.db.delete(update._id)
          deletedCount++
        } catch (error) {
          errorCount++
          console.error(`Error deleting goal update ${update._id}:`, error)
        }
      }

      const result = {
        deletedCount,
        errorCount,
        totalFound: oldUpdates.length,
        timestamp: Date.now(),
      }

      console.log(`Goal updates cleanup complete:`, result)
      return result
    } catch (error) {
      console.error("Critical error in cleanupOldGoalUpdates:", error)
      throw error
    }
  },
})

// Update user statistics (run daily)
export const updateUserStatistics = internalMutation({
  handler: async (ctx) => {
    try {
      const users = await ctx.db.query("users").collect()
      let updatedCount = 0
      let errorCount = 0

      for (const user of users) {
        try {
          // Get user's goals
          const userGoals = await ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect()

          // Calculate statistics
          const totalGoalsCreated = userGoals.length
          const completedGoals = userGoals.filter((goal) => goal.completed)
          const failedGoals = userGoals.filter((goal) => goal.status === "failed")

          const totalGoalsCompleted = completedGoals.length
          const totalMoneyPledged = userGoals.reduce((sum, goal) => sum + goal.pledgeAmount, 0)
          const totalMoneySaved = completedGoals.reduce((sum, goal) => sum + goal.pledgeAmount, 0)
          const totalMoneyLost = failedGoals
            .filter((goal) => goal.paymentProcessed)
            .reduce((sum, goal) => sum + goal.pledgeAmount, 0)

          // Update user statistics
          await ctx.db.patch(user._id, {
            totalGoalsCreated,
            totalGoalsCompleted,
            totalMoneyPledged,
            totalMoneySaved,
            totalMoneyLost,
          })

          updatedCount++
        } catch (error) {
          errorCount++
          console.error(`Error updating statistics for user ${user._id}:`, error)
        }
      }

      const result = {
        updatedCount,
        errorCount,
        totalUsers: users.length,
        timestamp: Date.now(),
      }

      console.log(`User statistics update complete:`, result)
      return result
    } catch (error) {
      console.error("Critical error in updateUserStatistics:", error)
      throw error
    }
  },
})
