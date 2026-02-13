/**
 * authed.ts - Auth-gated functions using reusable chains.
 *
 * This file demonstrates the "reusable chain" pattern: we create
 * `authedQuery` and `authedMutation` by baking authMiddleware into
 * the builder chain. Every function built from them automatically
 * requires authentication and has `context.user` available.
 */

import { v } from "convex/values";
import { authedQuery, authedMutation, authedAction } from "./fluent";
import { api } from "./_generated/api";

// #region listTasks
export const listTasks = authedQuery
  .input({})
  .handler(async (ctx) => {
    // ctx.user is available from authMiddleware - fully typed!
    const tasks = await ctx.db.query("tasks").collect();
    return {
      viewer: ctx.user.name,
      tasks: tasks.map((t) => ({
        id: t._id,
        title: t.title,
        completed: t.completed,
        priority: t.priority,
      })),
    };
  })
  .public();
// #endregion

// #region addTask
export const addTask = authedMutation
  .input({
    title: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
  })
  .handler(async (ctx, input) => {
    const id = await ctx.db.insert("tasks", {
      title: input.title,
      completed: false,
      priority: input.priority,
      createdBy: ctx.user.name,
    });
    return id;
  })
  .public();
// #endregion

// #region toggleTask
export const toggleTask = authedMutation
  .input({ id: v.id("tasks") })
  .handler(async (ctx, input) => {
    const task = await ctx.db.get("tasks", input.id);
    if (!task) throw new Error("Task not found");
    await ctx.db.patch("tasks", input.id, { completed: !task.completed });
    return { completed: !task.completed };
  })
  .public();
// #endregion

// #region deleteTask
export const deleteTask = authedMutation
  .input({ id: v.id("tasks") })
  .handler(async (ctx, input) => {
    await ctx.db.delete("tasks", input.id);
  })
  .public();
// #endregion

// #region authedActionExample
// The same authMiddleware works on actions too - ctx.user is available!
export const getTaskSummary = authedAction
  .input({})
  .handler(async (ctx) => {
    const result: { viewer: string; tasks: { completed: boolean }[] } =
      await ctx.runQuery(api.authed.listTasks, {});
    const total = result.tasks.length;
    const done = result.tasks.filter((t) => t.completed).length;
    return {
      viewer: ctx.user.name,
      summary: `${done}/${total} tasks completed`,
    };
  })
  .public();
// #endregion
