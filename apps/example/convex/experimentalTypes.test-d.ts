import { describe, it, expectTypeOf } from "vitest";
import type {
  FunctionReference,
  FilterApi,
  RegisteredQuery,
  RegisteredMutation,
  RegisteredAction,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";

// Base types
type TArgs = { count: number };
type THandlerReturn = { numbers: number[] };
type TContext = GenericQueryCtx<any>;
type TDataModel = GenericDataModel;
type FunctionType = "query" | "mutation" | "action";

// Simulate InferredArgs helper (like in builder)
type InferredArgs<T extends TArgs | undefined> = T extends TArgs ? T : {};

describe("FilterApi with intersection types", () => {
  it("should work with direct intersection types", () => {
    // This type works - it's a direct intersection, not from a conditional type
    type TestQuery = RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
      ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>);

    type TestApi = {
      myFunction: TestQuery;
    };

    // Filter for public functions - THIS WORKS
    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;

    // This should exist and not be never/undefined
    type MyFunctionShouldExist = Filtered["myFunction"];

    // Test that it works - the function should exist in the filtered API
    expectTypeOf<MyFunctionShouldExist>().not.toBeNever();
    expectTypeOf<MyFunctionShouldExist>().not.toBeUndefined();
  });

  it("should work with simple conditional types", () => {
    // Simple conditional type - this might work
    type ConditionalQuery<T extends "query" | "mutation"> = T extends "query"
      ? RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
          ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>)
      : never;

    type ConditionalApi = {
      myFunction: ConditionalQuery<"query">;
    };

    type FilteredConditional = FilterApi<
      ConditionalApi,
      FunctionReference<any, "public">
    >;

    type MyFunction = FilteredConditional["myFunction"];
    // This might actually work - let's see
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with generic type parameters like the builder", () => {
    // Simulate the builder's generic parameters
    type BuilderReturn<
      TFunctionType extends FunctionType,
      TArgsValidator extends TArgs | undefined,
      THandlerReturn,
    > = TFunctionType extends "query"
      ? RegisteredQuery<
          "public",
          InferredArgs<TArgsValidator>,
          Promise<THandlerReturn>
        > &
          ((
            context: TContext,
          ) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>)
      : TFunctionType extends "mutation"
        ? RegisteredMutation<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          > &
            ((
              context: TContext,
            ) => (
              args: InferredArgs<TArgsValidator>,
            ) => Promise<THandlerReturn>)
        : TFunctionType extends "action"
          ? RegisteredAction<
              "public",
              InferredArgs<TArgsValidator>,
              Promise<THandlerReturn>
            > &
              ((
                context: TContext,
              ) => (
                args: InferredArgs<TArgsValidator>,
              ) => Promise<THandlerReturn>)
          : never;

    type TestApi = {
      myFunction: BuilderReturn<"query", TArgs, THandlerReturn>;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // Does this work or fail?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with a class method return type", () => {
    // Simulate a class with a method that returns the conditional type
    class TestBuilder<
      TDataModel extends GenericDataModel,
      TFunctionType extends FunctionType,
      TArgsValidator extends TArgs | undefined,
      THandlerReturn,
    > {
      public(): TFunctionType extends "query"
        ? RegisteredQuery<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          > &
            ((
              context: TContext,
            ) => (
              args: InferredArgs<TArgsValidator>,
            ) => Promise<THandlerReturn>)
        : TFunctionType extends "mutation"
          ? RegisteredMutation<
              "public",
              InferredArgs<TArgsValidator>,
              Promise<THandlerReturn>
            > &
              ((
                context: TContext,
              ) => (
                args: InferredArgs<TArgsValidator>,
              ) => Promise<THandlerReturn>)
          : TFunctionType extends "action"
            ? RegisteredAction<
                "public",
                InferredArgs<TArgsValidator>,
                Promise<THandlerReturn>
              > &
                ((
                  context: TContext,
                ) => (
                  args: InferredArgs<TArgsValidator>,
                ) => Promise<THandlerReturn>)
            : never {
        return null as any;
      }
    }

    const builder = new TestBuilder<
      TDataModel,
      "query",
      TArgs,
      THandlerReturn
    >();
    const result = builder.public();

    type TestApi = {
      myFunction: typeof result;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // Does FilterApi work when the type comes from a class method?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with InferredArgs complexity", () => {
    // Test if InferredArgs being conditional causes issues
    type ComplexReturn<T extends TArgs | undefined> = RegisteredQuery<
      "public",
      InferredArgs<T>,
      Promise<THandlerReturn>
    > &
      ((
        context: TContext,
      ) => (args: InferredArgs<T>) => Promise<THandlerReturn>);

    type TestApi = {
      myFunction: ComplexReturn<TArgs>;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test the exact builder return type structure", () => {
    // This is the EXACT structure from the builder's public() method
    type ExactBuilderReturn<
      TFunctionType extends FunctionType,
      TArgsValidator extends TArgs | undefined,
      THandlerReturn,
    > = TFunctionType extends "query"
      ? RegisteredQuery<
          "public",
          InferredArgs<TArgsValidator>,
          Promise<THandlerReturn>
        > &
          ((
            context: TContext,
          ) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>)
      : TFunctionType extends "mutation"
        ? RegisteredMutation<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          > &
            ((
              context: TContext,
            ) => (
              args: InferredArgs<TArgsValidator>,
            ) => Promise<THandlerReturn>)
        : TFunctionType extends "action"
          ? RegisteredAction<
              "public",
              InferredArgs<TArgsValidator>,
              Promise<THandlerReturn>
            > &
              ((
                context: TContext,
              ) => (
                args: InferredArgs<TArgsValidator>,
              ) => Promise<THandlerReturn>)
          : never;

    type TestApi = {
      myFunction: ExactBuilderReturn<"query", TArgs, THandlerReturn>;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // This is the key test - does FilterApi work with the exact builder structure?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with ApiFromModules simulation", () => {
    // Maybe the issue is with how ApiFromModules processes the types?
    // Let's simulate what happens when modules are imported
    type ModuleExports = {
      myFunction: "query" extends "query"
        ? RegisteredQuery<
            "public",
            InferredArgs<TArgs>,
            Promise<THandlerReturn>
          > &
            ((
              context: TContext,
            ) => (args: InferredArgs<TArgs>) => Promise<THandlerReturn>)
        : never;
    };

    // Simulate ApiFromModules - it would create an object with module names as keys
    type ApiFromModules<T extends Record<string, any>> = {
      [K in keyof T]: T[K];
    };

    type FullApi = ApiFromModules<{
      testModule: ModuleExports;
    }>;

    // Now filter it like Convex does
    type Filtered = FilterApi<FullApi, FunctionReference<any, "public">>;
    type TestModule = Filtered["testModule"];
    type MyFunction = TestModule extends { myFunction: infer F } ? F : never;

    // Does this work when going through ApiFromModules?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with unresolved conditional in object property", () => {
    // What if the conditional type is not yet resolved when FilterApi checks it?
    // Test with a type that stays conditional
    type UnresolvedConditional<T extends FunctionType> = T extends "query"
      ? RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
          ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>)
      : never;

    // The type is still conditional here - T is not yet resolved
    type TestApi<T extends FunctionType> = {
      myFunction: UnresolvedConditional<T>;
    };

    // Try to filter before resolving T
    type Filtered<T extends FunctionType> = FilterApi<
      TestApi<T>,
      FunctionReference<any, "public">
    >;

    // Now resolve T
    type Resolved = Filtered<"query">;
    type MyFunction = Resolved["myFunction"];

    // Does FilterApi work with unresolved conditionals?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test intersection type that doesn't directly extend FunctionReference", () => {
    // What if the intersection type itself doesn't extend FunctionReference?
    // Only RegisteredQuery does, but the intersection might not?
    type IntersectionType = RegisteredQuery<
      "public",
      TArgs,
      Promise<THandlerReturn>
    > &
      ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>);

    // Check if the intersection extends FunctionReference
    type _ExtendsFR =
      IntersectionType extends FunctionReference<any, "public"> ? true : false;

    // If it doesn't extend FunctionReference, that could be the issue!
    type TestApi = {
      myFunction: IntersectionType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // This should work if intersection types properly extend FunctionReference
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with actual const value and typeof", () => {
    // Maybe the issue is when you have an actual const value that's typed as the intersection?
    // When you export a const, Convex sees typeof thatConst
    const myFunction: RegisteredQuery<
      "public",
      TArgs,
      Promise<THandlerReturn>
    > &
      ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>) =
      null as any;

    // This is what Convex sees - typeof the exported const
    type TestApi = {
      myFunction: typeof myFunction;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // Does FilterApi work with typeof a const that has intersection type?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with conditional return type from a function that uses 'as any'", () => {
    // The builder returns `as any` - maybe that affects type inference?
    function getFunction<T extends FunctionType>(
      _type: T,
    ): T extends "query"
      ? RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
          ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>)
      : never {
      return null as any;
    }

    const result = getFunction("query" as const);
    type ResultType = typeof result;

    type TestApi = {
      myFunction: ResultType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // Does the 'as any' cast affect FilterApi's ability to see the type?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with method return type inferred from class instance", () => {
    // Test what happens when you get the type from a method on a class instance
    class Builder {
      public<T extends FunctionType>(
        _type: T,
      ): T extends "query"
        ? RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
            ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>)
        : never {
        return null as any;
      }
    }

    const builder = new Builder();
    const result = builder.public("query" as const);
    type ResultType = typeof result;

    type TestApi = {
      myFunction: ResultType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // Does FilterApi work when the type comes from a method call?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test with typeof on exported const from conditional method", () => {
    // The key difference: Convex uses `typeof callableFunctions` which gets the module type
    // Let's simulate what happens when you export a const from a builder method

    class TestBuilder<TFunctionType extends FunctionType> {
      public(): TFunctionType extends "query"
        ? RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
            ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>)
        : never {
        return null as any;
      }
    }

    // This simulates: export const myFunction = builder.public()
    const builder = new TestBuilder<"query">();
    const myFunction = builder.public();

    // This is what Convex sees: typeof myFunction
    type ExportedFunctionType = typeof myFunction;

    // Now test with ApiFromModules simulation
    type ModuleExports = {
      myFunction: typeof myFunction;
    };

    // Simulate ApiFromModules - it processes the module
    type ApiFromModules<T extends Record<string, any>> = {
      [K in keyof T]: T[K];
    };

    type FullApi = ApiFromModules<{
      testModule: ModuleExports;
    }>;

    // Now filter it
    type Filtered = FilterApi<FullApi, FunctionReference<any, "public">>;
    type TestModule = Filtered["testModule"];
    type MyFunction = TestModule extends { myFunction: infer F } ? F : never;

    // Does this work when going through ApiFromModules with typeof?
    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should test the exact scenario - conditional return type exported as const", () => {
    // Simulate the exact builder scenario with all the generics
    class ExactBuilder<
      TDataModel extends GenericDataModel,
      TFunctionType extends FunctionType,
      TArgsValidator extends TArgs | undefined,
      THandlerReturn,
    > {
      public(): TFunctionType extends "query"
        ? RegisteredQuery<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          > &
            ((
              context: TContext,
            ) => (
              args: InferredArgs<TArgsValidator>,
            ) => Promise<THandlerReturn>)
        : never {
        return null as any;
      }
    }

    // Simulate exporting a const - this is what Convex sees
    const builder = new ExactBuilder<
      TDataModel,
      "query",
      TArgs,
      THandlerReturn
    >();
    const exportedFunction = builder.public();

    // Convex processes: typeof exportedFunction (from the module)
    // Simulate what ApiFromModules sees: typeof callableFunctions
    type ModuleType = {
      exportedFunction: typeof exportedFunction;
    };

    type FullApi = {
      testModule: ModuleType;
    };

    type Filtered = FilterApi<FullApi, FunctionReference<any, "public">>;
    type TestModule = Filtered["testModule"];
    type ExportedFunc = TestModule extends { exportedFunction: infer F }
      ? F
      : never;

    // This is the real test - does it work with the exact builder scenario?
    expectTypeOf<ExportedFunc>().not.toBeNever();
  });

  it("should document findings - FilterApi works with intersection types", () => {
    // KEY FINDING: All tests pass, which means FilterApi DOES work with intersection types!
    // This contradicts the initial hypothesis that intersection types break FunctionReference extension.

    // What we've proven:
    // 1. FilterApi works with direct intersection types ✓
    // 2. FilterApi works with conditional types that evaluate to intersections ✓
    // 3. FilterApi works with typeof on exported consts ✓
    // 4. FilterApi works through ApiFromModules simulation ✓
    // 5. FilterApi works with class method return types ✓

    // So if FilterApi works in all these scenarios, why doesn't it work in the actual builder?
    // The issue must be something else:
    // - Maybe the actual runtime value from _register() doesn't match the type signature?
    // - Maybe there's something about the full builder chain (query().input().handler().public())?
    // - Maybe Convex's actual ApiFromModules does something different than our simulation?
    // - Maybe the issue only manifests with the actual Convex registration functions?

    // Next steps: Investigate the actual builder implementation and runtime behavior
    expectTypeOf<true>().toEqualTypeOf<true>();
  });

  it("should test the actual issue scenario - check if property exists", () => {
    // Maybe the issue is that FilterApi returns {} (empty object) instead of never?
    // Let's check if the property exists in the filtered result
    type TestQuery = RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
      ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>);

    type TestApi = {
      myFunction: TestQuery;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;

    // Check if the property exists
    type HasProperty = "myFunction" extends keyof Filtered ? true : false;
    const _hasProp: HasProperty = true;

    // Check what the property type is
    type MyFunction = Filtered["myFunction"];

    // If FilterApi works, MyFunction should exist and not be never
    // If FilterApi doesn't work, either:
    // 1. HasProperty would be false, OR
    // 2. MyFunction would be never
    expectTypeOf<MyFunction>().not.toBeNever();

    // Also verify the property exists
    type _VerifyProperty = keyof Filtered extends "myFunction" ? true : false;
    const _verify: _VerifyProperty = true;
  });
});
