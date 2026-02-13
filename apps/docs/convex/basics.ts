/**
 * basics.ts - The simplest fluent-convex functions.
 *
 * These examples show the core API without any middleware or plugins.
 * Compare them side-by-side with their standard Convex equivalents
 * to see how fluent-convex cleans up the syntax.
 */

import { v } from "convex/values";
import { convex } from "./fluent";

// #region listNumbers
export const listNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, input) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return {
      numbers: numbers.reverse().map((n) => n.value),
    };
  })
  .public();
// #endregion

// #region addNumber
export const addNumber = convex
  .mutation()
  .input({ value: v.number() })
  .handler(async (ctx, input) => {
    const id = await ctx.db.insert("numbers", { value: input.value });
    return id;
  })
  .public();
// #endregion

// #region deleteAllNumbers
export const deleteAllNumbers = convex
  .mutation()
  .input({})
  .handler(async (ctx) => {
    const all = await ctx.db.query("numbers").collect();
    for (const doc of all) {
      await ctx.db.delete("numbers", doc._id);
    }
    return { deleted: all.length };
  })
  .public();
// #endregion
