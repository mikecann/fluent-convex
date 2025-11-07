import type { Promisable } from "@orpc/shared";
import type { Context } from "./types";

export interface ConvexMiddlewareNextFnOptions<TOutContext extends Context> {
  context: TOutContext;
}

export interface ConvexMiddlewareNextFn {
  <U extends Context>(
    options: ConvexMiddlewareNextFnOptions<U>,
  ): Promisable<{ context: U }>;
}

export interface ConvexMiddlewareOptions<TInContext extends Context> {
  context: TInContext;
  next: ConvexMiddlewareNextFn;
}

export interface ConvexMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
> {
  (
    options: ConvexMiddlewareOptions<TInContext>,
  ): Promisable<{ context: TOutContext }>;
}

export type AnyConvexMiddleware = ConvexMiddleware<any, any>;
