import { describe, it, expect } from "vitest";
import { v } from "convex/values";
import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
} from "convex/server";
import { createBuilder } from "./builder.js";
import { ConvexBuilderWithHandler } from "./ConvexBuilderWithHandler.js";
import { ConvexBuilderWithFunctionKind } from "./ConvexBuilderWithFunctionKind.js";

const schema = defineSchema({
  numbers: defineTable({ value: v.number() }),
});

const convex = createBuilder<DataModelFromSchemaDefinition<typeof schema>>();

describe("duplicate handler", () => {
  it("should not expose .handler() after handler is already set", () => {
    const builder = convex.query().input({ value: v.number() });

    // First handler is fine
    const withHandler = builder.handler(async (_ctx, args) => args.value);

    // After .handler() the result is a callable ConvexBuilderWithHandler.
    // The .handler method should NOT be exposed to prevent double-handler.
    expect((withHandler as any).handler).toBeUndefined();
  });

  it("should throw if handler is somehow set twice via internal def", () => {
    // Directly construct a ConvexBuilderWithFunctionKind with a handler already
    // set in the def, then try calling .handler() — this tests the guard in
    // ConvexBuilderWithFunctionKind.handler().
    const withHandler = new (ConvexBuilderWithFunctionKind as any)({
      functionType: "query",
      middlewares: [],
      argsValidator: undefined,
      returnsValidator: undefined,
      handler: async () => "first",
    });

    expect(() => {
      withHandler.handler(async () => "second");
    }).toThrow("Handler already defined");
  });
});

describe("missing handler", () => {
  it("should throw when .public() is called without .handler()", () => {
    // Create a builder with handler slot empty via extend hack
    const builder = convex.query().input({ value: v.number() });

    // builder doesn't have .public() yet — that's only on ConvexBuilderWithHandler.
    // We can construct one directly with no handler to test the guard.
    const handlerless = new (ConvexBuilderWithHandler as any)({
      functionType: "query",
      middlewares: [],
      argsValidator: { value: v.number() },
      returnsValidator: undefined,
      handler: undefined,
    });

    expect(() => {
      handlerless.public();
    }).toThrow("Handler not set");
  });

  it("should throw when .internal() is called without .handler()", () => {
    const handlerless = new (ConvexBuilderWithHandler as any)({
      functionType: "query",
      middlewares: [],
      argsValidator: undefined,
      returnsValidator: undefined,
      handler: undefined,
    });

    expect(() => {
      handlerless.internal();
    }).toThrow("Handler not set");
  });
});

describe("missing function type", () => {
  it("should throw when .public() is called without function type", () => {
    const noFunctionType = new (ConvexBuilderWithHandler as any)({
      functionType: undefined,
      middlewares: [],
      argsValidator: undefined,
      returnsValidator: undefined,
      handler: async () => "test",
    });

    expect(() => {
      noFunctionType.public();
    }).toThrow("Function type not set");
  });
});

describe("middleware error propagation", () => {
  it("should propagate errors thrown before next()", async () => {
    const failing = convex.query().createMiddleware(async (_ctx, _next) => {
      throw new Error("middleware failed before next");
    });

    const fn = convex
      .query()
      .use(failing)
      .handler(async () => "should not reach");

    await expect(fn({} as any, {})).rejects.toThrow(
      "middleware failed before next"
    );
  });

  it("should propagate errors thrown after next()", async () => {
    const failsAfter = convex.query().createMiddleware(async (ctx, next) => {
      await next(ctx);
      throw new Error("middleware failed after next");
    });

    const fn = convex
      .query()
      .use(failsAfter)
      .handler(async () => "handler ran");

    await expect(fn({} as any, {})).rejects.toThrow(
      "middleware failed after next"
    );
  });

  it("should propagate handler error through multiple middleware layers", async () => {
    const order: string[] = [];

    const outer = convex.query().createMiddleware(async (ctx, next) => {
      order.push("outer-before");
      try {
        return await next(ctx);
      } catch (e: any) {
        order.push("outer-catch");
        throw e;
      }
    });

    const inner = convex.query().createMiddleware(async (ctx, next) => {
      order.push("inner-before");
      try {
        return await next(ctx);
      } catch (e: any) {
        order.push("inner-catch");
        throw e;
      }
    });

    const fn = convex
      .query()
      .use(outer)
      .use(inner)
      .handler(async () => {
        throw new Error("boom");
      });

    await expect(fn({} as any, {})).rejects.toThrow("boom");

    // Both middleware should have caught the error in reverse order
    expect(order).toEqual([
      "outer-before",
      "inner-before",
      "inner-catch",
      "outer-catch",
    ]);
  });
});

describe("middleware skipping next()", () => {
  it("should allow middleware to short-circuit by not calling next()", async () => {
    const handlerRan = { value: false };

    const shortCircuit = convex.query().createMiddleware(async (_ctx, _next) => {
      // Intentionally don't call next() — short-circuit the chain
      return { context: {} };
    });

    const fn = convex
      .query()
      .use(shortCircuit)
      .handler(async () => {
        handlerRan.value = true;
        return "handler result";
      });

    await fn({} as any, {});

    // Handler should NOT have executed
    expect(handlerRan.value).toBe(false);
  });
});

describe("handler called with correct context and args", () => {
  it("should pass through args correctly with no middleware", async () => {
    const fn = convex
      .query()
      .input({ name: v.string(), count: v.number() })
      .handler(async (_ctx, args) => {
        return { name: args.name, count: args.count };
      });

    const result = await fn({} as any, { name: "test", count: 42 });
    expect(result).toEqual({ name: "test", count: 42 });
  });

  it("should pass enriched context through middleware chain", async () => {
    const addA = convex.query().createMiddleware(async (ctx, next) => {
      return next({ ...ctx, a: 1 });
    });
    const addB = convex.query().createMiddleware(async (ctx, next) => {
      return next({ ...ctx, b: 2 });
    });

    const fn = convex
      .query()
      .use(addA)
      .use(addB)
      .handler(async (ctx: any) => {
        return { a: ctx.a, b: ctx.b };
      });

    const result = await fn({} as any, {});
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

describe("empty middleware chain", () => {
  it("should work with no middleware at all", async () => {
    const fn = convex
      .query()
      .handler(async () => "no middleware");

    const result = await fn({} as any, {});
    expect(result).toBe("no middleware");
  });
});

describe("createMiddleware is an identity function", () => {
  it("createMiddleware on ConvexBuilder returns the same function", () => {
    const mw = async (ctx: any, next: any) => next(ctx);
    const result = convex.createMiddleware(mw);
    expect(result).toBe(mw);
  });

  it("createMiddleware on ConvexBuilderWithFunctionKind returns the same function", () => {
    const mw = async (ctx: any, next: any) => next(ctx);
    const result = convex.query().createMiddleware(mw);
    expect(result).toBe(mw);
  });

  it("$context().createMiddleware returns the same function", () => {
    const mw = async (ctx: any, next: any) => next(ctx);
    const result = convex.$context<{ auth: unknown }>().createMiddleware(mw);
    expect(result).toBe(mw);
  });
});
