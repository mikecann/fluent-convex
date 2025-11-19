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
  TFunctionType extends FunctionType | undefined = undefined,
  TInitialContext extends Context = EmptyObject,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
  TVisibility extends Visibility = "public",
  THandlerReturn = any,
> {
  private def: ConvexBuilderDef<
    TFunctionType,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  >;

  constructor(
    def: ConvexBuilderDef<
      TFunctionType,
      TArgsValidator,
      TReturnsValidator,
      TVisibility
    >
  ) {
    this.def = def;

    // Make the instance callable by returning a Proxy
    return new Proxy(this, {
      apply: (_target, _thisArg, args: [TCurrentContext]) => {
        return this._call(args[0]);
      },
    }) as any;
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
        const result = await middleware({
          context: currentContext,
          next: async (options) => ({ context: options.context }),
        });
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
    TInitialContext,
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
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
      TInitialContext,
      TCurrentContext & UOutContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      THandlerReturn
    >({
      ...this.def,
      middlewares: [...this.def.middlewares, middleware as AnyConvexMiddleware],
    }) as ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
      TInitialContext,
      TCurrentContext & UOutContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
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
        const result = await middleware({
          context: currentContext,
          next: async (options) => ({ context: options.context }),
        });
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
