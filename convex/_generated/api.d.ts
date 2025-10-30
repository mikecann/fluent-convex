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
import type * as lib3_convex_builder from "../lib3/convex_builder.js";
import type * as lib3_convex_middleware from "../lib3/convex_middleware.js";
import type * as lib3_convex_types from "../lib3/convex_types.js";
import type * as lib3_middleware from "../lib3/middleware.js";
import type * as lib3_procedure from "../lib3/procedure.js";
import type * as lib3_types from "../lib3/types.js";
import type * as myFunctions from "../myFunctions.js";

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
  "lib3/convex_builder": typeof lib3_convex_builder;
  "lib3/convex_middleware": typeof lib3_convex_middleware;
  "lib3/convex_types": typeof lib3_convex_types;
  "lib3/middleware": typeof lib3_middleware;
  "lib3/procedure": typeof lib3_procedure;
  "lib3/types": typeof lib3_types;
  myFunctions: typeof myFunctions;
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
