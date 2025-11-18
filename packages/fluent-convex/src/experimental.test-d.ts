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
        ((context: any) => (args: any) => Promise<any>);
    };
  }>;

  type FilteredApi = FilterApi<Api, FunctionReference<any, "public">>;

  // @ts-expect-error the intersection type on someFunction isnt accepted
  expectTypeOf<FilteredApi["module1"]>().not.toBeNever();
});

test("can call into a non registered query", () => {
  const nonRegisteredQuery = convex
    .query()
    .input({ count: v.number() })
    .handler(async ({ context, input }) => {
      return `the count is ${input.count}`;
    });

  // can call into it
  nonRegisteredQuery({} as any)({ count: 1 });

  const registeredQuery = nonRegisteredQuery.public();

  // @ts-expect-error should not be callable
  registeredQuery({} as any)({ count: 1 });
});
