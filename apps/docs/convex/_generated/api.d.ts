/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as auth from "../auth.js";
import type * as authCleanup from "../authCleanup.js";
import type * as authed from "../authed.js";
import type * as basics from "../basics.js";
import type * as chains from "../chains.js";
import type * as crons from "../crons.js";
import type * as fluent from "../fluent.js";
import type * as http from "../http.js";
import type * as middleware from "../middleware.js";
import type * as plugin from "../plugin.js";
import type * as seed from "../seed.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  auth: typeof auth;
  authCleanup: typeof authCleanup;
  authed: typeof authed;
  basics: typeof basics;
  chains: typeof chains;
  crons: typeof crons;
  fluent: typeof fluent;
  http: typeof http;
  middleware: typeof middleware;
  plugin: typeof plugin;
  seed: typeof seed;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  selfHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"selfHosting">;
};
