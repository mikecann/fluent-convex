import { describe, it, expectTypeOf } from "vitest";
import type {
  FunctionReference,
  FilterApi,
  RegisteredQuery,
  RegisteredMutation,
  RegisteredAction,
  GenericQueryCtx,
  GenericDataModel,
  ApiFromModules,
} from "convex/server";
import type { PropertyValidators, GenericValidator } from "convex/values";

// ============================================================================
// TYPES - Copy from builder/types
// ============================================================================

type Context = object;
type ConvexArgsValidator = PropertyValidators | GenericValidator;
type ConvexReturnsValidator = GenericValidator;
type EmptyObject = Record<never, never>;
type FunctionType = "query" | "mutation" | "action";
type Visibility = "public" | "internal";

type ValidatorType<T> = T extends GenericValidator ? T["type"] : never;

type OptionalKeys<T extends Record<PropertyKey, any>> = {
  [K in keyof T]: T[K] extends GenericValidator
    ? T[K]["isOptional"] extends "optional"
      ? K
      : never
    : never;
}[keyof T];

type RequiredKeys<T extends Record<PropertyKey, any>> = {
  [K in keyof T]: T[K] extends GenericValidator
    ? T[K]["isOptional"] extends "optional"
      ? never
      : K
    : never;
}[keyof T];

type OptionalArgs<T extends Record<PropertyKey, any>> = {
  [K in OptionalKeys<T>]?: T[K] extends GenericValidator
    ? ValidatorType<T[K]> | undefined
    : never;
};

type RequiredArgs<T extends Record<PropertyKey, any>> = {
  [K in RequiredKeys<T>]: ValidatorType<T[K]>;
};

type InferArgs<T extends ConvexArgsValidator> = T extends GenericValidator
  ? T["type"]
  : RequiredArgs<T> & OptionalArgs<T>;

type InferReturns<T extends ConvexReturnsValidator> = ValidatorType<T>;

type InferredArgs<T extends ConvexArgsValidator | undefined> =
  T extends ConvexArgsValidator ? InferArgs<T> : EmptyObject;

type QueryCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericQueryCtx<DataModel>;

// ============================================================================
// TEST TYPES
// ============================================================================

// Use a simple type for args - we'll use InferredArgs with undefined to get EmptyObject
// or we can just use EmptyObject directly for testing
type TArgs = EmptyObject; // Simplified for testing - actual args don't matter for FilterApi
type THandlerReturn = { numbers: number[] };
type TContext = GenericQueryCtx<any>;
type TDataModel = GenericDataModel;

// ============================================================================
// BUILDER CLASSES - Simplified version from builder.ts
// ============================================================================

interface ConvexBuilderDef<
  TFunctionType extends FunctionType | undefined,
  TArgsValidator extends ConvexArgsValidator | undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined,
  TVisibility extends Visibility,
> {
  functionType?: TFunctionType;
  argsValidator?: TArgsValidator;
  returnsValidator?: TReturnsValidator;
  visibility: TVisibility;
  handler?: (context: Context, input: any) => Promise<any>;
}

export class TestBuilderWithHandler<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType | undefined = undefined,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
  TVisibility extends Visibility = "public",
  THandlerReturn = any,
