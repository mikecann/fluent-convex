import { describe, it, assertType, expectTypeOf } from "vitest";
import { createBuilder } from "fluent-convex";
import { v } from "convex/values";
import { z } from "zod/v4";
import type { Doc, Id, DataModel } from "./_generated/dataModel";

const convex = createBuilder<DataModel>();

describe("Schema-aware type tests", () => {
  it("should infer proper types from schema when querying numbers table", () => {
    convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        const numbers = await context.db
          .query("numbers")
          .order("desc")
          .take(input.count);

        // numbers should be properly typed as Doc<"numbers">[]
        type NumbersType = typeof numbers;
        type SingleNumber = (typeof numbers)[number];

        // Verify that numbers is an array of Doc<"numbers">
        expectTypeOf<NumbersType>().toEqualTypeOf<Doc<"numbers">[]>();

        // Verify that each number has a value property of type number
        expectTypeOf<SingleNumber["value"]>().toEqualTypeOf<number>();
      })
      .public();
  });

  it("should return proper array of values not GenericDocument", () => {
    convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        const numbers = await context.db
          .query("numbers")
          .order("desc")
          .take(input.count);

        // The map should work because number.value is properly typed as number
        const values = numbers.reverse().map((number) => number.value);

        // values should be number[]
        expectTypeOf(values).toEqualTypeOf<number[]>();

        return {
          numbers: values,
        };
      })
      .public();
  });

  it("should have proper table names", () => {
    convex
      .query()
      .handler(async (context) => {
        // Should only accept valid table names from the schema
        const numbersQuery = context.db.query("numbers");

        // @ts-expect-error "invalid_table" is not in the schema
        const invalidQuery = context.db.query("invalid_table");
      })
      .public();
  });

  it("should properly type document inserts in mutations", () => {
    convex
      .mutation()
      .input({ value: v.number() })
      .handler(async (context, input) => {
        // Should be able to insert with proper schema
        const id = await context.db.insert("numbers", { value: input.value });

        // id should be typed as Id<"numbers">
        expectTypeOf(id).toMatchTypeOf<string>();

        // @ts-expect-error Missing required field "value"
        await context.db.insert("numbers", {});

        // @ts-expect-error Extra field "invalid" not in schema
        await context.db.insert("numbers", { value: 42, invalid: "field" });
      })
      .public();
  });
});

describe("Input type inference", () => {
  it("should infer types from PropertyValidators", () => {
    convex
      .query()
      .input({
        count: v.number(),
        name: v.string(),
        optional: v.optional(v.boolean()),
      })
      .handler(async (context, input) => {
        assertType<number>(input.count);
        assertType<string>(input.name);
        assertType<boolean | undefined>(input.optional);
      })
      .public();
  });

  it("should infer types from v.object()", () => {
    convex
      .query()
      .input(
        v.object({
          count: v.number(),
          tags: v.array(v.string()),
        }),
      )
      .handler(async (context, input) => {
        assertType<number>(input.count);
        assertType<string[]>(input.tags);
      })
      .public();
  });

  it("should infer types from Zod schemas", () => {
    convex
      .query()
      .input(
        z.object({
          count: z.number(),
          email: z.string().email(),
          tags: z.array(z.string()),
        }),
      )
      .handler(async (context, input) => {
        expectTypeOf(input.count).toEqualTypeOf<number>();
        expectTypeOf(input.email).toEqualTypeOf<string>();
        expectTypeOf(input.tags).toEqualTypeOf<string[]>();
      })
      .public();
  });

  it("should handle Zod optional fields", () => {
    convex
      .query()
      .input(
        z.object({
          required: z.number(),
          optional: z.string().optional(),
        }),
      )
      .handler(async (context, input) => {
        expectTypeOf(input.required).toEqualTypeOf<number>();
        expectTypeOf(input.optional).toEqualTypeOf<string | undefined>();
      })
      .public();
  });

  it("should infer types from Zod refinements", () => {
    convex
      .query()
      .input(z.object({ count: z.number() }).refine((data) => data.count > 0))
      .handler(async (context, input) => {
        expectTypeOf(input.count).toEqualTypeOf<number>();
      })
      .public();
  });
});

describe("Return type inference", () => {
  it("should infer return types without explicit validator", () => {
    convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        const result = { result: input.count * 2 };
        expectTypeOf(result).toEqualTypeOf<{ result: number }>();
        return result;
      })
      .public();
  });

  it("should validate return types with Convex validators", () => {
    convex
      .query()
      .input({ count: v.number() })
      .returns(
        v.object({
          numbers: v.array(v.number()),
          total: v.number(),
        }),
      )
      .handler(async (context, input) => {
        return {
          numbers: [1, 2, 3],
          total: input.count,
        };
      })
      .public();
  });

  it("should validate return types with Zod schemas", () => {
    convex
      .query()
      .input(z.object({ count: z.number() }))
      .returns(
        z.object({
          numbers: z.array(z.number()),
          message: z.string(),
        }),
      )
      .handler(async () => {
        return {
          numbers: [1, 2, 3],
          message: "success",
        };
      })
      .public();
  });

  it("should validate primitive return types with Zod", () => {
    convex
      .query()
      .input({ value: v.number() })
      .returns(z.number())
      .handler(async (context, input) => {
        return input.value * 2;
      })
      .public();
  });
});

