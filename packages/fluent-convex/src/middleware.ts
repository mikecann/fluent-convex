import { Context, Promisable } from "./types.js";

export interface ConvexMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
> {
  (
    context: TInContext,
    next: <U extends Context>(context: U) => Promisable<{ context: U }>
  ): Promisable<{ context: TOutContext }>;
}

export type AnyConvexMiddleware = ConvexMiddleware<any, any>;
