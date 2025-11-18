import { describe, it, assertType, test, expectTypeOf } from "vitest";
import { v } from "convex/values";
import { z } from "zod";
import {
  defineSchema,
  defineTable,
  FunctionReference,
  FilterApi,
  RegisteredQuery,
  GenericQueryCtx,
  GenericDataModel,
  ApiFromModules,
} from "convex/server";
import { createBuilder } from "./builder";

const schema = defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
});

const convex = createBuilder(schema);

// Base types
type TArgs = { count: number };
type THandlerReturn = { numbers: number[] };
type TContext = GenericQueryCtx<any>;

// This type works - it's a direct intersection, not from a conditional type
type TestQuery = RegisteredQuery<"public", TArgs, Promise<THandlerReturn>>;

type CallableTestQuery = RegisteredQuery<
  "public",
  TArgs,
  Promise<THandlerReturn>
> &
  ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>);

test("classic convex ", () => {
  type Api = ApiFromModules<{
    module1: {
      someFunction: FunctionReference<"query", "public">;
    };
  }>;

  type FilteredApi = FilterApi<Api, FunctionReference<any, "public">>;

  expectTypeOf<FilteredApi["module1"]>().not.toBeNever();
});

test("it works experimentally ", () => {
  type TestApi = {
    myFunction: CallableTestQuery;
  };

  // Filter for public functions - THIS WORKS
  type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;

  // This should exist and not be never/undefined
  type MyFunctionShouldExist = Filtered["myFunction"];

  // Test that it works - the function should exist in the filtered API
  expectTypeOf<MyFunctionShouldExist>().not.toBeNever();
  expectTypeOf<MyFunctionShouldExist>().not.toBeUndefined();
});

test("test with ApiFromModules - direct intersection", () => {
  // Base types
  type TArgs = { count: number };
  type THandlerReturn = { numbers: number[] };
  type TContext = GenericQueryCtx<any>;

  // Create intersection type
  type TestQuery = RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
    ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>);

  // Simulate a module export
  const myFunction: TestQuery = null as any;

  // Simulate what Convex sees: typeof myFunction
  type ModuleExports = {
    myFunction: typeof myFunction;
  };

  // Use ApiFromModules like Convex does
  type FullApi = ApiFromModules<{
    testModule: ModuleExports;
  }>;

  // Now filter it
  type Filtered = FilterApi<FullApi, FunctionReference<any, "public">>;

  // Check if module exists
  type HasModule = "testModule" extends keyof Filtered ? true : false;
  expectTypeOf<HasModule>().toMatchTypeOf<true | false>();

  // Check if function exists in module
  type GetModule<T, K extends string> = K extends keyof T ? T[K] : never;
  type TestModule = GetModule<Filtered, "testModule">;
  type MyFunction = TestModule extends { myFunction: infer F } ? F : never;

  // This will tell us if ApiFromModules breaks the intersection type
  expectTypeOf<MyFunction>().toMatchTypeOf<never | any>();
});

test("test with ApiFromModules - using actual builder", () => {
  // Create a function using the builder
  const myFunction = convex
    .query()
    .input({ count: v.number() })
    .handler(async ({ context, input }) => {
      return { numbers: [1, 2, 3] };
    })
    .public();

  const myFunction2 = {} as RegisteredQuery<
    "public",
    { count: number },
    Promise<{ numbers: number[] }>
  > &
    ((
      context: any
    ) => (args: { count: number }) => Promise<{ numbers: number[] }>);

  // Make sure its calllable
  myFunction({} as any)({ count: 1 });
  myFunction2({} as any)({ count: 1 });

  const callableFunctions = {
    myFunction: myFunction,
    myFunction2: myFunction2,
  };

  const fullApi: ApiFromModules<{
    callableFunctions: typeof callableFunctions;
  }> = {} as any;

  const publicApi: FilterApi<
    typeof fullApi,
    FunctionReference<any, "public">
  > = {} as any;

  // Why doesnt this work?!
  expectTypeOf<(typeof publicApi)["callableFunctions"]>().not.toBeNever();

  const fullApi2: ApiFromModules<{
    myFunction2: TestQuery;
  }> = {} as any;

  const publicApi2: FilterApi<
    typeof fullApi2,
    FunctionReference<any, "public">
  > = {} as any;
});