describe("Middleware context transformation", () => {
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
      .handler(async (context, input) => {
        // user should be available from middleware
        expectTypeOf(context.user.id).toEqualTypeOf<string>();
        expectTypeOf(context.user.name).toEqualTypeOf<string>();

        // Original context should still be available
        expectTypeOf(context.db).not.toBeAny();
      })
      .public();
  });

  it("should compose multiple middleware", () => {
    const authMiddleware = convex
      .query()
      .middleware(async (context, next) => {
        return next({
          ...context,
          userId: "user123" as const,
        });
      });

    const timestampMiddleware = convex
      .query()
      .middleware(async (context, next) => {
        return next({
          ...context,
          timestamp: 123456789,
        });
      });

    convex
      .query()
      .use(authMiddleware)
      .use(timestampMiddleware)
      .input({ count: v.number() })
      .handler(async (context) => {
        expectTypeOf(context.userId).toEqualTypeOf<"user123">();
        expectTypeOf(context.timestamp).toEqualTypeOf<number>();
        expectTypeOf(context.db).not.toBeAny();
      })
      .public();
  });
});

describe("Visibility and function types", () => {
  it("should create internal queries", () => {
    const internalQuery = convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        return { count: input.count };
      })
      .internal();

    // Type should indicate it's internal
    expectTypeOf(internalQuery).not.toBeAny();
  });

  it("should create mutations with proper types", () => {
    convex
      .mutation()
      .input({ value: v.number() })
      .returns(v.id("numbers"))
      .handler(async (context, input) => {
        const id = await context.db.insert("numbers", { value: input.value });
        expectTypeOf(id).toMatchTypeOf<Id<"numbers">>();
        return id;
      })
      .public();
  });

  it("should create actions with proper types", () => {
    convex
      .action()
      .input({ url: v.string() })
      .handler(async (context, input) => {
        const result = { fetched: input.url };
        assertType<{ fetched: string }>(result);
        return result;
      })
      .public();
  });
});

describe("Middleware after handler", () => {
  it("should allow middleware to be added after handler", () => {
    const middleware = convex.query().middleware(async (context, next) => {
      return next({
        ...context,
        requestId: "test-123",
      });
    });

    convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        // Handler can access context that will be transformed by middleware added after
        expectTypeOf(context.db).not.toBeAny();
        return { count: input.count };
      })
      .use(middleware)
      .public();
  });

  it("should allow multiple middleware to be added after handler", () => {
    const middleware1 = convex.query().middleware(async (context, next) => {
      return next({
        ...context,
        requestId: "test-123",
      });
    });

    const middleware2 = convex.query().middleware(async (context, next) => {
      return next({
        ...context,
        timestamp: Date.now(),
      });
    });

    convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        expectTypeOf(context.db).not.toBeAny();
        return { count: input.count };
      })
      .use(middleware1)
      .use(middleware2)
      .public();
  });

  it("should allow middleware after handler for mutations", () => {
    const middleware = convex
      .mutation()
      .middleware(async (context, next) => {
        return next({
          context: {
            ...context,
            requestId: "mut-123",
          },
        });
      });

    convex
      .mutation()
      .input({ value: v.number() })
      .handler(async (context, input) => {
        expectTypeOf(context.db).not.toBeAny();
        return { value: input.value };
      })
      .use(middleware)
      .public();
  });

  it("should allow middleware after handler for actions", () => {
    const middleware = convex.action().middleware(async (context, next) => {
      return next({
        ...context,
        requestId: "act-123",
      });
    });

    convex
      .action()
      .input({ url: v.string() })
      .handler(async (context, input) => {
        expectTypeOf(context.auth).not.toBeAny();
        return { url: input.url };
      })
      .use(middleware)
      .public();
  });
});

describe("Type safety edge cases", () => {
  it("should catch wrong input types with PropertyValidators", () => {
    convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        assertType<number>(input.count);

        // @ts-expect-error count is a number, not a string
        const str: string = input.count;
      })
      .public();
  });

  it("should catch wrong input types with Zod", () => {
    convex
      .query()
      .input(z.object({ value: z.number() }))
      .handler(async (context, input) => {
        expectTypeOf(input.value).toEqualTypeOf<number>();

        // @ts-expect-error value is a number, not a string
        const str: string = input.value;
      })
      .public();
  });

  it("should handle empty input", () => {
    convex
      .query()
      .input({})
      .handler(async (context, input) => {
        assertType<Record<never, never>>(input);
      })
      .public();
  });

  it("should handle complex nested types", () => {
    convex
      .query()
      .input({
        user: v.object({
          name: v.string(),
          age: v.number(),
          tags: v.array(v.string()),
        }),
      })
      .handler(async (context, input) => {
        assertType<string>(input.user.name);
        assertType<number>(input.user.age);
        assertType<string[]>(input.user.tags);
      })
      .public();
  });
});
