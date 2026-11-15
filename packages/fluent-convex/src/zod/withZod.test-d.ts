import { describe, it, assertType } from "vitest";
import { v } from "convex/values";
import { z } from "zod/v4";
import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
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
