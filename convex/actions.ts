import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Process expired goals and trigger payments
export const processExpiredGoalsAction = internalAction({
  handler: async (ctx) => {
    const now = Date.now();

    try {
      // Get all active goals that have passed their deadline
      const expiredGoals = await ctx.runQuery(internal.cron.getExpiredGoals);

      console.log(`Found ${expiredGoals.length} expired goals to process`);

      let processedCount = 0;
      let errorCount = 0;

      for (const goal of expiredGoals) {
        try {
          // Mark goal as failed
          await ctx.runMutation(internal.cron.markGoalAsFailed, { goalId: goal._id });

          // Attempt payment if payment method exists
          if (goal.paymentMethodId) {
            try {
              // Get user to get their Stripe customer ID
              const user = await ctx.runQuery(internal.users.getUserByIdInternal, { userId: goal.userId });
              if (!user || !user.stripeCustomerId) {
                console.error(`No Stripe customer ID found for user ${goal.userId}`);
                continue;
              }

              // Use the app URL from environment
              const appUrl = process.env.NEXT_PUBLIC_APP_URL;
              if (!appUrl) {
                console.error('NEXT_PUBLIC_APP_URL not configured');
                continue;
              }
              
              console.log('[Convex] INTERNAL_API_KEY:', process.env.INTERNAL_API_KEY?.slice(0, 6))
              // Create a PaymentIntent using the saved payment method
              const response = await fetch(`${appUrl}/api/stripe/charge-payment-method`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
                },
                body: JSON.stringify({
                  paymentMethodId: goal.paymentMethodId,
                  amount: goal.pledgeAmount,
                  customerId: user.stripeCustomerId,
                  goalId: goal._id,
                }),
              });

              const contentType = response.headers.get('content-type') || '';
              if (response.ok && contentType.includes('application/json')) {
                const result = await response.json();
                if (result.paymentIntentId) {
                  await ctx.runMutation(internal.cron.updateGoalPaymentSuccess, {
                    goalId: goal._id,
                    paymentIntentId: result.paymentIntentId,
                    processedAt: now,
                  });
                  console.log(`Payment processed successfully for goal ${goal._id}: ${result.paymentIntentId}`);
                  processedCount++;
                } else {
                  console.error(`No paymentIntentId returned for goal ${goal._id}`);
                  errorCount++;
                }
              } else {
                let errorData;
                if (contentType.includes('application/json')) {
                  errorData = await response.json();
                } else {
                  errorData = await response.text();
                  console.error(`Non-JSON error response for goal ${goal._id}:`, errorData);
                  errorData = { error: errorData };
                }
                console.error(`Payment processing failed for goal ${goal._id}:`, errorData);
                // Handle different types of payment failures
                if (errorData.requiresAction) {
                  await ctx.runMutation(internal.cron.createPaymentActionRequiredNotification, {
                    goalId: goal._id,
                    userId: goal.userId,
                    title: goal.title,
                  });
                } else {
                  await ctx.runMutation(internal.cron.createPaymentFailedNotification, {
                    goalId: goal._id,
                    userId: goal.userId,
                    title: goal.title,
                  });
                }
                errorCount++;
              }
            } catch (paymentError) {
              console.error(`Payment charge failed for goal ${goal._id}:`, paymentError);
              
              await ctx.runMutation(internal.cron.createPaymentErrorNotification, {
                goalId: goal._id,
                userId: goal.userId,
                title: goal.title,
              });
              errorCount++;
            }
          } else {
            console.log(`No payment method found for goal ${goal._id}, skipping payment processing`);
            
            await ctx.runMutation(internal.cron.createNoPaymentMethodNotification, {
              goalId: goal._id,
              userId: goal.userId,
              title: goal.title,
            });
          }

          // Create goal update log and failure notification
          await ctx.runMutation(internal.cron.createGoalFailureNotifications, {
            goalId: goal._id,
            userId: goal.userId,
            title: goal.title,
          });

        } catch (goalError) {
          console.error(`Error processing goal ${goal._id}:`, goalError);
          errorCount++;
        }
      }

      console.log(`Cron job completed: ${processedCount} payments processed, ${errorCount} errors`);
      return { processedCount, errorCount };
    } catch (error) {
      console.error("Error in processExpiredGoals cron job:", error);
      throw error;
    }
  },
}); 