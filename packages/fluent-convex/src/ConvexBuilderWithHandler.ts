import {
  type GenericDataModel,
  type RegisteredQuery,
  type RegisteredMutation,
  type RegisteredAction,
  queryGeneric,
  internalQueryGeneric,
  mutationGeneric,
  internalMutationGeneric,
  actionGeneric,
  internalActionGeneric,
} from "convex/server";
import type { ConvexMiddleware, AnyConvexMiddleware } from "./middleware";
import { extend as extendBuilder } from "./extend";
import type {
  FunctionType,
  Context,
  EmptyObject,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  Visibility,
  ConvexBuilderDef,
  InferredArgs,
  CallableBuilder,
  QueryCtx,
  MutationCtx,
  ActionCtx,
  ExpectedReturnType,
} from "./types";

/**
 * Determines the return type for the registered Convex function.
 *
 * When a returns validator is specified, uses the validator-derived type
 * directly — this avoids circular type references when an action in the
 * same file calls other functions via `api.*` without those functions
 * having explicit `.returns()`. Without this, TypeScript would need to
 * infer the handler's return type, which triggers circular resolution
 * through the generated `api` type.
 */
type RegisteredReturnType<
  TReturnsValidator extends ConvexReturnsValidator | undefined,
  THandlerReturn,
> = [TReturnsValidator] extends [ConvexReturnsValidator]
  ? Promise<ExpectedReturnType<TReturnsValidator>>
  : Promise<THandlerReturn>;

export class ConvexBuilderWithHandler<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
  THandlerReturn = any,
