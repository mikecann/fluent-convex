import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Reset demo data every hour so the docs stay clean
crons.hourly("reset demo data", { minuteUTC: 0 }, internal.seed.resetDemoData);

// Clear out demo guests who signed in over an hour ago
crons.hourly(
  "clear old demo sign-ins",
  { minuteUTC: 0 },
  internal.authCleanup.clearOldSignIns
);

export default crons;
