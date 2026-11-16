import { describe, it, assertType, expectTypeOf } from "vitest";
import { v } from "convex/values";
import { z } from "zod/v4";
import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
  type RegisteredQuery,
} from "convex/server";
import { createBuilder } from "../builder.js";
import { WithZod } from "./withZod.js";

const schema = defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
});

const convex = createBuilder<DataModelFromSchemaDefinition<typeof schema>>();

describe("WithZod Input Type Tests", () => {
  it("should accept Zod object schemas", () => {
    convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number() }))
      .handler(async (_context, input) => {
        assertType<{ count: number }>(input);
        return { success: true };
      })
      .public();
  });

  it("should reject Zod primitive schemas (not objects) as input", () => {
    // @ts-expect-error z.number() is not a valid input validator
    convex.query().extend(WithZod).input(z.number());
  });

  it("should reject Zod string schemas as input", () => {
    // @ts-expect-error z.string() is not a valid input validator
    convex.query().extend(WithZod).input(z.string());
  });

  it("should accept Zod schemas with refinements", () => {
    convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number() }).refine((data) => data.count > 0))
      .handler(async (_context, input) => {
        assertType<{ count: number }>(input);
        return { success: true };
      })
      .public();
  });

  it("should handle nested Zod object schemas", () => {
    convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          user: z.object({
            name: z.string(),
            age: z.number(),
          }),
          tags: z.array(z.string()),
        })
      )
      .handler(async (_context, input) => {
        assertType<string>(input.user.name);
        assertType<number>(input.user.age);
        assertType<string[]>(input.tags);

        return { success: true };
      })
      .public();
  });

  it("should still accept plain Convex validators through WithZod", () => {
    convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .handler(async (_context, input) => {
        assertType<{ count: number }>(input);
        return { success: true };
      })
      .public();
  });

  it("should still accept v.object() validators through WithZod", () => {
    convex
      .query()
      .extend(WithZod)
      .input(v.object({ count: v.number() }))
      .handler(async (_context, input) => {
        assertType<{ count: number }>(input);
        return { success: true };
      })
      .public();
  });
});

describe("WithZod Returns Type Tests", () => {
  it("should accept Zod return validators", () => {
    convex
      .query()
      .extend(WithZod)
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
      .extend(WithZod)
      .input({ count: v.number() })
      .returns(z.number())
      .handler(async () => {
        return 42;
      })
      .public();
  });

  it("should enforce return type with Zod validator", () => {
    convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .returns(z.object({ numbers: z.array(z.number()) }))
      .handler(async () => {
        return { numbers: [1, 2, 3] };
      })
      .public();
  });

  it("should reject incorrect return type with Zod validator", () => {
    convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .returns(z.object({ numbers: z.array(z.number()) }))
      // @ts-expect-error Return type mismatch: handler returns { count: number } but .returns() expects { numbers: number[] }
      .handler(async () => {
        return { count: 5 };
      })
      .public();
  });

  it("should enforce primitive return types with Zod", () => {
    convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .returns(z.string())
      .handler(async () => {
        return "hello";
      })
      .public();
  });

  it("should reject wrong primitive return type with Zod", () => {
    convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .returns(z.string())
      // @ts-expect-error Return type mismatch: handler returns number but .returns() expects string
      .handler(async () => {
        return 42;
      })
      .public();
  });

  it("should still accept plain Convex return validators through WithZod", () => {
    convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .returns(v.object({ numbers: v.array(v.number()) }))
      .handler(async () => {
        return { numbers: [1, 2, 3] };
      })
      .public();
  });
});

describe("WithZod Callable Builder", () => {
  it("should work with Zod input validators", () => {
    const callableQuery = convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number() }))
      .handler(async (_context, input) => {
        return { count: input.count };
      });

    // Should be callable
    assertType<
      (
        context: any,
        args: { count: number }
      ) => Promise<{ count: number }>
    >(callableQuery);
  });
});

// What a client sees for a registered function, the same way Convex's
// generated `api` types read it.
// Flattened, because InferArgs builds an intersection that strict type
// equality doesn't see through.
type ClientArgs<F> =
  F extends RegisteredQuery<any, infer A, any> ? { [K in keyof A]: A[K] } : never;
type ClientReturns<F> =
  F extends RegisteredQuery<any, any, infer R> ? Awaited<R> : never;