> {
  protected def: ConvexBuilderDef<
    TFunctionType,
    TArgsValidator,
    TReturnsValidator
  >;

  constructor(
    def: ConvexBuilderDef<TFunctionType, TArgsValidator, TReturnsValidator>
  ) {
    this.def = def;

    // Create a callable function that delegates to _call
    const callable = ((context: TCurrentContext) => {
      return this._call(context);
    }) as any;

    // Copy properties from prototype to the callable function
    // This is a bit of a hack to make the function behave like an instance of the class
    const proto = ConvexBuilderWithHandler.prototype;
    const props = Object.getOwnPropertyNames(proto);

    for (const prop of props) {
      if (prop !== "constructor") {
        const value = (proto as any)[prop];
        if (typeof value === "function") {
          callable[prop] = value.bind(this);
        }
      }
    }

    // Also copy instance properties (like def)
    callable.def = this.def;

    return callable;
  }

  extend<TResult>(fn: (builder: this) => TResult): TResult;
  extend<TResult>(cls: new (builder: this) => TResult): TResult;
  extend<TResult>(
    fnOrCls: ((builder: this) => TResult) | (new (builder: this) => TResult)
  ): TResult {
    return extendBuilder(this, fnOrCls);
  }

  // Internal method to handle the call
  private _call(
    context: TCurrentContext
  ): (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn> {
    const { handler, middlewares } = this.def;

    if (!handler) {
      throw new Error("Handler not set.");
    }

    return async (args: InferredArgs<TArgsValidator>) => {
      return this._executeWithMiddleware(
        middlewares,
        context as Context,
        handler,
        args
      );
    };
  }

  /**
   * Execute middleware as an onion: each middleware's `next()` runs the rest
   * of the chain (remaining middleware + handler). This allows middleware to
   * run code before and after downstream execution, catch errors, measure
   * timing, etc.
   */
  private async _executeWithMiddleware(
    middlewares: readonly AnyConvexMiddleware[],
    initialContext: Context,
    handler: (context: Context, args: any) => Promise<any>,
    args: any
  ): Promise<THandlerReturn> {
    let handlerResult: any;

    // Build a recursive chain where calling `next(ctx)` runs the next
    // middleware, and the innermost `next` runs the handler.
    const createNext = (index: number) => {
      return async <U extends Context>(ctx: U): Promise<{ context: U }> => {
        if (index >= middlewares.length) {
          // End of middleware chain — execute the handler
          handlerResult = await handler(ctx as any, args);
          return { context: ctx };
        }
        // Call the current middleware, passing a `next` that continues the chain
        const result = await middlewares[index](ctx, createNext(index + 1));
        return result as { context: U };
      };
    };

    await createNext(0)(initialContext);
    return handlerResult;
  }

  use<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
  ): ConvexBuilderWithHandler<
    TDataModel,
    TFunctionType,
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator,
    THandlerReturn
  > &
    CallableBuilder<
      TCurrentContext & UOutContext,
      TArgsValidator,
      THandlerReturn
    > {
    return new ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
      TCurrentContext & UOutContext,
      TArgsValidator,
      TReturnsValidator,
      THandlerReturn
    >({
      ...this.def,
      middlewares: [...this.def.middlewares, middleware as AnyConvexMiddleware],
    }) as ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
      TCurrentContext & UOutContext,
      TArgsValidator,
      TReturnsValidator,
      THandlerReturn
    > &
      CallableBuilder<
        TCurrentContext & UOutContext,
        TArgsValidator,
        THandlerReturn
      >;
  }

  public(): TFunctionType extends "query"
    ? RegisteredQuery<
        "public",
        InferredArgs<TArgsValidator>,
        RegisteredReturnType<TReturnsValidator, THandlerReturn>
      >
    : TFunctionType extends "mutation"
      ? RegisteredMutation<
          "public",
          InferredArgs<TArgsValidator>,
          RegisteredReturnType<TReturnsValidator, THandlerReturn>
        >
      : TFunctionType extends "action"
        ? RegisteredAction<
            "public",
            InferredArgs<TArgsValidator>,
            RegisteredReturnType<TReturnsValidator, THandlerReturn>
          >
        : never {
    return this._register("public") as any;
  }

  internal(): TFunctionType extends "query"
    ? RegisteredQuery<
        "internal",
        InferredArgs<TArgsValidator>,
        RegisteredReturnType<TReturnsValidator, THandlerReturn>
      >
    : TFunctionType extends "mutation"
      ? RegisteredMutation<
          "internal",
          InferredArgs<TArgsValidator>,
          RegisteredReturnType<TReturnsValidator, THandlerReturn>
        >
      : TFunctionType extends "action"
        ? RegisteredAction<
            "internal",
            InferredArgs<TArgsValidator>,
            RegisteredReturnType<TReturnsValidator, THandlerReturn>
          >
        : never {
    return this._register("internal") as any;
  }

  private _register(visibility: Visibility): any {
    const {
      functionType,
      argsValidator,
      returnsValidator,
      handler,
      middlewares,
    } = this.def;

    if (!functionType) {
      throw new Error(
        "Function type not set. Call .query(), .mutation(), or .action() first."
      );
    }

    if (!handler) {
      throw new Error(
        "Handler not set. Call .handler() before .public() or .internal()."
      );
    }

    // Compose the handler with all middlewares using onion composition.
    // Each middleware's `next()` executes the rest of the chain (subsequent
    // middleware + handler), enabling try/catch, timing, and post-processing.
    const composedHandler = async (
      baseCtx:
        | QueryCtx<TDataModel>
        | MutationCtx<TDataModel>
        | ActionCtx<TDataModel>,
      baseArgs: any
    ) => {
      return this._executeWithMiddleware(
        middlewares,
        baseCtx as Context,
        handler,
        baseArgs
      );
    };

    const config = {
      args: argsValidator || {},
      ...(returnsValidator ? { returns: returnsValidator } : {}),
      handler: composedHandler,
    } as any;

    const isPublic = visibility === "public";
    const registrationFn = {
      query: isPublic ? queryGeneric : internalQueryGeneric,
      mutation: isPublic ? mutationGeneric : internalMutationGeneric,
      action: isPublic ? actionGeneric : internalActionGeneric,
    }[functionType];

    return registrationFn(config);
  }
}
