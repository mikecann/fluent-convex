import { describe, it, assertType } from "vitest";
import { v } from "convex/values";
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

describe("Function Types", () => {
  describe("creation", () => {
    it("should create queries", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async (context, input) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .public();
    });

    it("should create mutations", () => {
      convex
        .mutation()
        .input({ name: v.string() })
        .handler(async (context, input) => {
          assertType<string>(input.name);
          return { name: input.name };
        })
        .public();
    });

    it("should create actions", () => {
      convex
        .action()
        .input({ url: v.string() })
        .handler(async (context, input) => {
          assertType<string>(input.url);
          return { url: input.url };
        })
        .public();
    });

    it("should create internal queries", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async (context, input) => {
          assertType<string>(input.id);
          return { id: input.id };
        })
        .internal();
    });

    it("should create internal mutations", () => {
      convex
        .mutation()
        .input({ value: v.number() })
        .handler(async (context, input) => {
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
        .handler(async (context, input) => {
          assertType<string>(input.url);
          return { url: input.url };
        })
        .internal();
    });
  });

  describe("context types per function", () => {
    it("queries should have db and auth", () => {
      convex
        .query()
        .input({ id: v.string() })
        .handler(async (context) => {
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
        .handler(async (context) => {
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
        .handler(async (context) => {
          assertType(context.auth);
          assertType(context.scheduler);
          return { success: true };
        })
        .public();
    });
  });
});
