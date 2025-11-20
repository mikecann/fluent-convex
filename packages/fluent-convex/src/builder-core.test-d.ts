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

describe("Builder Core", () => {
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
        .middleware(async (context, next) => {
          return next(context);
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
        .handler(async (context, input) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .public();
    });

    it("should allow .internal() after .handler()", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
          return { id: input.id };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ error: "should not be called" }));
    });

    it("should prevent calling .handler() twice on mutation", () => {
      const builder = convex
        .mutation()
        .input({ name: v.string() })
        .handler(async (context, input) => {
          return { name: input.name };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ error: "should not be called" }));
    });

    it("should prevent calling .handler() twice on action", () => {
      const builder = convex
        .action()
        .input({ url: v.string() })
        .handler(async (context, input) => {
          return { url: input.url };
        });

      // @ts-expect-error - ConvexBuilderWithHandler does not have a handler method
      builder.handler(async () => ({ error: "should not be called" }));
    });

    it("should prevent calling .handler() twice even with middleware in between", () => {
      const authMiddleware = convex
        .query()
        .middleware(async (context, next) => {
          return next(context);
        });

      const builder = convex
        .query()
        .input({ id: v.string() })
        .handler(async (context, input) => {
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
        .middleware(async (context, next) => {
          return next(context);
        });

      const builder = convex
        .query()
        .input({ id: v.string() })
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .middleware(async (context, next) => {
          return next({
            ...context,
            userId: "user-123",
          });
        });

      const callableQuery = convex
        .query()
        .input({ count: v.number() })
        .use(authMiddleware)
        .handler(async (context, input) => {
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
        .middleware(async (context, next) => {
          return next({
            ...context,
            userId: "user-123",
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

      const callableQuery = convex
        .query()
        .input({ count: v.number() })
        .use(authMiddleware)
        .use(loggingMiddleware)
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
