import type { Promisable } from "@orpc/shared";
import type { Context } from "./types";

export interface ConvexMiddlewareOptions<TInContext extends Context> {
  context: TInContext;
  next: <U extends Context>(options: {
    context: U;
  }) => Promisable<{ context: U }>;
}

export interface ConvexMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
> {
  (
    options: ConvexMiddlewareOptions<TInContext>
  ): Promisable<{ context: TOutContext }>;
}

export type AnyConvexMiddleware = ConvexMiddleware<any, any>;
