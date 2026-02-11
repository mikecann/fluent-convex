import { describe, it, expect, vi } from "vitest";
import {
  defineSchema,
  defineTable,
  DataModelFromSchemaDefinition,
  GenericDataModel,
} from "convex/server";
import { v } from "convex/values";
import { createBuilder } from "./builder";
import { ConvexBuilderWithFunctionKind } from "./ConvexBuilderWithFunctionKind";
import {
  Context,
  EmptyObject,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  FunctionType,
} from "./types";

// Define a minimal schema and builder for testing
const schema = defineSchema({
  test: defineTable({
    value: v.string(),
  }),
});

const convex = createBuilder<DataModelFromSchemaDefinition<typeof schema>>();

// Define an extended builder class
class MyExtendedBuilder<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
> extends ConvexBuilderWithFunctionKind<
  TDataModel,
  TFunctionType,
  TCurrentContext,
  TArgsValidator,
  TReturnsValidator
> {
  constructor(
    builder: ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >
  ) {
    super((builder as any).def);
  }

  // A custom method that sets input and a handler
  withLog(prefix: string) {
    return (
      this.input(v.object({ message: v.string() }))
        // Explicitly set returns to avoid type error
        .returns(v.string())
        .handler(async (ctx, args) => {
          return `${prefix}: ${args.message}`;
        })
    );
  }

  // A custom method that modifies the builder state and RE-WRAPS it
  withDefaultInput() {
    const next = this.input(v.object({ defaultField: v.string() }));
    // Re-wrap to maintain the extended class if we want to chain further custom methods
    // Note: standard methods like .handler() will still return their standard types
    return new MyExtendedBuilder(next);
  }
}

describe("extend() robustness", () => {
  it("should not double-execute a factory that throws a TypeError mentioning 'Class constructor'", () => {
    // A factory function that has a bug: it tries to call a class without `new`
    // internally. This throws a TypeError whose message contains "Class constructor".
    // The current try-catch approach catches the TypeError, sees "Class constructor"
    // in the message, and incorrectly retries the factory as a constructor with `new`,
    // causing the factory body (and its side effects) to run a second time.
    let sideEffectCount = 0;

    class InternalHelper {}

    function factoryWithInternalClassBug(builder: any) {
      sideEffectCount++;
      // Bug: forgot `new` — throws "Class constructor InternalHelper cannot be invoked without 'new'"
      return (InternalHelper as any)();
    }

    expect(() => {
      convex.query().extend(factoryWithInternalClassBug);
    }).toThrow(TypeError);

    // The factory should have run exactly once, not twice
    expect(sideEffectCount).toBe(1);
  });

  it("should detect classes without relying on error message strings", () => {
    // If we're on an engine that formats the TypeError differently
    // (e.g. not containing "Class constructor"), the current approach
    // would re-throw instead of retrying with `new`, breaking class extension.
    // The fix should detect classes upfront via static inspection.
    class SimpleExtension extends ConvexBuilderWithFunctionKind {
      constructor(builder: any) {
        super((builder as any).def);
      }
      customMethod() {
        return "works";
      }
    }

    // This works on V8 today, but the test documents the requirement:
    // class detection should not depend on catching + inspecting error messages.
    const extended = convex.query().extend(SimpleExtension);
    expect(extended).toBeInstanceOf(SimpleExtension);
    expect(extended.customMethod()).toBe("works");
  });

  it("should work with a factory function that returns a non-class object", () => {
    const result = convex.query().extend((builder) => {
      return { custom: true, builder };
    });

    expect(result.custom).toBe(true);
    expect(result.builder).toBeDefined();
  });
});

describe("Extensibility", () => {
  it("should allow extending the builder with a custom class using constructor reference", async () => {
    const extended = convex.query().extend(MyExtendedBuilder);

    expect(extended).toBeInstanceOf(MyExtendedBuilder);
    expect(extended).toBeInstanceOf(ConvexBuilderWithFunctionKind);
  });

  it("should allow extending the builder with a custom class", async () => {
    const extended = convex
      .query()
      .extend((builder) => new MyExtendedBuilder(builder));

    expect(extended).toBeInstanceOf(MyExtendedBuilder);
    expect(extended).toBeInstanceOf(ConvexBuilderWithFunctionKind);
  });

  it("should allow calling custom methods on the extended builder", async () => {
    const extended = convex
      .query()
      .extend((builder) => new MyExtendedBuilder(builder));

    // Use the custom method
    const handlerBuilder = extended.withLog("LOG");

    console.log("Type of handlerBuilder:", typeof handlerBuilder);
    console.log("Is callable?", typeof handlerBuilder === "function");
    console.log("Keys:", Object.keys(handlerBuilder));

    // The result should be callable
    const result = await handlerBuilder({} as any)({ message: "hello" });
    expect(result).toBe("LOG: hello");
  });

  it("should preserve standard methods on the extended builder", async () => {
    const extended = convex
      .query()
      .extend((builder) => new MyExtendedBuilder(builder));

    // Call a custom method that returns the extended builder, then a standard one
    const chained = extended.withDefaultInput().handler(async (ctx, args) => {
      return args.defaultField;
    });

    const result = await chained({} as any)({ defaultField: "test" });
    expect(result).toBe("test");
  });

  it("should allow method chaining with inherited methods", async () => {
    const extended = convex
      .query()
      .extend((builder) => new MyExtendedBuilder(builder));

    const middleware = convex.query().createMiddleware(async (ctx, next) => {
      return next({ ...ctx, extra: "data" });
    });

    // Note: .use() returns the BASE class, so we can't chain .withDefaultInput() AFTER .use()
    // unless we re-extend or override .use().
    // For this test, we'll call the custom method first, or re-wrap.

    const chained = extended
      // Call custom method first (returns Extended)
      .withDefaultInput()
      // Then call standard method (returns Base)
      .use(middleware)
      .handler(async (ctx: any, args) => {
        return `${args.defaultField}-${ctx.extra}`;
      });

    const result = await chained({} as any)({ defaultField: "value" });
    expect(result).toBe("value-data");
  });
});
