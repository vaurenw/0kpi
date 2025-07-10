import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const crons = cronJobs();

crons.cron(
  "processExpiredGoals",
  "*/2 * * * *", // every 2 minutes for testing
  internal.actions.processExpiredGoalsAction
);

crons.cron(
  "sendDeadlineReminders",
  "0 9 * * *", // daily at 9 AM
  internal.cron.sendDeadlineReminders
);

export const processExpiredGoalsActionTrigger = internalAction({
  handler: async (ctx): Promise<{ processedCount: number; errorCount: number }> => {
    return await ctx.runAction(internal.actions.processExpiredGoalsAction, {});
  }
});

export default crons; 