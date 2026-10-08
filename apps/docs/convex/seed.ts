/**
 * seed.ts - Keeps the public demo data small and presentable.
 *
 * The live demos call public functions that anyone can hit directly, so:
 *   - an hourly cron clears the numbers and tasks tables, then inserts a
 *     curated set of example data
 *   - checkDemoRateLimit caps how fast the demos can add rows in between
 */

import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";

// Example numbers that make the demos look good
const SEED_NUMBERS = [7, 13, 42, 56, 71, 88, 23, 95, 34, 61];

// Example tasks that showcase the auth/task demo
const SEED_TASKS: Array<{
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}> = [
  { title: "Read the fluent-convex docs", completed: true, priority: "high" },
  { title: "Try the live demos", completed: true, priority: "medium" },
  { title: "Add middleware to my project", completed: false, priority: "high" },
  { title: "Set up Zod validation", completed: false, priority: "medium" },
  { title: "Build a custom plugin", completed: false, priority: "low" },
  { title: "Write reusable auth chains", completed: false, priority: "medium" },
];

// A single mutation can only write so many documents, so the reset deletes
// at most this many rows per table, then schedules itself again until the
// tables are empty.
const DELETE_BATCH_SIZE = 500;

export const resetDemoData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // --- Clear numbers ---
    const numbers = await ctx.db.query("numbers").take(DELETE_BATCH_SIZE);
    for (const doc of numbers) {
      await ctx.db.delete("numbers", doc._id);
    }

    // --- Clear tasks ---
    const tasks = await ctx.db.query("tasks").take(DELETE_BATCH_SIZE);
    for (const doc of tasks) {
      await ctx.db.delete("tasks", doc._id);
    }

    // --- More left? Carry on in a new transaction ---
    if (
      numbers.length === DELETE_BATCH_SIZE ||
      tasks.length === DELETE_BATCH_SIZE
    ) {
      console.log(
        `[seed] Deleted ${numbers.length} numbers, ${tasks.length} tasks, continuing...`
      );
      await ctx.scheduler.runAfter(0, internal.seed.resetDemoData, {});
      return;
    }

    // --- Seed numbers ---
    for (const value of SEED_NUMBERS) {
      await ctx.db.insert("numbers", { value });
    }

    // --- Seed tasks ---
    for (const task of SEED_TASKS) {
      await ctx.db.insert("tasks", {
        title: task.title,
        completed: task.completed,
        priority: task.priority,
        createdBy: "Demo User",
      });
    }

    console.log(
      `[seed] Reset demo data: ${SEED_NUMBERS.length} numbers, ${SEED_TASKS.length} tasks`
    );
  },
});

// Most rows each demo table accepts per rolling minute, across all callers.
// Together with the hourly reset, this keeps both tables to a few thousand
// rows at most.
const DEMO_INSERTS_PER_MINUTE = {
  numbers: 60,
  tasks: 20,
};

/**
 * Call before a public demo function inserts into `table`. Throws once the
 * table has had too many inserts in the last minute.
 */
export async function checkDemoRateLimit(
  ctx: MutationCtx,
  table: keyof typeof DEMO_INSERTS_PER_MINUTE
) {
  const limit = DEMO_INSERTS_PER_MINUTE[table];
  const recent = await ctx.db
    .query(table)
    .withIndex("by_creation_time", (q) =>
      q.gt("_creationTime", Date.now() - 60_000)
    )
    .take(limit);
  if (recent.length >= limit) {
    throw new ConvexError("The live demo is busy. Try again in a minute.");
  }
}
