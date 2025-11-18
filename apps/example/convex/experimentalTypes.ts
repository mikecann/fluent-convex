import { expectTypeOf } from "vitest";
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

type TestQuery = RegisteredQuery<"public", TArgs, Promise<THandlerReturn>> &
  ((context: TContext) => (args: TArgs) => Promise<THandlerReturn>);

type TestApi = {
  myFunction: TestQuery;
};

// Filter for internal functions
type Filtered = FilterApi<TestApi, FunctionReference<any, "public">>;

// this should not error
type XX = Filtered["myFunction"]

// Another test for the same
type HasFunction = "myFunction" extends keyof Filtered ? true : false;
expectTypeOf<HasFunction>().toEqualTypeOf<true>();
