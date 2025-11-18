import { describe, it, expectTypeOf } from "vitest";
import type {
  FunctionReference,
  FilterApi,
  RegisteredQuery,
  GenericQueryCtx,
} from "convex/server";

// Base types
type TArgs = { count: number };
type THandlerReturn = { numbers: number[] };
type TContext = GenericQueryCtx<any>;

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

  it("should not fail with conditional types that evaluate to intersection types", () => {
    // Now let's test with a conditional type (like what the builder returns)
    type ConditionalQuery<T extends "query" | "mutation"> = T extends "query"
      ? RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
          ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>)
      : never;

    type ConditionalApi = {
      myFunction: ConditionalQuery<"query">;
    };

    // Filter for public functions - THIS DOESN'T WORK
    // FilterApi filters out the function because it doesn't recognize the conditional type
    type FilteredConditional = FilterApi<
      ConditionalApi,
      FunctionReference<any, "public">
    >;

    // This will be never/undefined - demonstrating the issue
    // FilterApi doesn't recognize conditional types that evaluate to intersection types
    type MyFunctionShouldExistButDoesnt = FilteredConditional["myFunction"];

    // Demonstrate the issue: MyFunctionShouldExistButDoesnt is never/undefined
    // This shows that FilterApi filtered out the function even though it should extend FunctionReference
    expectTypeOf<MyFunctionShouldExistButDoesnt>().toBeNever();
  });

  it("should demonstrate that the conditional type itself extends FunctionReference", () => {
    // The conditional type itself should extend FunctionReference
    type ConditionalQuery<T extends "query" | "mutation"> = T extends "query"
      ? RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
          ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>)
      : never;

    type ConditionalQueryInstance = ConditionalQuery<"query">;

    // The conditional type when evaluated DOES extend FunctionReference
    // But FilterApi doesn't recognize it when it's part of a conditional type
    expectTypeOf<ConditionalQueryInstance>().toMatchTypeOf<
      FunctionReference<any, "public">
    >();
  });
});
