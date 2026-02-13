/**
 * seed.ts — Hourly cron job to reset demo data.
 *
 * Clears the numbers and tasks tables, then inserts a curated set
 * of example data so the live demos always look presentable.
 */

import { internalMutation } from "./_generated/server";

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

export const resetDemoData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // --- Clear numbers ---
    const allNumbers = await ctx.db.query("numbers").collect();
    for (const doc of allNumbers) {
      await ctx.db.delete(doc._id);
    }

    // --- Clear tasks ---
    const allTasks = await ctx.db.query("tasks").collect();
    for (const doc of allTasks) {
      await ctx.db.delete(doc._id);
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
