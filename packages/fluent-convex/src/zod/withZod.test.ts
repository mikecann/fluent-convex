import { describe, it, expect } from "vitest";
import { v } from "convex/values";
import { z } from "zod/v4";
import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
} from "convex/server";
import { createBuilder } from "../builder.js";
import { ConvexBuilderWithFunctionKind } from "../ConvexBuilderWithFunctionKind.js";
import { WithZod, isZodSchema } from "./withZod.js";

const schema = defineSchema({
  test: defineTable({
    value: v.string(),
  }),
});

const convex = createBuilder<DataModelFromSchemaDefinition<typeof schema>>();

describe("isZodSchema", () => {
  it("should detect Zod schemas", () => {
    expect(isZodSchema(z.string())).toBe(true);
    expect(isZodSchema(z.object({ a: z.number() }))).toBe(true);
    expect(isZodSchema(z.number().min(1))).toBe(true);
  });

  it("should reject non-Zod values", () => {
    expect(isZodSchema(v.string())).toBeFalsy();
    expect(isZodSchema(42)).toBeFalsy();
    expect(isZodSchema(null)).toBeFalsy();
    expect(isZodSchema(undefined)).toBeFalsy();
    expect(isZodSchema({ parse: () => {} })).toBeFalsy();
  });
});

describe("WithZod plugin", () => {
  it("should work via .extend(WithZod)", () => {
    const builder = convex.query().extend(WithZod);
    expect(builder).toBeInstanceOf(WithZod);
    expect(builder).toBeInstanceOf(ConvexBuilderWithFunctionKind);
  });

  it("should preserve WithZod through .use()", () => {
    const builder = convex.query().extend(WithZod);
    const middleware = builder.createMiddleware(async (ctx, next) => {
      return next({ ...ctx, extra: "data" });
    });
    const afterUse = builder.use(middleware);
    expect(afterUse).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .input() with Convex validator", () => {
    const builder = convex.query().extend(WithZod);
    const afterInput = builder.input({ count: v.number() });
    expect(afterInput).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .input() with Zod schema", () => {
    const builder = convex.query().extend(WithZod);
    const afterInput = builder.input(z.object({ count: z.number() }));
    expect(afterInput).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .returns() with Convex validator", () => {
    const builder = convex.query().extend(WithZod);
    const afterReturns = builder.returns(v.string());
    expect(afterReturns).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .returns() with Zod schema", () => {
    const builder = convex.query().extend(WithZod);
    const afterReturns = builder.returns(z.string());
    expect(afterReturns).toBeInstanceOf(WithZod);
  });

  it("should accept Zod schemas in .input() and execute handler", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number() }))
      .handler(async (_ctx, input) => {
        return { result: input.count * 2 };
      });

    const result = await fn({} as any, { count: 5 });
    expect(result).toEqual({ result: 10 });
  });

  it("should accept Zod schemas in .returns() and execute handler", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .returns(z.object({ numbers: z.array(z.number()) }))
      .handler(async () => {
        return { numbers: [1, 2, 3] };
      });

    const result = await fn({} as any, {});
    expect(result).toEqual({ numbers: [1, 2, 3] });
  });

  it("should validate Zod input refinements at runtime", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number().positive() }))
      .handler(async (_ctx, input) => {
        return input.count;
      });

    // Valid input should pass
    const result = await fn({} as any, { count: 5 });
    expect(result).toBe(5);

    // Invalid input should throw
    await expect(fn({} as any, { count: -1 })).rejects.toThrow();
  });

  it("should validate Zod returns refinements at runtime", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .returns(z.number().positive())
      .handler(async () => {
        return -1; // This should fail validation
      });

    await expect(fn({} as any, {})).rejects.toThrow();
  });

  it("should work with plain Convex validators when using WithZod", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .handler(async (_ctx, input) => {
        return input.count;
      });

    const result = await fn({} as any, { count: 42 });
    expect(result).toBe(42);
  });

  it("should chain .use(), .input(), .returns() while preserving WithZod", async () => {
    const builder = convex.query().extend(WithZod);

    const middleware = builder.createMiddleware(async (ctx, next) => {
      return next({ ...ctx, extra: "data" });
    });

    const fn = builder
      .use(middleware)
      .input(z.object({ name: z.string().min(1) }))
      .returns(z.string())
      .handler(async (ctx: any, input) => {
        return `${input.name}-${ctx.extra}`;
      });

    const result = await fn({} as any, { name: "test" });
    expect(result).toBe("test-data");
  });

  it("should reject empty string via Zod refinement in chained builder", async () => {
    const builder = convex.query().extend(WithZod);

    const middleware = builder.createMiddleware(async (ctx, next) => {
      return next({ ...ctx, extra: "data" });
    });

    const fn = builder
      .use(middleware)
      .input(z.object({ name: z.string().min(1) }))
      .handler(async (_ctx: any, input) => {
        return input.name;
      });

    await expect(fn({} as any, { name: "" })).rejects.toThrow();
  });
});