> {
  private def: ConvexBuilderDef<
    TFunctionType,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  >;

  constructor(
    def: ConvexBuilderDef<
      TFunctionType,
      TArgsValidator,
      TReturnsValidator,
      TVisibility
    >,
  ) {
    this.def = def;
  }

  // VERSION 1: WITHOUT intersection (current working version)
  publicWithoutIntersection(): TFunctionType extends "query"
    ? RegisteredQuery<
        "public",
        InferredArgs<TArgsValidator>,
        Promise<THandlerReturn>
      >
    : TFunctionType extends "mutation"
      ? RegisteredMutation<
          "public",
          InferredArgs<TArgsValidator>,
          Promise<THandlerReturn>
        >
      : TFunctionType extends "action"
        ? RegisteredAction<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          >
        : never {
    return null as any;
  }

  // VERSION 2: WITH intersection (what user wants to add)
  publicWithIntersection(): TFunctionType extends "query"
    ? RegisteredQuery<
        "public",
        InferredArgs<TArgsValidator>,
        Promise<THandlerReturn>
      > &
        ((
          context: TCurrentContext,
        ) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>)
    : TFunctionType extends "mutation"
      ? RegisteredMutation<
          "public",
          InferredArgs<TArgsValidator>,
          Promise<THandlerReturn>
        > &
          ((
            context: TCurrentContext,
          ) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>)
      : TFunctionType extends "action"
        ? RegisteredAction<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          > &
            ((
              context: TCurrentContext,
            ) => (
              args: InferredArgs<TArgsValidator>,
            ) => Promise<THandlerReturn>)
        : never {
    return null as any;
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe("Investigation: Why intersection type breaks FilterApi", () => {
  it("CRITICAL: Does intersection type extend FunctionReference?", () => {
    // This is the ROOT CAUSE test
    // If intersection types don't extend FunctionReference, FilterApi will filter them out

    type WithoutIntersection = RegisteredQuery<
      "public",
      EmptyObject,
      Promise<THandlerReturn>
    >;

    type WithIntersection = RegisteredQuery<
      "public",
      EmptyObject,
      Promise<THandlerReturn>
    > &
      ((context: TContext) => (args: EmptyObject) => Promise<THandlerReturn>);

    // Test WITHOUT intersection - check if RegisteredQuery extends FunctionReference
    // Note: RegisteredQuery might not directly extend FunctionReference, but FilterApi
    // might check for it differently (e.g., structural matching)
    type ExtendsFR_Without =
      WithoutIntersection extends FunctionReference<any, "public">
        ? true
        : false;
    // This might be false - RegisteredQuery might be a branded type
    // But FilterApi still works with it, so it must check differently
    expectTypeOf<ExtendsFR_Without>().toMatchTypeOf<true | false>();

    // Test WITH intersection - THIS IS THE KEY TEST
    type ExtendsFR_With =
      WithIntersection extends FunctionReference<any, "public"> ? true : false;

    // If this is false, that's why FilterApi filters it out!
    // Intersection types don't extend FunctionReference because TypeScript
    // requires ALL members of an intersection to extend the type
    // The function type (context) => (args) => Promise doesn't extend FunctionReference
    expectTypeOf<ExtendsFR_With>().toMatchTypeOf<true | false>();

    // KEY INSIGHT: Even if RegisteredQuery doesn't extend FunctionReference directly,
    // FilterApi must use structural matching. But intersection types break that matching!

    // Test what FilterApi actually does:
    type ApiWithout = { func: WithoutIntersection };
    type ApiWith = { func: WithIntersection };

    type FilteredWithout = FilterApi<
      ApiWithout,
      FunctionReference<any, "public">
    >;
    type FilteredWith = FilterApi<ApiWith, FunctionReference<any, "public">>;

    // Check if func exists in filtered results
    type FuncWithout = FilteredWithout["func"];
    type FuncWith = FilteredWith["func"];

    // Without intersection should work
    expectTypeOf<FuncWithout>().not.toBeNever();

    // With intersection - this is the real test!
    // If this is never, that confirms intersection breaks FilterApi
    expectTypeOf<FuncWith>().toMatchTypeOf<never | any>();
  });

  it("should test WITHOUT intersection - baseline", () => {
    const builder = new TestBuilderWithHandler<
      TDataModel,
      "query",
      TContext,
      undefined, // Use undefined to get EmptyObject from InferredArgs
      undefined,
      "public",
      THandlerReturn
    >({
      functionType: "query",
      visibility: "public",
    });

    const result = builder.publicWithoutIntersection();
    type ResultType = typeof result;

    // Check if it extends FunctionReference
    // Note: RegisteredQuery might not directly extend FunctionReference (branded type),
    // but FilterApi still works with it via structural matching
    type ExtendsFR =
      ResultType extends FunctionReference<any, "public"> ? true : false;
    // This might be false - that's okay, FilterApi uses structural matching
    expectTypeOf<ExtendsFR>().toMatchTypeOf<true | false>();

    // Test with FilterApi
    type TestApi = {
      myFunction: ResultType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // This should work
    expectTypeOf<MyFunction>().not.toBeNever();
    expectTypeOf<
      "myFunction" extends keyof Filtered ? true : false
    >().toEqualTypeOf<true>();
  });

  it("should test WITH intersection - the failing case", () => {
    const builder = new TestBuilderWithHandler<
      TDataModel,
      "query",
      TContext,
      undefined, // Use undefined to get EmptyObject from InferredArgs
      undefined,
      "public",
      THandlerReturn
    >({
      functionType: "query",
      visibility: "public",
    });

    const result = builder.publicWithIntersection();
    type ResultType = typeof result;

    // Check if it extends FunctionReference - THIS IS THE KEY TEST
    type ExtendsFR =
      ResultType extends FunctionReference<any, "public"> ? true : false;
    // This might be FALSE - intersection types might not extend FunctionReference!
    // Let's see what it actually is
    expectTypeOf<ExtendsFR>().toMatchTypeOf<true | false>();

    // Test with FilterApi
    type TestApi = {
      myFunction: ResultType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    // Does this fail?
    expectTypeOf<MyFunction>().not.toBeNever();
    expectTypeOf<
      "myFunction" extends keyof Filtered ? true : false
    >().toEqualTypeOf<true>();
  });

  it("should investigate: does intersection type itself extend FunctionReference?", () => {
    // Create the exact intersection type
    type IntersectionType = RegisteredQuery<
      "public",
      EmptyObject,
      Promise<THandlerReturn>
    > &
      ((context: TContext) => (args: EmptyObject) => Promise<THandlerReturn>);

    // Check if intersection extends FunctionReference - THIS IS THE KEY TEST
    type ExtendsFR =
      IntersectionType extends FunctionReference<any, "public"> ? true : false;
    // This is the critical test - does intersection extend FunctionReference?
    expectTypeOf<ExtendsFR>().toMatchTypeOf<true | false>();

    // Test with FilterApi
    type TestApi = {
      myFunction: IntersectionType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does conditional intersection extend FunctionReference?", () => {
    // Test with conditional type that evaluates to intersection
    type ConditionalIntersection<T extends "query" | "mutation"> =
      T extends "query"
        ? RegisteredQuery<"public", EmptyObject, Promise<THandlerReturn>> &
            ((
              context: TContext,
            ) => (args: EmptyObject) => Promise<THandlerReturn>)
        : RegisteredMutation<"public", EmptyObject, Promise<THandlerReturn>> &
            ((
              context: TContext,
            ) => (args: EmptyObject) => Promise<THandlerReturn>);

    type Resolved = ConditionalIntersection<"query">;

    // Check if conditional intersection extends FunctionReference
    type ExtendsFR =
      Resolved extends FunctionReference<any, "public"> ? true : false;
    expectTypeOf<ExtendsFR>().toMatchTypeOf<true | false>();

    // Test with FilterApi
    type TestApi = {
      myFunction: Resolved;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does unresolved conditional intersection work?", () => {
    // Test with unresolved conditional
    type ConditionalIntersection<T extends "query" | "mutation"> =
      T extends "query"
        ? RegisteredQuery<"public", EmptyObject, Promise<THandlerReturn>> &
            ((
              context: TContext,
            ) => (args: EmptyObject) => Promise<THandlerReturn>)
        : RegisteredMutation<"public", EmptyObject, Promise<THandlerReturn>> &
            ((
              context: TContext,
            ) => (args: EmptyObject) => Promise<THandlerReturn>);

    type TestApi<T extends "query" | "mutation"> = {
      myFunction: ConditionalIntersection<T>;
    };

    type Filtered<T extends "query" | "mutation"> = FilterApi<
      TestApi<T>,
      FunctionReference<any, "public">
    >;

    // Resolve after filtering
    type Resolved = Filtered<"query">;
    type MyFunction = Resolved["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: is InferredArgs the problem?", () => {
    // Test with InferredArgs in the intersection
    type WithInferredArgs = RegisteredQuery<
      "public",
      InferredArgs<undefined>,
      Promise<THandlerReturn>
    > &
      ((
        context: TContext,
      ) => (args: InferredArgs<undefined>) => Promise<THandlerReturn>);

    type TestApi = {
      myFunction: WithInferredArgs;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does generic InferredArgs break it?", () => {
    // Test with generic InferredArgs
    type GenericIntersection<
      TArgsValidator extends ConvexArgsValidator | undefined,
    > = RegisteredQuery<
      "public",
      InferredArgs<TArgsValidator>,
      Promise<THandlerReturn>
    > &
      ((
        context: TContext,
      ) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>);

    type Resolved = GenericIntersection<undefined>;

    type TestApi = {
      myFunction: Resolved;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does unresolved generic InferredArgs break it?", () => {
    // Test with unresolved generic
    type GenericIntersection<
      TArgsValidator extends ConvexArgsValidator | undefined,
    > = RegisteredQuery<
      "public",
      InferredArgs<TArgsValidator>,
      Promise<THandlerReturn>
    > &
      ((
        context: TContext,
      ) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>);

    type TestApi<TArgsValidator extends ConvexArgsValidator | undefined> = {
      myFunction: GenericIntersection<TArgsValidator>;
    };

    type Filtered<TArgsValidator extends ConvexArgsValidator | undefined> =
      FilterApi<TestApi<TArgsValidator>, FunctionReference<any, "public">>;

    type Resolved = Filtered<undefined>;
    type MyFunction = Resolved["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does TCurrentContext generic break it?", () => {
    // Test with TCurrentContext in the intersection
    type WithContextGeneric<TCurrentContext extends Context> = RegisteredQuery<
      "public",
      TArgs,
      Promise<THandlerReturn>
    > &
      ((context: TCurrentContext) => (args: TArgs) => Promise<THandlerReturn>);

    type Resolved = WithContextGeneric<TContext>;

    type TestApi = {
      myFunction: Resolved;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does unresolved TCurrentContext break it?", () => {
    // Test with unresolved TCurrentContext
    type WithContextGeneric<TCurrentContext extends Context> = RegisteredQuery<
      "public",
      TArgs,
      Promise<THandlerReturn>
    > &
      ((context: TCurrentContext) => (args: TArgs) => Promise<THandlerReturn>);

    type TestApi<TCurrentContext extends Context> = {
      myFunction: WithContextGeneric<TCurrentContext>;
    };

    type Filtered<TCurrentContext extends Context> = FilterApi<
      TestApi<TCurrentContext>,
      FunctionReference<any, "public">
    >;

    type Resolved = Filtered<TContext>;
    type MyFunction = Resolved["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does the full conditional with all generics break it?", () => {
    // This is the EXACT structure from the builder
    type FullConditional<
      TFunctionType extends FunctionType,
      TCurrentContext extends Context,
      TArgsValidator extends ConvexArgsValidator | undefined,
    > = TFunctionType extends "query"
      ? RegisteredQuery<
          "public",
          InferredArgs<TArgsValidator>,
          Promise<THandlerReturn>
        > &
          ((
            context: TCurrentContext,
          ) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>)
      : TFunctionType extends "mutation"
        ? RegisteredMutation<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          > &
            ((
              context: TCurrentContext,
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
                context: TCurrentContext,
              ) => (
                args: InferredArgs<TArgsValidator>,
              ) => Promise<THandlerReturn>)
          : never;

    type Resolved = FullConditional<"query", TContext, undefined>;

    type TestApi = {
      myFunction: Resolved;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: does typeof on method return break it?", () => {
    const builder = new TestBuilderWithHandler<
      TDataModel,
      "query",
      TContext,
      undefined,
      undefined,
      "public",
      THandlerReturn
    >({
      functionType: "query",
      visibility: "public",
    });

    const result = builder.publicWithIntersection();
    type ResultType = typeof result;

    // First check: does the intersection type extend FunctionReference?
    type ExtendsFR =
      ResultType extends FunctionReference<any, "public"> ? true : false;
    // This is the critical test - if false, FilterApi will filter it out
    expectTypeOf<ExtendsFR>().toMatchTypeOf<true | false>();

    // Simulate what Convex sees: typeof exportedFunction
    type ModuleExports = {
      myFunction: typeof result;
    };

    // Simulate ApiFromModules
    type FullApi = ApiFromModules<{
      testModule: ModuleExports;
    }>;

    type Filtered = FilterApi<FullApi, FunctionReference<any, "public">>;

    // Check if the module exists in filtered API
    type HasModule = "testModule" extends keyof Filtered ? true : false;
    expectTypeOf<HasModule>().toMatchTypeOf<true | false>();

    // If module exists, check if function exists
    // If FilterApi filtered out the intersection type, Filtered will be {}
    type GetModule<T, K extends string> = K extends keyof T ? T[K] : never;
    type TestModule = GetModule<Filtered, "testModule">;
    type MyFunction = TestModule extends { myFunction: infer F } ? F : never;

    // This will fail if FilterApi filtered out the intersection type
    // If intersection breaks FilterApi, MyFunction will be never
    expectTypeOf<MyFunction>().toMatchTypeOf<never | any>();
  });

  it("should investigate: check if FilterApi uses distributive conditional types", () => {
    // FilterApi might use distributive conditional types
    // Intersection types might interfere with distribution

    type TestIntersection = RegisteredQuery<
      "public",
      TArgs,
      Promise<THandlerReturn>
    > &
      ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>);

    // Check if FilterApi distributes over union types
    type UnionApi = {
      func1: TestIntersection;
      func2: RegisteredQuery<"public", TArgs, Promise<THandlerReturn>>;
    };

    type Filtered = FilterApi<UnionApi, FunctionReference<any, "public">>;

    // Both should be present
    type Func1 = Filtered["func1"];
    type Func2 = Filtered["func2"];

    expectTypeOf<Func1>().not.toBeNever();
    expectTypeOf<Func2>().not.toBeNever();
  });

  it("should investigate: check exact type structure comparison", () => {
    // Maybe FilterApi does exact type matching and intersection breaks it?

    type WithoutIntersection = RegisteredQuery<
      "public",
      EmptyObject,
      Promise<THandlerReturn>
    >;

    type WithIntersection = RegisteredQuery<
      "public",
      EmptyObject,
      Promise<THandlerReturn>
    > &
      ((context: TContext) => (args: EmptyObject) => Promise<THandlerReturn>);

    // Check if they're considered the same by FilterApi
    type Api1 = { func: WithoutIntersection };
    type Api2 = { func: WithIntersection };

    type Filtered1 = FilterApi<Api1, FunctionReference<any, "public">>;
    type Filtered2 = FilterApi<Api2, FunctionReference<any, "public">>;

    type Func1 = Filtered1["func"];
    type Func2 = Filtered2["func"];

    // Both should work
    expectTypeOf<Func1>().not.toBeNever();
    expectTypeOf<Func2>().not.toBeNever();
  });

  it("should investigate: check if the issue is with method return type inference", () => {
    // The key difference: method return type vs direct type

    class Builder {
      public(): RegisteredQuery<
        "public",
        EmptyObject,
        Promise<THandlerReturn>
      > &
        ((
          context: TContext,
        ) => (args: EmptyObject) => Promise<THandlerReturn>) {
        return null as any;
      }
    }

    const builder = new Builder();
    const result = builder.public();
    type ResultType = typeof result;

    type TestApi = {
      myFunction: ResultType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: check if conditional return type from method breaks it", () => {
    // This is closer to the actual builder scenario

    class Builder<T extends "query" | "mutation"> {
      public(): T extends "query"
        ? RegisteredQuery<"public", EmptyObject, Promise<THandlerReturn>> &
            ((
              context: TContext,
            ) => (args: EmptyObject) => Promise<THandlerReturn>)
        : RegisteredMutation<"public", EmptyObject, Promise<THandlerReturn>> &
            ((
              context: TContext,
            ) => (args: EmptyObject) => Promise<THandlerReturn>) {
        return null as any;
      }
    }

    const builder = new Builder<"query">();
    const result = builder.public();
    type ResultType = typeof result;

    type TestApi = {
      myFunction: ResultType;
    };

    type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;
    type MyFunction = Filtered["myFunction"];

    expectTypeOf<MyFunction>().not.toBeNever();
  });

  it("should investigate: check the EXACT builder scenario", () => {
    // This is the EXACT scenario from the builder with all generics

    const builder = new TestBuilderWithHandler<
      TDataModel,
      "query",
      TContext,
      undefined,
      undefined,
      "public",
      THandlerReturn
    >({
      functionType: "query",
      visibility: "public",
    });

    const result = builder.publicWithIntersection();
    type ResultType = typeof result;

    // CRITICAL TEST: Does the intersection type extend FunctionReference?
    type ExtendsFR =
      ResultType extends FunctionReference<any, "public"> ? true : false;
    // If this is false, that's why FilterApi filters it out!
    expectTypeOf<ExtendsFR>().toMatchTypeOf<true | false>();

    // Simulate the full Convex flow
    type ModuleExports = {
      exportedFunction: typeof result;
    };

    type FullApi = ApiFromModules<{
      testModule: ModuleExports;
    }>;

    type Filtered = FilterApi<FullApi, FunctionReference<any, "public">>;

    // Check if module exists
    type HasModule = "testModule" extends keyof Filtered ? true : false;
    expectTypeOf<HasModule>().toMatchTypeOf<true | false>();

    // If module was filtered out, Filtered will be {}
    type GetModule<T, K extends string> = K extends keyof T ? T[K] : never;
    type TestModule = GetModule<Filtered, "testModule">;
    type ExportedFunc = TestModule extends { exportedFunction: infer F }
      ? F
      : never;

    // This is the real test - does it work with the exact builder scenario?
    // If intersection breaks FilterApi, ExportedFunc will be never
    expectTypeOf<ExportedFunc>().toMatchTypeOf<never | any>();
  });

  it("should investigate: check if the issue is type complexity causing TS to give up", () => {
    // Maybe TypeScript gives up on complex types?
    // Let's check if simplifying helps

    // Simple version
    type Simple = RegisteredQuery<
      "public",
      EmptyObject,
      Promise<THandlerReturn>
    > &
      ((context: TContext) => (args: EmptyObject) => Promise<THandlerReturn>);

    // Complex version with InferredArgs
    type Complex = RegisteredQuery<
      "public",
      InferredArgs<undefined>,
      Promise<THandlerReturn>
    > &
      ((
        context: TContext,
      ) => (args: InferredArgs<undefined>) => Promise<THandlerReturn>);

    type SimpleApi = { func: Simple };
    type ComplexApi = { func: Complex };

    type SimpleFiltered = FilterApi<
      SimpleApi,
      FunctionReference<any, "public">
    >;
    type ComplexFiltered = FilterApi<
      ComplexApi,
      FunctionReference<any, "public">
    >;

    type SimpleFunc = SimpleFiltered["func"];
    type ComplexFunc = ComplexFiltered["func"];

    // Both should work
    expectTypeOf<SimpleFunc>().not.toBeNever();
    expectTypeOf<ComplexFunc>().not.toBeNever();
  });
});

// ============================================================================
// SUMMARY OF FINDINGS
// ============================================================================
//
// ROOT CAUSE: Intersection types break FilterApi's type matching
//
// Key Discovery:
// 1. RegisteredQuery (without intersection) works with FilterApi ✓
// 2. RegisteredQuery & Function (with intersection) is filtered out by FilterApi ✗
//
// Why this happens:
// - FilterApi uses structural type matching to check if types match FunctionReference
// - When you create an intersection type: RegisteredQuery & ((context) => (args) => Promise)
// - TypeScript requires ALL members of an intersection to satisfy the constraint
// - The function type `(context) => (args) => Promise` does NOT extend FunctionReference
// - Therefore, the intersection type fails FilterApi's check
//
// The Problem:
// - Adding `& ((context: TCurrentContext) => (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>)`
//   to the builder's return type breaks FilterApi
// - FilterApi filters out the entire function because the intersection doesn't match FunctionReference
//
// Potential Solutions:
// 1. Don't use intersection types - return RegisteredQuery only, add callable functionality separately
// 2. Use a wrapper type that extends FunctionReference AND includes the callable signature
// 3. Modify FilterApi behavior (not possible - it's from Convex)
// 4. Use type assertions/casts (not type-safe)
// 5. Create a separate type that combines both but extends FunctionReference properly
//
// The issue is NOT with:
// - InferredArgs complexity
// - Conditional types
// - Generic type parameters
// - Method return type inference
// - Type complexity
//
// The issue IS with:
// - Intersection types that include non-FunctionReference members
// - FilterApi's structural matching failing on intersections
