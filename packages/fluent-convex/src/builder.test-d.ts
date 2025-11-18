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

    it("should enforce return type when .returns() is specified with Convex validator", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        .handler(async () => {
          // This should work - correct return type
          return { numbers: [1, 2, 3] };
        })
        .public();
    });

    it("should reject incorrect return type when .returns() is specified with Convex validator", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        // @ts-expect-error Return type mismatch: handler returns { count: number } but .returns() expects { numbers: number[] }
        .handler(async () => {
          return { count: 5 };
        })
        .public();
    });

    it("should reject return type with missing required property", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()), total: v.number() }))
        // @ts-expect-error Return type mismatch: missing 'total' property
        .handler(async () => {
          return { numbers: [1, 2, 3] };
        })
        .public();
    });

    it("should reject return type with wrong property type", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        // @ts-expect-error Return type mismatch: 'numbers' should be number[] but is string[]
        .handler(async () => {
          return { numbers: ["1", "2", "3"] };
        })
        .public();
    });

    it("should enforce return type with Zod validator", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(z.object({ numbers: z.array(z.number()) }))
        .handler(async () => {
          // This should work - correct return type
          return { numbers: [1, 2, 3] };
        })
        .public();
    });

    it("should reject incorrect return type with Zod validator", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(z.object({ numbers: z.array(z.number()) }))
        // @ts-expect-error Return type mismatch: handler returns { count: number } but .returns() expects { numbers: number[] }
        .handler(async () => {
          return { count: 5 };
        })
        .public();
    });

    it("should enforce primitive return types", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(z.string())
        .handler(async () => {
          // This should work - correct return type
          return "hello";
        })
        .public();
    });

    it("should reject wrong primitive return type", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(z.string())
        // @ts-expect-error Return type mismatch: handler returns number but .returns() expects string
        .handler(async () => {
          return 42;
        })
        .public();
    });

    it("should enforce array return types", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(v.array(v.number()))
        .handler(async () => {
          // This should work - correct return type
          return [1, 2, 3];
        })
        .public();
    });

    it("should reject wrong array return type", () => {
      convex
        .query()
        .input({ count: v.number() })
        .returns(v.array(v.number()))
        // @ts-expect-error Return type mismatch: handler returns string[] but .returns() expects number[]
        .handler(async () => {
          return ["1", "2", "3"];
        })
        .public();
    });

    it("should allow any return type when .returns() is not specified", () => {
      convex
        .query()
        .input({ count: v.number() })
        .handler(async () => {
          // Should allow any return type
          return { numbers: [1, 2, 3] };
        })
        .public();

      convex
        .query()
        .input({ count: v.number() })
        .handler(async () => {
          // Should allow different return types
          return { count: 5 };
        })
        .public();

      convex
        .query()
        .input({ count: v.number() })
        .handler(async () => {
          // Should allow primitive return types
          return 42;
        })
        .public();
    });

    it("should enforce return type for mutations", () => {
      convex
        .mutation()
        .input({ value: v.number() })
        .returns(v.id("numbers"))
        .handler(async ({ context, input }) => {
          // This should work - correct return type
          return await context.db.insert("numbers", { value: input.value });
        })
        .public();
    });

    it("should reject incorrect return type for mutations", () => {
      convex
        .mutation()
        .input({ value: v.number() })
        .returns(v.id("numbers"))
        // @ts-expect-error Return type mismatch: handler returns string but .returns() expects Id<"numbers">
        .handler(async () => {
          return "wrong-type";
        })
        .public();
    });

    it("should enforce return type for actions", () => {
      convex
        .action()
        .input({ count: v.number() })
        .returns(v.array(v.number()))
        .handler(async () => {
          // This should work - correct return type
          return [1, 2, 3];
        })
        .public();
    });

    it("should reject incorrect return type for actions", () => {
      convex
        .action()
        .input({ count: v.number() })
        .returns(v.array(v.number()))
        // @ts-expect-error Return type mismatch: handler returns string but .returns() expects number[]
        .handler(async () => {
          return "wrong";
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
      convex
        .query()
        .handler(async ({ input }) => {
          assertType<Record<never, never>>(input);
          return { success: true };
        })
        .public();
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

  describe("function kind selection", () => {
    it("should prevent calling .input() before selecting function kind", () => {
      const builder = convex;

      // @ts-expect-error - ConvexBuilder does not have an input method. Call .query(), .mutation(), or .action() first.
      builder.input({ id: v.string() });
    });

    it("should prevent calling .handler() before selecting function kind", () => {
      const builder = convex;

      // @ts-expect-error - ConvexBuilder does not have a handler method. Call .query(), .mutation(), or .action() first.
      builder.handler(async () => ({ success: true }));
    });

    it("should prevent calling .use() before selecting function kind", () => {
      const builder = convex;
      const authMiddleware = convex
        .query()
        .middleware(async ({ context, next }) => {
          return next({ context });
        });

      // @ts-expect-error - ConvexBuilder does not have a use method. Call .query(), .mutation(), or .action() first.
      builder.use(authMiddleware);
    });

    it("should allow .query() to be called first", () => {
      const builder = convex.query();
      assertType<typeof builder>(builder);
    });

    it("should allow .mutation() to be called first", () => {
      const builder = convex.mutation();
      assertType<typeof builder>(builder);
    });

    it("should allow .action() to be called first", () => {
      const builder = convex.action();
      assertType<typeof builder>(builder);
    });
  });

  describe("order of operations", () => {
    it("should prevent calling .public() before .handler()", () => {
      const builder = convex.query().input({ id: v.string() });

      // @ts-expect-error - ConvexBuilderWithFunctionKind does not have a public method. Call .handler() first.
      builder.public();
    });

    it("should prevent calling .internal() before .handler()", () => {
      const builder = convex.mutation().input({ name: v.string() });

      // @ts-expect-error - ConvexBuilderWithFunctionKind does not have an internal method. Call .handler() first.
      builder.internal();
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

    it("should allow .internal() after .handler()", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .internal();
    });
  });

  describe("handler uniqueness", () => {
    it("should prevent calling .handler() twice on query", () => {
      const builder = convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          return { id: input.id };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ error: "should not be called" }));
    });

    it("should prevent calling .handler() twice on mutation", () => {
      const builder = convex
        .mutation()
        .input({ name: v.string() })
        .handler(async ({ input }) => {
          return { name: input.name };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ error: "should not be called" }));
    });

    it("should prevent calling .handler() twice on action", () => {
      const builder = convex
        .action()
        .input({ url: v.string() })
        .handler(async ({ input }) => {
          return { url: input.url };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ error: "should not be called" }));
    });

    it("should prevent calling .handler() twice even with middleware in between", () => {
      const authMiddleware = convex
        .query()
        .middleware(async ({ context, next }) => {
          return next({ context });
        });

      const builder = convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          return { id: input.id };
        })
        .use(authMiddleware);

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ error: "should not be called" }));
    });

    it("should prevent calling .handler() twice even with returns validator", () => {
      const builder = convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        .handler(async () => {
          return { numbers: [1, 2, 3] };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ numbers: [] }));
    });

    it("should allow chaining .use() after handler()", () => {
      const authMiddleware = convex
        .query()
        .middleware(async ({ context, next }) => {
          return next({ context });
        });

      const builder = convex
        .query()
        .input({ id: v.string() })
        .handler(async ({ input }) => {
          return { id: input.id };
        })
        .use(authMiddleware);

      // Should be able to call .public() or .internal() after .use()
      assertType<typeof builder>(builder);
    });

    it("should prevent calling .returns() after handler()", () => {
      const builder = convex
        .query()
        .input({ count: v.number() })
        .handler(async () => {
          return { numbers: [1, 2, 3] };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a returns method. Call .returns() before .handler().
      builder.returns(v.object({ numbers: v.array(v.number()) }));
    });

    it("should allow calling .returns() before handler()", () => {
      const builder = convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        .handler(async () => {
          return { numbers: [1, 2, 3] };
        });

      // Should be able to call .public() or .internal() after .handler()
      assertType<typeof builder>(builder);
    });
  });

  describe("callable builder functionality", () => {
    it("should make ConvexBuilderWithHandler callable", () => {
      const nonRegisteredQuery = convex
        .query()
        .input({ count: v.number() })
        .handler(async ({ context, input }) => {
          return `the count is ${input.count}`;
        });

      // Should be callable
      assertType<
        (context: any) => (args: { count: number }) => Promise<string>
      >(nonRegisteredQuery);
    });

    it("should make registered queries non-callable", () => {
      const nonRegisteredQuery = convex
        .query()
        .input({ count: v.number() })
        .handler(async ({ context, input }) => {
          return `the count is ${input.count}`;
        });

      const registeredQuery = nonRegisteredQuery.public();

      // Should NOT be callable - RegisteredQuery is not a function
      // @ts-expect-error - RegisteredQuery is not callable
      registeredQuery({} as any);
    });

    it("should make registered mutations non-callable", () => {
      const nonRegisteredMutation = convex
        .mutation()
        .input({ value: v.number() })
        .handler(async ({ context, input }) => {
          return await context.db.insert("numbers", { value: input.value });
        });

      const registeredMutation = nonRegisteredMutation.public();

      // Should NOT be callable - RegisteredMutation is not a function
      // @ts-expect-error - RegisteredMutation is not callable
      registeredMutation({} as any);
    });

    it("should make registered actions non-callable", () => {
      const nonRegisteredAction = convex
        .action()
        .input({ url: v.string() })
        .handler(async ({ input }) => {
          return { url: input.url };
        });

      const registeredAction = nonRegisteredAction.public();

      // Should NOT be callable - RegisteredAction is not a function
      // @ts-expect-error - RegisteredAction is not callable
      registeredAction({} as any);
    });

    it("should make internal registered queries non-callable", () => {
      const nonRegisteredQuery = convex
        .query()
        .input({ count: v.number() })
        .handler(async ({ input }) => {
          return { count: input.count };
        });

      const registeredQuery = nonRegisteredQuery.internal();

      // Should NOT be callable - RegisteredQuery is not a function
      // @ts-expect-error - RegisteredQuery is not callable
      registeredQuery({} as any);
    });

    it("should preserve callability through middleware chain", () => {
      const authMiddleware = convex
        .query()
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              userId: "user-123",
            },
          });
        });

      const callableQuery = convex
        .query()
        .input({ count: v.number() })
        .use(authMiddleware)
        .handler(async ({ context, input }) => {
          assertType<string>(context.userId);
          return { count: input.count, userId: context.userId };
        });

      // Should still be callable after middleware
      assertType<
        (
          context: any
        ) => (args: {
          count: number;
        }) => Promise<{ count: number; userId: string }>
      >(callableQuery);
    });

    it("should preserve callability after multiple middleware", () => {
      const authMiddleware = convex
        .query()
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              userId: "user-123",
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

      const callableQuery = convex
        .query()
        .input({ count: v.number() })
        .use(authMiddleware)
        .use(loggingMiddleware)
        .handler(async ({ context, input }) => {
          assertType<string>(context.userId);
          assertType<string>(context.requestId);
          return { count: input.count };
        });

      // Should still be callable after multiple middleware
      assertType<
        (
          context: any
        ) => (args: { count: number }) => Promise<{ count: number }>
      >(callableQuery);
    });

    it("should work with mutations", () => {
      const callableMutation = convex
        .mutation()
        .input({ value: v.number() })
        .handler(async ({ context, input }) => {
          return await context.db.insert("numbers", { value: input.value });
        });

      // Should be callable
      assertType<(context: any) => (args: { value: number }) => Promise<any>>(
        callableMutation
      );
    });

    it("should work with actions", () => {
      const callableAction = convex
        .action()
        .input({ url: v.string() })
        .handler(async ({ input }) => {
          return { url: input.url };
        });

      // Should be callable
      assertType<
        (context: any) => (args: { url: string }) => Promise<{ url: string }>
      >(callableAction);
    });

    it("should work with optional input", () => {
      const callableQuery = convex
        .query()
        .input({
          name: v.optional(v.string()),
          count: v.optional(v.number()),
        })
        .handler(async ({ input }) => {
          return {
            name: input.name,
            count: input.count,
          };
        });

      // Should be callable
      assertType<
        (
          context: any
        ) => (args: {
          name?: string;
          count?: number;
        }) => Promise<{ name?: string; count?: number }>
      >(callableQuery);
    });

    it("should work with return validators", () => {
      const callableQuery = convex
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        .handler(async ({ input }) => {
          return {
            numbers: Array(input.count)
              .fill(0)
              .map((_, i) => i),
          };
        });

      // Should be callable
      assertType<
        (
          context: any
        ) => (args: { count: number }) => Promise<{ numbers: number[] }>
      >(callableQuery);
    });

    it("should work with Zod input validators", () => {
      const callableQuery = convex
        .query()
        .input(z.object({ count: z.number() }))
        .handler(async ({ input }) => {
          return { count: input.count };
        });

      // Should be callable
      assertType<
        (
          context: any
        ) => (args: { count: number }) => Promise<{ count: number }>
      >(callableQuery);
    });

    it("should work with no input", () => {
      const callableQuery = convex.query().handler(async () => {
        return { success: true };
      });

      // Should be callable
      assertType<
        (
          context: any
        ) => (args: Record<never, never>) => Promise<{ success: boolean }>
      >(callableQuery);
    });

    it("should lose callability after .public()", () => {
      const callableQuery = convex
        .query()
        .input({ count: v.number() })
        .handler(async ({ input }) => {
          return { count: input.count };
        });

      // Before .public(), should be callable
      assertType<
        (
          context: any
        ) => (args: { count: number }) => Promise<{ count: number }>
      >(callableQuery);

      const registeredQuery = callableQuery.public();

      // After .public(), should NOT be callable
      // @ts-expect-error - RegisteredQuery is not callable
      registeredQuery({} as any);
    });

    it("should lose callability after .internal()", () => {
      const callableMutation = convex
        .mutation()
        .input({ value: v.number() })
        .handler(async ({ context, input }) => {
          return await context.db.insert("numbers", { value: input.value });
        });

      // Before .internal(), should be callable
      assertType<(context: any) => (args: { value: number }) => Promise<any>>(
        callableMutation
      );

      const registeredMutation = callableMutation.internal();

      // After .internal(), should NOT be callable
      // @ts-expect-error - RegisteredMutation is not callable
      registeredMutation({} as any);
    });
  });
});
