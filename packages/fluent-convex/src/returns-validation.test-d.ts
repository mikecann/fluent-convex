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

describe("Returns Validation", () => {
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
      .handler(async (context, input) => {
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
