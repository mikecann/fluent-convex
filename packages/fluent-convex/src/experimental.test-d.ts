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
  queryGeneric,
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
      someFunction: RegisteredQuery<"public", any, any>;
    };
  }>;

  type FilteredApi = FilterApi<Api, FunctionReference<any, "public">>;

  expectTypeOf<FilteredApi["module1"]>().not.toBeNever();
});

test("classic convex and callable", () => {
  type Api = ApiFromModules<{
    module1: {
      someFunction: RegisteredQuery<"public", any, any> &
        // I really wanted queries to be directly callable like this but it doesnt work :(
        ((context: any) => (args: any) => Promise<any>);
    };
  }>;

  type FilteredApi = FilterApi<Api, FunctionReference<any, "public">>;

  // @ts-expect-error the intersection type on someFunction isnt accepted
  expectTypeOf<FilteredApi["module1"]>().not.toBeNever();
});
