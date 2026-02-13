/**
 * actions.ts - Convex actions built with fluent-convex.
 *
 * Actions can call external APIs and run other Convex functions via
 * context.runQuery() / context.runMutation(). They're perfect for
 * orchestrating multi-step operations.
 */

import { v } from "convex/values";
import { convex } from "./fluent";
import { api } from "./_generated/api";
import { withLogging } from "./middleware";

// #region seedNumbers
export const seedNumbers = convex
  .action()
  .use(withLogging("seedNumbers"))
  .input({
    count: v.number(),
    min: v.optional(v.number()),
    max: v.optional(v.number()),
  })
  .returns(v.object({ seeded: v.number() }))
  .handler(async (ctx, input) => {
    const min = input.min ?? 1;
    const max = input.max ?? 100;

    for (let i = 0; i < input.count; i++) {
      const value = Math.floor(Math.random() * (max - min + 1)) + min;
      await ctx.runMutation(api.basics.addNumber, { value });
    }

    return { seeded: input.count };
  })
  .public();
// #endregion

// #region getSnapshot
export const getSnapshot = convex
  .action()
  .input({})
  .returns(
    v.object({
      numberCount: v.number(),
      numbers: v.array(v.number()),
    })
  )
  .handler(async (ctx) => {
    // Actions orchestrate by calling other functions
    const result: { numbers: number[] } = await ctx.runQuery(
      api.basics.listNumbers,
      { count: 50 }
    );
    return {
      numberCount: result.numbers.length,
      numbers: result.numbers,
    };
  })
  .public();
// #endregion
