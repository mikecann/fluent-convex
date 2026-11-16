import type { GenericDataModel } from "convex/server";
import type { GenericValidator, PropertyValidators } from "convex/values";
import { ConvexBuilderWithHandler } from "./ConvexBuilderWithHandler.js";
import {
  HandlerArgs,
  HandlerMatchesCaller,
  HandlerReturn,
  InferredHandlerReturn,
} from "./types.js";
import { ConvexBuilderDef } from "./types.js";
import { CallableBuilder } from "./types.js";
import type { ConvexMiddleware, AnyConvexMiddleware } from "./middleware.js";
import type {
  FunctionType,
  Context,
  EmptyObject,
  ConvexArgsValidator,
  ConvexReturnsValidator,
} from "./types.js";
import { extend as extendBuilder } from "./extend.js";

export class ConvexBuilderWithFunctionKind<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
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
  }

  /**
   * Factory method for creating new builder instances. Subclasses (plugins)
   * override this to return their own type, ensuring that methods like
   * `.use()`, `.input()`, `.returns()` preserve the plugin type through the chain.
   */
  protected _clone(def: ConvexBuilderDef<any, any, any>): any {
    return new ConvexBuilderWithFunctionKind(def);
  }

  extend<TResult>(fn: (builder: this) => TResult): TResult;
  extend<TResult>(cls: new (builder: this) => TResult): TResult;
  extend<TResult>(
    fnOrCls: ((builder: this) => TResult) | (new (builder: this) => TResult)
  ): TResult {
    return extendBuilder(this, fnOrCls);
  }

  $context<U extends Context>(): {
    createMiddleware<UOutContext extends Context>(
      middleware: ConvexMiddleware<U, UOutContext>
    ): ConvexMiddleware<U, UOutContext>;
  } {
    return {
      createMiddleware<UOutContext extends Context>(
        middleware: ConvexMiddleware<U, UOutContext>
      ): ConvexMiddleware<U, UOutContext> {
        return middleware;
      },
    };
  }

  /**
   * Create a typed middleware function. This is a type-helper that returns the
   * middleware you pass in — use `.use()` to apply middleware to a builder chain.
   */
  createMiddleware<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
  ): ConvexMiddleware<TCurrentContext, UOutContext>;
  createMiddleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext>;
  createMiddleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext> {
    return middleware;
  }

  use<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
  ): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator
  > {
    return this._clone({
      ...this.def,
      middlewares: [...this.def.middlewares, middleware as AnyConvexMiddleware],
    });
  }

  input<UInput extends PropertyValidators | GenericValidator>(
    validator: UInput
  ): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    TCurrentContext,
    UInput extends ConvexArgsValidator ? UInput : ConvexArgsValidator,
    TReturnsValidator
  > {
    return this._clone({
      ...this.def,
      argsValidator: validator,
    });
  }

  returns<UReturns extends GenericValidator>(
    validator: UReturns
  ): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    TCurrentContext,
    TArgsValidator,
    UReturns extends ConvexReturnsValidator ? UReturns : ConvexReturnsValidator
  > {
    return this._clone({
      ...this.def,
      returnsValidator: validator,
    });
  }

  handler<
    TReturn extends
      HandlerReturn<TReturnsValidator> = HandlerReturn<TReturnsValidator>,
    THandlerFn extends (
      context: TCurrentContext,
      input: HandlerArgs<TArgsValidator>
    ) => Promise<TReturn> = (
      context: TCurrentContext,
      input: HandlerArgs<TArgsValidator>
    ) => Promise<TReturn>,
  >(
    handlerFn: THandlerFn &
      ((
        context: TCurrentContext,
        input: HandlerArgs<TArgsValidator>
      ) => Promise<TReturn>)
  ): ConvexBuilderWithHandler<
    TDataModel,
    TFunctionType,
    TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    InferredHandlerReturn<TReturnsValidator, TReturn>
  > &
    (HandlerMatchesCaller<TArgsValidator, TReturnsValidator> extends true
      ? THandlerFn
      : unknown) &
    CallableBuilder<
      TCurrentContext,
      TArgsValidator,
      InferredHandlerReturn<TReturnsValidator, TReturn>
    > {
    if (this.def.handler) {
      throw new Error(
        "Handler already defined. Only one handler can be set per function chain."
      );
    }

    // Store the raw handler function - it will be composed with all middlewares
    // (including those added after .handler()) when .public() or .internal() is called
    // The handler signature matches what Convex expects: (ctx, args) => Promise<return>
    const rawHandler = async (
      transformedCtx: Context,
      baseArgs: HandlerArgs<TArgsValidator>
    ) => {
      return handlerFn(transformedCtx as TCurrentContext, baseArgs);
    };

    type InferredReturn = InferredHandlerReturn<TReturnsValidator, TReturn>;

    return new ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator,
      InferredReturn
    >({
      ...this.def,
      handler: rawHandler as any,
    }) as ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator,
      InferredReturn
    > &
      (HandlerMatchesCaller<TArgsValidator, TReturnsValidator> extends true
        ? THandlerFn
        : unknown) &
      CallableBuilder<TCurrentContext, TArgsValidator, InferredReturn>;
  }
}
