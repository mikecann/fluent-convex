import { describe, it, assertType } from "vitest";
import { v } from "convex/values";
import { z } from "zod";
import { defineSchema, defineTable } from "convex/server";
import { createBuilder } from "./builder";

const schema = defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
});

const convex = createBuilder(schema);

describe("ConvexBuilder Type Tests", () => {
  describe("input validation", () => {
    it("should accept plain Convex PropertyValidators", () => {
      convex
        .query()
        .input({ count: v.number() })
        .handler(async ({ input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        })
        .public();
    });

    it("should accept Convex v.object() validators", () => {
      convex
        .query()
        .input(v.object({ count: v.number() }))
        .handler(async ({ input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        })
        .public();
    });

    it("should accept Zod object schemas", () => {
      convex
        .query()
        .input(z.object({ count: z.number() }))
        .handler(async ({ input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        })
        .public();
    });

    it("should reject Zod primitive schemas (not objects)", () => {
      // @ts-expect-error z.number() is not a valid input validator
      convex.query().input(z.number());
    });

    it("should reject Zod string schemas", () => {
      // @ts-expect-error z.string() is not a valid input validator
      convex.query().input(z.string());
    });

    it("should accept Zod schemas with refinements", () => {
      convex
        .query()
        .input(z.object({ count: z.number() }).refine((data) => data.count > 0))
        .handler(async ({ input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        })
        .public();
    });
  });

  describe("returns validation", () => {
    it("should accept Convex return validators", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        .handler(async () => {
          return { numbers: [1, 2, 3] };
        })
        .public();
    });

    it("should accept Zod return validators", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(z.object({ numbers: z.array(z.number()) }))
        .handler(async () => {
          return { numbers: [1, 2, 3] };
        })
        .public();
    });

    it("should accept Zod primitive return types", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(z.number())
        .handler(async () => {
          return 42;
        })
        .public();
    });
  });

  describe("middleware context transformation", () => {
    it("should extend context with middleware", () => {
      const authMiddleware = convex
        .query()
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              user: { id: "123", name: "Test User" },
            },
          });
        });

      convex
        .query()
        .use(authMiddleware)
        .input({ count: v.number() })
        .handler(async ({ context }) => {
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
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              user: { id: "123", name: "Test User" },
            },
          });
        });

      const loggingMiddleware = convex
        .query()
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              requestId: "req-123",
            },
          });
        });

      convex
        .query()
        .use(authMiddleware)
        .use(loggingMiddleware)
        .input({ count: v.number() })
        .handler(async ({ context }) => {
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
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              userId: "user-123",
            },
          });
        });

      convex
        .mutation()
        .use(authMiddleware)
        .input({ name: v.string() })
        .handler(async ({ context, input }) => {
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
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              token: "token-123",
            },
          });
        });

      convex
        .action()
        .use(authMiddleware)
        .input({ url: v.string() })
        .handler(async ({ context, input }) => {
          assertType<string>(context.token);
          assertType<string>(input.url);
          return { success: true };
        })
        .public();
    });

    it("should respect middleware application order", () => {
      const first = convex.query().middleware(async ({ context, next }) => {
        return next({
          context: {
            ...context,
            first: "first",
          },
        });
      });

      const second = convex.query().middleware(async ({ context, next }) => {
        return next({
          context: {
            ...context,
            second: "second",
          },
        });
      });

      convex
        .query()
        .use(first)
        .use(second)
        .input({})
        .handler(async ({ context }) => {
          // Both middleware values should be available in the handler
          assertType<string>(context.first);
          assertType<string>(context.second);
          return { success: true };
        })
        .public();
    });
  });

  describe("function types", () => {
    it("should create queries", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .public();
    });

    it("should create mutations", () => {
      convex
        .mutation()
        .input({ name: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.name);
          return { name: input.name };
        })
        .public();
    });

    it("should create actions", () => {
      convex
        .action()
        .input({ url: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.url);
          return { url: input.url };
        })
        .public();
    });

    it("should create internal queries", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .internal();
    });

    it("should create internal mutations", () => {
      convex
        .mutation()
        .input({ value: v.number() })
        .handler(async ({ context, input }) => {
          assertType(context.db);
          assertType<number>(input.value);
          return { value: input.value };
        })
        .internal();
    });

    it("should create internal actions", () => {
      convex
        .action()
        .input({ url: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.url);
          return { url: input.url };
        })
        .internal();
    });
  });

  describe("optional input", () => {
    it("should work without input validation", () => {
      convex.query().handler(async ({ input }) => {
        assertType<Record<never, never>>(input);
        return { success: true };
      }).public();
    });

    it("should infer optional fields as T | undefined", () => {
      convex
        .mutation()
        .input({
          id: v.id("numbers"),
          name: v.optional(v.string()),
          value: v.optional(v.number()),
        })
        .handler(async ({ input }) => {
          assertType<string>(input.id);
          assertType<string | undefined>(input.name);
          assertType<number | undefined>(input.value);
          return null;
        })
        .public();
    });

    it("should handle many optional fields with complex types", () => {
      convex
        .mutation()
        .input({
          id: v.id("numbers"),
          name: v.optional(v.string()),
          count: v.optional(v.number()),
          status: v.optional(v.union(v.string(), v.null())),
          items: v.optional(
            v.array(
              v.object({
                x: v.number(),
                y: v.number(),
              })
            )
          ),
        })
        .handler(async ({ input }) => {
          assertType<string>(input.id);
          assertType<string | undefined>(input.name);
          assertType<number | undefined>(input.count);
          assertType<string | null | undefined>(input.status);
          assertType<Array<{ x: number; y: number }> | undefined>(input.items);
          return null;
        })
        .public();
    });

    it("should allow all fields to be optional", () => {
      convex
        .query()
        .input({
          name: v.optional(v.string()),
          minValue: v.optional(v.number()),
          maxValue: v.optional(v.number()),
        })
        .handler(async ({ input }) => {
          assertType<string | undefined>(input.name);
          assertType<number | undefined>(input.minValue);
          assertType<number | undefined>(input.maxValue);
          return [];
        })
        .public();
    });

    it("should make all properties required but allow undefined for optional fields", () => {
      convex
        .mutation()
        .input({
          id: v.id("numbers"),
          name: v.optional(v.string()),
          value: v.optional(v.number()),
        })
        .handler(async ({ input }) => {
          // All properties are present in the type
          assertType<string>(input.id);
          assertType<string | undefined>(input.name);
          assertType<number | undefined>(input.value);

          // Valid assignments with all properties
          const testArgs1: typeof input = {
            id: "123" as any,
            name: undefined,
            value: undefined,
          };
          const testArgs2: typeof input = {
            id: "123" as any,
            name: "test",
            value: undefined,
          };
          const testArgs3: typeof input = {
            id: "123" as any,
            name: undefined,
            value: 42,
          };
          const testArgs4: typeof input = {
            id: "123" as any,
            name: "test",
            value: 42,
          };

          return { id: input.id };
        })
        .public();
    });

    it("should work with Partial for truly optional calling patterns", () => {
      convex
        .mutation()
        .input({
          id: v.id("numbers"),
          name: v.optional(v.string()),
          count: v.optional(v.number()),
          status: v.optional(v.union(v.string(), v.null())),
        })
        .handler(async ({ input }) => {
          // When calling, use Partial to make properties truly optional
          type CallArgs = Partial<typeof input> & Pick<typeof input, "id">;

          // Test various combinations are valid
          const testArgs1: CallArgs = { id: "123" as any };
          const testArgs2: CallArgs = { id: "123" as any, name: "test" };
          const testArgs3: CallArgs = { id: "123" as any, count: 10 };
          const testArgs4: CallArgs = { id: "123" as any, status: "active" };
          const testArgs5: CallArgs = { id: "123" as any, status: null };
          const testArgs6: CallArgs = {
            id: "123" as any,
            name: "test",
            count: 10,
          };
          const testArgs7: CallArgs = {
            id: "123" as any,
            name: "test",
            count: 10,
            status: "active",
          };

          return null;
        })
        .public();
    });

    it("should allow empty object when all fields are optional", () => {
      convex
        .query()
        .input({
          name: v.optional(v.string()),
          minValue: v.optional(v.number()),
          maxValue: v.optional(v.number()),
        })
        .handler(async ({ input }) => {
          // For calling, use Partial
          type CallArgs = Partial<typeof input>;

          // Test various combinations are valid
          const testArgs1: CallArgs = {};
          const testArgs2: CallArgs = { name: "test" };
          const testArgs3: CallArgs = { minValue: 10 };
          const testArgs4: CallArgs = { maxValue: 20 };
          const testArgs5: CallArgs = { minValue: 10, maxValue: 20 };
          const testArgs6: CallArgs = {
            name: "test",
            minValue: 10,
            maxValue: 20,
          };

          return [];
        })
        .public();
    });
  });

  describe("complex types", () => {
    it("should handle nested Zod object schemas", () => {
      convex
        .query()
        .input(
          z.object({
            user: z.object({
              name: z.string(),
              age: z.number(),
            }),
            tags: z.array(z.string()),
          })
        )
        .handler(async ({ input }) => {
          assertType<string>(input.user.name);
          assertType<number>(input.user.age);
          assertType<string[]>(input.tags);

          return { success: true };
        })
        .public();
    });

    it("should handle optional fields", () => {
      convex
        .query()
        .input({ name: v.string(), age: v.optional(v.number()) })
        .handler(async ({ input }) => {
          assertType<string>(input.name);
          assertType<number | undefined>(input.age);

          return { success: true };
        })
        .public();
    });

    it("should handle v.union()", () => {
      convex
        .query()
        .input({
          value: v.union(v.string(), v.number()),
        })
        .handler(async ({ input }) => {
          assertType<string | number>(input.value);
          return { success: true };
        })
        .public();
    });

    it("should handle v.array()", () => {
      convex
        .query()
        .input({
          tags: v.array(v.string()),
        })
        .handler(async ({ input }) => {
          assertType<string[]>(input.tags);
          return { success: true };
        })
        .public();
    });

    it("should handle nested v.object()", () => {
      convex
        .query()
        .input({
          user: v.object({
            name: v.string(),
            age: v.number(),
          }),
        })
        .handler(async ({ input }) => {
          assertType<{ name: string; age: number }>(input.user);
          return { success: true };
        })
        .public();
    });

    it("should handle v.literal()", () => {
      convex
        .query()
        .input({
          kind: v.literal("user"),
        })
        .handler(async ({ input }) => {
          assertType<"user">(input.kind);
          return { success: true };
        })
        .public();
    });

    it("should handle mix of optional and required fields", () => {
      convex
        .query()
        .input({
          required: v.string(),
          optional: v.optional(v.string()),
          defaulted: v.optional(v.number()),
        })
        .handler(async ({ input }) => {
          assertType<string>(input.required);
          assertType<string | undefined>(input.optional);
          assertType<number | undefined>(input.defaulted);
          return { success: true };
        })
        .public();
    });
  });

  describe("context types per function", () => {
    it("queries should have db and auth", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ context }) => {
          assertType(context.db);
          assertType(context.auth);
          return { success: true };
        })
        .public();
    });

    it("mutations should have db and auth", () => {
      convex
        .mutation()
        .input({ name: v.string() })
        .handler(async ({ context }) => {
          assertType(context.db);
          assertType(context.auth);
          return { success: true };
        })
        .public();
    });

    it("actions should have auth and scheduler", () => {
      convex
        .action()
        .input({ url: v.string() })
        .handler(async ({ context }) => {
          assertType(context.auth);
          assertType(context.scheduler);
          return { success: true };
        })
        .public();
    });
  });

  describe("order of operations", () => {
    it("should require .public() or .internal() after .handler()", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .internal();
    });

    it("should allow .public() after .handler()", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .public();
    });
  });
});
