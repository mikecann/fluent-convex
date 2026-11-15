// Type-checked against the built dist/ (via the package's own exports map) with
// skipLibCheck off, the way a strict consumer project would see our .d.ts files.
// Run by `npm run check:dist`; see issue #8 for why this exists.
import { createBuilder } from "fluent-convex";
import { WithZod } from "fluent-convex/zod";
import { v } from "convex/values";
import { z } from "zod/v4";
import type { GenericDataModel } from "convex/server";

const convex = createBuilder<GenericDataModel>();

export const zodQuery = convex
  .query()
  .extend(WithZod)
  .input(z.object({ count: z.number().min(1) }))
  .returns(z.number())
  .handler(async (_ctx, input) => input.count)
  .public();

export const plainQuery = convex
  .query()
  .input({ name: v.string() })
  .handler(async (_ctx, input) => input.name)
  .public();