describe("WithZod input vs output types", () => {
  it("makes .default() fields optional for the client but set in the handler", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ s: z.string().default("x"), n: z.number() }))
      .handler(async (_ctx, input) => {
        expectTypeOf(input).toEqualTypeOf<{ s: string; n: number }>();
        return null;
      })
      .public();

    expectTypeOf<ClientArgs<typeof fn>>().toMatchTypeOf<{
      s?: string | undefined;
      n: number;
    }>();
    // Leaving the defaulted field out is fine for the client.
    assertType<ClientArgs<typeof fn>>({ n: 1 });
  });

  it("types .transform() fields as the pre-transform type for the client", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ n: z.string().transform(Number) }))
      .handler(async (_ctx, input) => {
        expectTypeOf(input.n).toEqualTypeOf<number>();
        return null;
      })
      .public();

    assertType<ClientArgs<typeof fn>>({ n: "42" });
    // @ts-expect-error the client sends the string, not the parsed number
    assertType<ClientArgs<typeof fn>>({ n: 42 });
  });

  it("lets the handler return the pre-transform type and the client get the output", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .returns(z.string().transform((s) => s.length))
      .handler(async () => "hello")
      .public();

    expectTypeOf<ClientReturns<typeof fn>>().toEqualTypeOf<number>();

    convex
      .query()
      .extend(WithZod)
      .returns(z.string().transform((s) => s.length))
      // @ts-expect-error the handler returns the schema's input (a string)
      .handler(async () => 5);
  });

  it("types coerced and passthrough fields by what Convex will accept", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ n: z.coerce.number() }).passthrough())
      .handler(async () => null)
      .public();

    assertType<ClientArgs<typeof fn>>({ n: 1 });
    // @ts-expect-error the registered validator is v.number(), coercion runs later
    assertType<ClientArgs<typeof fn>>({ n: "1" });
    // @ts-expect-error only declared fields are registered
    assertType<ClientArgs<typeof fn>>({ n: 1, extra: true });
  });

  it("doesn't add undefined to the client's arg keys", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ n: z.number() }))
      .handler(async () => null)
      .public();

    type Raw = typeof fn extends RegisteredQuery<any, infer A, any> ? A : never;
    expectTypeOf<keyof Raw>().toEqualTypeOf<"n">();
  });

  it("lets a defaulted return come back undefined", () => {
    convex
      .query()
      .extend(WithZod)
      .returns(z.string().default("x"))
      .handler(async () => undefined);
  });

  it("keeps unknown handler return types from preprocess", () => {
    convex
      .query()
      .extend(WithZod)
      .returns(z.preprocess(Number, z.number()))
      .handler(async () => "42");
  });

  it("types direct calls by what the caller passes and gets back", () => {
    const f = convex
      .query()
      .extend(WithZod)
      .input(z.object({ n: z.string().transform(Number) }))
      .returns(z.string().transform((s) => s.length))
      .handler(async (_ctx, input) => String(input.n));

    expectTypeOf(f).returns.resolves.toEqualTypeOf<number>();
    // @ts-expect-error a direct call goes through Zod, so it takes the string
    void f({} as any, { n: 42 });
  });

  it("follows the registered validator for coerce, preprocess and nested fields", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          a: z.coerce.number(),
          b: z.coerce.number().transform(String),
          c: z.preprocess(Number, z.number()),
          d: z.object({ n: z.coerce.number() }).passthrough(),
          e: z.any(),
        })
      )
      .handler(async (_ctx, input) => {
        expectTypeOf(input.b).toEqualTypeOf<string>();
        return null;
      })
      .public();

    type A = ClientArgs<typeof fn>;
    expectTypeOf<A["a"]>().toEqualTypeOf<number>();
    expectTypeOf<A["b"]>().toEqualTypeOf<number>();
    assertType<A>({ a: 1, b: 2, c: "42", d: { n: 1 }, e: null });
    // @ts-expect-error coerce fields are required, as registered
    assertType<A>({ b: 2, c: 1, d: { n: 1 }, e: null });
    // @ts-expect-error nested coerce is a number in the registered validator
    assertType<A>({ a: 1, b: 2, c: 1, d: { n: "1" }, e: null });
  });

  it("looks inside records, tuples and wrappers like the converter does", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          rec: z.record(z.string(), z.string().transform(Number)),
          tup: z.tuple([z.string().transform(Number)]),
          caught: z.string().transform(Number).catch(0),
          ro: z.string().transform(Number).readonly(),
          lazy: z.lazy(() => z.string().transform(Number)),
          defThenTransform: z.string().default("1").transform(Number),
          optNullable: z.string().optional().nullable(),
        })
      )
      .handler(async () => null)
      .public();

    type A = ClientArgs<typeof fn>;
    const ok: A = {
      rec: { count: "42" },
      tup: ["1"],
      caught: "1",
      ro: "1",
      lazy: "1",
    };
    void ok;
    // @ts-expect-error record values are registered as the pre-transform string
    assertType<A>({ ...ok, rec: { count: 42 } });
    expectTypeOf<undefined extends A["defThenTransform"] ? true : false>().toEqualTypeOf<true>();
    expectTypeOf<undefined extends A["optNullable"] ? true : false>().toEqualTypeOf<true>();
  });

  it("doesn't let any in a transform bring back the raw handler signature", () => {
    const f = convex
      .query()
      .extend(WithZod)
      .returns(z.any().transform(() => 123))
      .handler(async () => "raw");

    expectTypeOf(f).returns.resolves.not.toEqualTypeOf<string>();
  });

  it("leaves plain Zod schemas the same on both sides", () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number() }))
      .returns(z.object({ total: z.number() }))
      .handler(async (_ctx, input) => {
        expectTypeOf(input).toEqualTypeOf<{ count: number }>();
        return { total: input.count };
      })
      .public();

    expectTypeOf<ClientArgs<typeof fn>>().toEqualTypeOf<{ count: number }>();
    expectTypeOf<ClientReturns<typeof fn>>().toEqualTypeOf<{ total: number }>();
  });
});
