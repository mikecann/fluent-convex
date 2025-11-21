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
} from "./types";

export class ConvexBuilderWithHandler<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
  THandlerReturn = any,
> {
  public def: ConvexBuilderDef<
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
    try {
      return (fnOrCls as (builder: this) => TResult)(this);
    } catch (error: any) {
      if (
        error instanceof TypeError &&
        error.message.includes("Class constructor")
      ) {
        return new (fnOrCls as new (builder: this) => TResult)(this);
      }
      throw error;
    }
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
      let currentContext: Context = context;

      // Apply all middlewares in order
      for (const middleware of middlewares) {
        const result = await middleware(currentContext, async (context) => ({
          context,
        }));
        currentContext = result.context;
      }

      // Call the raw handler with the transformed context
      return handler(currentContext as any, args);
    };
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
        Promise<THandlerReturn>
      >
    : TFunctionType extends "mutation"
      ? RegisteredMutation<
          "public",
          InferredArgs<TArgsValidator>,
          Promise<THandlerReturn>
        >
      : TFunctionType extends "action"
        ? RegisteredAction<
            "public",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
          >
        : never {
    return this._register("public") as any;
  }

  internal(): TFunctionType extends "query"
    ? RegisteredQuery<
        "internal",
        InferredArgs<TArgsValidator>,
        Promise<THandlerReturn>
      >
    : TFunctionType extends "mutation"
      ? RegisteredMutation<
          "internal",
          InferredArgs<TArgsValidator>,
          Promise<THandlerReturn>
        >
      : TFunctionType extends "action"
        ? RegisteredAction<
            "internal",
            InferredArgs<TArgsValidator>,
            Promise<THandlerReturn>
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

    // Compose the handler with all middlewares (including those added after .handler())
    const composedHandler = async (
      baseCtx:
        | QueryCtx<TDataModel>
        | MutationCtx<TDataModel>
        | ActionCtx<TDataModel>,
      baseArgs: any
    ) => {
      let currentContext: Context = baseCtx;

      // Apply all middlewares in order
      for (const middleware of middlewares) {
        const result = await middleware(currentContext, async (context) => ({
          context,
        }));
        currentContext = result.context;
      }

      // Call the raw handler with the transformed context
      return handler(currentContext as any, baseArgs);
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
