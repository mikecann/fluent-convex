/**
 * plugin.ts - Custom plugin demo using the .extend() system.
 *
 * Plugins let you add custom methods to the builder chain. This
 * example creates a TimedBuilder that adds a `.withTiming(name)`
 * method - it automatically wraps any function with execution
 * timing via onion middleware.
 *
 * The key is overriding `_clone()` so the plugin type survives
 * through .use(), .input(), .returns(), etc.
 */

import { v } from "convex/values";
import {
  ConvexBuilderWithFunctionKind,
  type ConvexArgsValidator,
  type ConvexReturnsValidator,
  type ConvexBuilderDef,
  type Context,
  type EmptyObject,
  type FunctionType,
  type GenericDataModel,
} from "fluent-convex";
import { convex } from "./fluent";

// #region TimedBuilder
export class TimedBuilder<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
> extends ConvexBuilderWithFunctionKind<
  TDataModel,
  TFunctionType,
  TCurrentContext,
  TArgsValidator,
  TReturnsValidator
> {
  constructor(builderOrDef: any) {
    const def =
      builderOrDef instanceof ConvexBuilderWithFunctionKind
        ? (builderOrDef as any).def
        : builderOrDef;
    super(def);
  }

  // Override _clone so TimedBuilder survives through .use(), .input(), etc.
  protected _clone(def: ConvexBuilderDef<any, any, any>): any {
    return new TimedBuilder(def);
  }

  /** Add automatic execution timing via onion middleware. */
  withTiming(operationName: string) {
    return this.use(async (ctx, next) => {
      const start = Date.now();
      console.log(`[TIMER:${operationName}] Start`);
      try {
        const result = await next(ctx);
        console.log(
          `[TIMER:${operationName}] Done in ${Date.now() - start}ms`
        );
        return result;
      } catch (error) {
        console.error(
          `[TIMER:${operationName}] Error after ${Date.now() - start}ms`
        );
        throw error;
      }
    });
  }
}
// #endregion

// #region timedQuery
export const timedQuery = convex
  .query()
  .extend(TimedBuilder)
  .withTiming("timedQuery")
  .input({ echo: v.string() })
  .handler(async (_ctx, input) => {
    return { message: `Echo: ${input.echo}`, timestamp: Date.now() };
  })
  .public();
// #endregion
