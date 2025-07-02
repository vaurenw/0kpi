import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

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

export default crons; 