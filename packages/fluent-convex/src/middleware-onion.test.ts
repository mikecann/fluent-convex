import { describe, it, expect } from "vitest";
import { v } from "convex/values";
import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
} from "convex/server";
import { createBuilder } from "./builder";

const schema = defineSchema({
  numbers: defineTable({ value: v.number() }),
});

const convex = createBuilder<DataModelFromSchemaDefinition<typeof schema>>();

describe("Onion middleware composition", () => {
  it("middleware executes in onion order (before → handler → after)", async () => {
    const order: string[] = [];

    const outer = convex.query().createMiddleware(async (context, next) => {
      order.push("outer-before");
      const result = await next(context);
      order.push("outer-after");
      return result;
    });

    const inner = convex.query().createMiddleware(async (context, next) => {
      order.push("inner-before");
      const result = await next(context);
      order.push("inner-after");
      return result;
    });

    const fn = convex
      .query()
      .use(outer)
      .use(inner)
      .handler(async () => {
        order.push("handler");
        return { done: true };
      });

    await fn({} as any)({});

    // Onion order: outer wraps inner wraps handler
    expect(order).toEqual([
      "outer-before",
      "inner-before",
      "handler",
      "inner-after",
      "outer-after",
    ]);
  });

  it("middleware can catch errors thrown by the handler", async () => {
    let caughtError: string | null = null;

    const errorCatcher = convex.query().createMiddleware(async (context, next) => {
      try {
        return await next(context);
      } catch (e: any) {
        caughtError = e.message;
        throw e; // re-throw so the caller still sees the error
      }
    });

    const fn = convex
      .query()
      .use(errorCatcher)
      .handler(async () => {
        throw new Error("handler exploded");
      });

    await expect(fn({} as any)({})).rejects.toThrow("handler exploded");

    // The middleware should have intercepted the error
    expect(caughtError).toBe("handler exploded");
  });

  it("middleware can measure handler execution time", async () => {
    let measuredDuration = 0;

    const timer = convex.query().createMiddleware(async (context, next) => {
      const start = Date.now();
      const result = await next(context);
      measuredDuration = Date.now() - start;
      return result;
    });

    const fn = convex
      .query()
      .use(timer)
      .handler(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { done: true };
      });

    await fn({} as any)({});

    // next() should block until the handler completes,
    // so measured duration should include the 50ms sleep
    expect(measuredDuration).toBeGreaterThanOrEqual(40);
  });

  it("context enrichment still works with onion middleware", async () => {
    const addUser = convex.query().createMiddleware(async (context, next) => {
      return next({ ...context, user: "alice" });
    });

    const addTimestamp = convex.query().createMiddleware(async (context, next) => {
      return next({ ...context, timestamp: 12345 });
    });

    const fn = convex
      .query()
      .use(addUser)
      .use(addTimestamp)
      .handler(async (context) => {
        return {
          user: (context as any).user,
          timestamp: (context as any).timestamp,
        };
      });

    const result = await fn({} as any)({});
    expect(result).toEqual({ user: "alice", timestamp: 12345 });
  });
});
