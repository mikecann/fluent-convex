import { describe, it, assertType } from "vitest";
import { v } from "convex/values";
import { z } from "zod";
import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
} from "convex/server";
import { createBuilder } from "./builder";

const schema = defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
});

const convex = createBuilder<DataModelFromSchemaDefinition<typeof schema>>();

describe("Middleware", () => {
  describe("context transformation", () => {
    it("should extend context with middleware", () => {
      const authMiddleware = convex
        .query()
        .middleware(async (context, next) => {
          return next({
            ...context,
            user: { id: "123", name: "Test User" },
          });
        });

      convex
        .query()
        .use(authMiddleware)
        .input({ count: v.number() })
        .handler(async (context) => {
          // Context should have user property from middleware
          assertType<{ id: string; name: string }>(context.user);

          // Context should still have base QueryCtx properties
          assertType(context.db);
          assertType(context.auth);

          return { userId: context.user.id };
        })
        .public();
    });

    it("should chain multiple middleware", () => {
      const authMiddleware = convex
        .query()
        .middleware(async (context, next) => {
          return next({
            ...context,
            user: { id: "123", name: "Test User" },
          });
        });

      const loggingMiddleware = convex
        .query()
        .middleware(async (context, next) => {
          return next({
            ...context,
            requestId: "req-123",
          });
        });

      convex
        .query()
        .use(authMiddleware)
        .use(loggingMiddleware)
        .input({ count: v.number() })
        .handler(async (context) => {
          // Context should have both user and requestId
          assertType<{ id: string; name: string }>(context.user);
          assertType<string>(context.requestId);

          return { success: true };
        })
        .public();
    });

    it("should work with mutations", () => {
      const authMiddleware = convex
        .mutation()
        .middleware(async (context, next) => {
          return next({
            ...context,
            userId: "user-123",
          });
        });

      convex
        .mutation()
        .use(authMiddleware)
        .input({ name: v.string() })
        .handler(async (context, input) => {
          assertType<string>(context.userId);
          assertType(context.db);
          assertType<string>(input.name);
          return null;
        })
        .public();
    });

    it("should work with actions", () => {
      const authMiddleware = convex
        .action()
        .middleware(async (context, next) => {
          return next({
            ...context,
            token: "token-123",
          });
        });

      convex
        .action()
        .use(authMiddleware)
        .input({ url: v.string() })
        .handler(async (context, input) => {
          assertType<string>(context.token);
          assertType<string>(input.url);
          return { success: true };
        })
        .public();
    });

    it("should respect middleware application order", () => {
      const first = convex.query().middleware(async (context, next) => {
        return next({
          ...context,
          first: "first",
        });
      });

      const second = convex.query().middleware(async (context, next) => {
        return next({
          ...context,
          second: "second",
        });
      });

      convex
        .query()
        .use(first)
        .use(second)
        .input({})
        .handler(async (context) => {
          // Both middleware values should be available in the handler
          assertType<string>(context.first);
          assertType<string>(context.second);
          return { success: true };
        })
        .public();
    });
  });
});
