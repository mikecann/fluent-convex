/**
 * validators.ts - Input & return validation showcase.
 *
 * fluent-convex supports three flavors of validation:
 *   1. Property validators  - `{ count: v.number() }`
 *   2. Object validators    - `v.object({ count: v.number() })`
 *   3. Zod schemas (plugin) - `z.object({ count: z.number().min(1) })`
 *
 * The Zod plugin enables full runtime refinement validation (.min(),
 * .max(), .email(), etc.) on top of Convex's structural validation.
 */

import { v } from "convex/values";
import { z } from "zod";
import { WithZod } from "fluent-convex/zod";
import { convex } from "./fluent";

// ---------------------------------------------------------------------------
// 1. Property validators (the simplest form)
// ---------------------------------------------------------------------------

// #region propertyValidators
export const listWithPropertyValidators = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, input) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return { numbers: numbers.map((n) => n.value) };
  })
  .public();
// #endregion

// ---------------------------------------------------------------------------
// 2. Object validators with explicit .returns()
// ---------------------------------------------------------------------------

// #region objectValidators
export const listWithObjectValidators = convex
  .query()
  .input(v.object({ count: v.number() }))
  .returns(v.object({ numbers: v.array(v.number()) }))
  .handler(async (ctx, input) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return { numbers: numbers.map((n) => n.value) };
  })
  .public();
// #endregion

// ---------------------------------------------------------------------------
// 3. Zod schemas via the WithZod plugin
// ---------------------------------------------------------------------------

// #region zodValidation
export const listWithZod = convex
  .query()
  .extend(WithZod)
  .input(
    z.object({
      count: z.number().int().min(1).max(100),
    })
  )
  .returns(
    z.object({
      numbers: z.array(z.number()),
    })
  )
  .handler(async (ctx, input) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return { numbers: numbers.map((n) => n.value) };
  })
  .public();
// #endregion

// ---------------------------------------------------------------------------
// 4. Zod with refinements - runtime validation that Convex alone can't do
// ---------------------------------------------------------------------------

// #region zodRefinements
export const addPositiveNumber = convex
  .mutation()
  .extend(WithZod)
  .input(
    z.object({
      value: z.number().positive("Value must be positive"),
      label: z.string().min(1).max(50).optional(),
    })
  )
  .returns(v.id("numbers"))
  .handler(async (ctx, input) => {
    if (input.label) {
      console.log(`Adding number with label: ${input.label}`);
    }
    return await ctx.db.insert("numbers", { value: input.value });
  })
  .public();
// #endregion

// ---------------------------------------------------------------------------
// 5. Zod for complex return types
// ---------------------------------------------------------------------------

// #region zodStats
export const getNumberStats = convex
  .query()
  .extend(WithZod)
  .input(z.object({ limit: z.number().optional() }))
  .returns(
    z.object({
      total: z.number(),
      average: z.number(),
      min: z.number().nullable(),
      max: z.number().nullable(),
    })
  )
  .handler(async (ctx, input) => {
    const docs = await ctx.db
      .query("numbers")
      .order("desc")
      .take(input.limit ?? 100);
    const values = docs.map((n) => n.value);
    const total = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      total,
      average: total > 0 ? sum / total : 0,
      min: total > 0 ? Math.min(...values) : null,
      max: total > 0 ? Math.max(...values) : null,
    };
  })
  .public();
// #endregion
