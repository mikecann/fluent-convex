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

describe("Input Validation", () => {
  it("should accept plain Convex PropertyValidators", () => {
    convex
      .query()
      .input({ count: v.number() })
      .handler(async (context, input) => {
        assertType<{ count: number }>(input);
        return { success: true };
      })
      .public();
  });

  it("should accept Convex v.object() validators", () => {
    convex
      .query()
      .input(v.object({ count: v.number() }))
      .handler(async (context, input) => {
        assertType<{ count: number }>(input);
        return { success: true };
      })
      .public();
  });

  it("should accept Zod object schemas", () => {
    convex
      .query()
      .input(z.object({ count: z.number() }))
      .handler(async (context, input) => {
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
      .handler(async (context, input) => {
        assertType<{ count: number }>(input);
        return { success: true };
      })
      .public();
  });

  describe("optional input", () => {
    it("should work without input validation", () => {
      convex
        .query()
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
          assertType<string>(input.required);
          assertType<string | undefined>(input.optional);
          assertType<number | undefined>(input.defaulted);
          return { success: true };
        })
        .public();
    });
  });
});
