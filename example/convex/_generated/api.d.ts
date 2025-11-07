/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib3_builder from "../lib3/builder.js";
import type * as lib3_middleware from "../lib3/middleware.js";
import type * as lib3_types from "../lib3/types.js";
import type * as lib3_zod_support from "../lib3/zod_support.js";
import type * as myFunctions from "../myFunctions.js";
import type * as zodExample from "../zodExample.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "lib3/builder": typeof lib3_builder;
  "lib3/middleware": typeof lib3_middleware;
  "lib3/types": typeof lib3_types;
  "lib3/zod_support": typeof lib3_zod_support;
  myFunctions: typeof myFunctions;
  zodExample: typeof zodExample;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
