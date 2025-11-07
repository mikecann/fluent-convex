import { describe, it, assertType } from "vitest";
import { cvx } from "./builder";
import { v } from "convex/values";
import { z } from "zod";
import type { Id } from "../_generated/dataModel";

describe("ConvexBuilder Type Tests", () => {
  describe("input validation", () => {
    it("should accept plain Convex PropertyValidators", () => {
      cvx
        .query()
        .input({ count: v.number() })
        .handler(async ({ context, input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        });
    });

    it("should accept Convex v.object() validators", () => {
      cvx
        .query()
        .input(v.object({ count: v.number() }))
        .handler(async ({ context, input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        });
    });

    it("should accept Zod object schemas", () => {
      cvx
        .query()
        .input(z.object({ count: z.number() }))
        .handler(async ({ context, input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        });
    });

    it("should reject Zod primitive schemas (not objects)", () => {
      // @ts-expect-error z.number() is not a valid input validator
      cvx.query().input(z.number());
    });

    it("should reject Zod string schemas", () => {
      // @ts-expect-error z.string() is not a valid input validator
      cvx.query().input(z.string());
    });

    it("should accept Zod schemas with refinements", () => {
      cvx
        .query()
        .input(z.object({ count: z.number() }).refine((data) => data.count > 0))
        .handler(async ({ context, input }) => {
          assertType<{ count: number }>(input);
          return { success: true };
        });
    });
  });

  describe("returns validation", () => {
    it("should accept Convex return validators", () => {
      cvx
        .query()
        .input({ count: v.number() })
        .returns(v.object({ numbers: v.array(v.number()) }))
        .handler(async ({ context, input }) => {
          return { numbers: [1, 2, 3] };
        });
    });

    it("should accept Zod return validators", () => {
      cvx
        .query()
        .input({ count: v.number() })
        .returns(z.object({ numbers: z.array(z.number()) }))
        .handler(async ({ context, input }) => {
          return { numbers: [1, 2, 3] };
        });
    });

    it("should accept Zod primitive return types", () => {
      cvx
        .query()
        .input({ count: v.number() })
        .returns(z.number())
        .handler(async ({ context, input }) => {
          return 42;
        });
    });
  });

  describe("middleware context transformation", () => {
    it("should extend context with middleware", () => {
      const authMiddleware = cvx
        .query()
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              user: { id: "123", name: "Test User" },
            },
          });
        });

      cvx
        .query()
        .use(authMiddleware)
        .input({ count: v.number() })
        .handler(async ({ context, input }) => {
          // Context should have user property from middleware
          assertType<{ id: string; name: string }>(context.user);

          // Context should still have base QueryCtx properties
          assertType(context.db);
          assertType(context.auth);

          return { userId: context.user.id };
        });
    });

    it("should chain multiple middleware", () => {
      const authMiddleware = cvx
        .query()
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              user: { id: "123", name: "Test User" },
            },
          });
        });

      const loggingMiddleware = cvx
        .query()
        .middleware(async ({ context, next }) => {
          return next({
            context: {
              ...context,
              requestId: "req-123",
            },
          });
        });

      cvx
        .query()
        .use(authMiddleware)
        .use(loggingMiddleware)
        .input({ count: v.number() })
        .handler(async ({ context, input }) => {
          // Context should have both user and requestId
          assertType<{ id: string; name: string }>(context.user);
          assertType<string>(context.requestId);

          return { success: true };
        });
    });
  });

  describe("function types", () => {
    it("should create queries", () => {
      cvx
        .query()
        .input({ id: v.id("numbers") })
        .handler(async ({ context, input }) => {
          assertType<Id<"numbers">>(input.id);
          return { id: input.id };
        });
    });

    it("should create mutations", () => {
      cvx
        .mutation()
        .input({ name: v.string() })
        .handler(async ({ context, input }) => {
          assertType<string>(input.name);
          return { name: input.name };
        });
    });

    it("should create actions", () => {
      cvx
        .action()
        .input({ url: v.string() })
        .handler(async ({ context, input }) => {
          assertType<string>(input.url);
          return { url: input.url };
        });
    });

    it("should create internal queries", () => {
      cvx
        .query()
        .internal()
        .input({ id: v.id("numbers") })
        .handler(async ({ context, input }) => {
          assertType<Id<"numbers">>(input.id);
          return { id: input.id };
        });
    });
  });

  describe("optional input", () => {
    it("should work without input validation", () => {
      cvx.query().handler(async ({ context, input }) => {
        assertType<Record<never, never>>(input);
        return { success: true };
      });
    });
  });

  describe("complex types", () => {
    it("should handle nested object schemas", () => {
      cvx
        .query()
        .input(
          z.object({
            user: z.object({
              name: z.string(),
              age: z.number(),
            }),
            tags: z.array(z.string()),
          }),
        )
        .handler(async ({ context, input }) => {
          assertType<string>(input.user.name);
          assertType<number>(input.user.age);
          assertType<string[]>(input.tags);

          return { success: true };
        });
    });

    it("should handle optional fields", () => {
      cvx
        .query()
        .input({ name: v.string(), age: v.optional(v.number()) })
        .handler(async ({ context, input }) => {
          assertType<string>(input.name);
          assertType<number | undefined>(input.age);

          return { success: true };
        });
    });
  });
});
