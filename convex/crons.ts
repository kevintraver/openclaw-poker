import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for timed-out actions every 5 seconds
crons.interval(
  "check action timeouts",
  { seconds: 5 },
  internal.timeouts.checkActionTimeouts
);

// Auto-start hands at tables between hands every 10 seconds
crons.interval(
  "auto-start hands",
  { seconds: 10 },
  internal.autoplay.maybeStartHand
);

export default crons;
