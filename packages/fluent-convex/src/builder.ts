import { type GenericDataModel } from "convex/server";
import type { AnyConvexMiddleware } from "./middleware";
import type { Context } from "./types";
import { ConvexBuilder } from "./ConvexBuilder";

export async function applyMiddlewares(
  initialContext: Context,
  middlewares: readonly AnyConvexMiddleware[]
): Promise<Context> {
  let currentContext: Context = initialContext;
  for (const middleware of middlewares) {
    const result = await middleware({
      context: currentContext,
      next: async (options) => ({ context: options.context }),
    });
    currentContext = result.context;
  }
  return currentContext;
}

export function createBuilder<
  TDataModel extends GenericDataModel,
>(): ConvexBuilder<TDataModel> {
  return new ConvexBuilder<TDataModel>({
    middlewares: [],
  });
}
