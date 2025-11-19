import {
  type RegisteredQuery,
  type RegisteredMutation,
  type RegisteredAction,
  queryGeneric,
  internalQueryGeneric,
  mutationGeneric,
  internalMutationGeneric,
  actionGeneric,
  internalActionGeneric,
  type GenericDataModel,
} from "convex/server";
import type { ConvexMiddleware, AnyConvexMiddleware } from "./middleware";
import type {
  Context,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  InferArgs,
  InferReturns,
  FunctionType,
  Visibility,
  QueryCtx,
  MutationCtx,
  ActionCtx,
  EmptyObject,
} from "./types";
import {
  isZodSchema,
  toConvexValidator,
  type ValidatorInput,
  type ReturnsValidatorInput,
  type ToConvexArgsValidator,
  type ToConvexReturnsValidator,
} from "./zod_support";

type InferredArgs<T extends ConvexArgsValidator | undefined> =
  T extends ConvexArgsValidator ? InferArgs<T> : EmptyObject;

type ExpectedReturnType<
  TReturnsValidator extends ConvexReturnsValidator | undefined,
> = TReturnsValidator extends ConvexReturnsValidator
  ? InferReturns<TReturnsValidator>
  : any;

interface ConvexBuilderDef<
  TFunctionType extends FunctionType | undefined,
  TArgsValidator extends ConvexArgsValidator | undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined,
  TVisibility extends Visibility,
> {
  functionType?: TFunctionType;
  middlewares: readonly AnyConvexMiddleware[];
  argsValidator?: TArgsValidator;
  returnsValidator?: TReturnsValidator;
  visibility: TVisibility;
  handler?: (context: Context, input: any) => Promise<any>;
}

export class ConvexBuilder<
  TDataModel extends GenericDataModel = GenericDataModel,
> {
  private def: ConvexBuilderDef<undefined, undefined, undefined, "public">;

  constructor(
    def: ConvexBuilderDef<undefined, undefined, undefined, "public">
  ) {
    this.def = def;
  }

  query(): ConvexBuilderWithFunctionKind<
    TDataModel,
    "query",
    QueryCtx<TDataModel>,
    QueryCtx<TDataModel>
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      "query",
      QueryCtx<TDataModel>,
      QueryCtx<TDataModel>
    >({
      ...this.def,
      functionType: "query",
    });
  }

  mutation(): ConvexBuilderWithFunctionKind<
    TDataModel,
    "mutation",
    MutationCtx<TDataModel>,
    MutationCtx<TDataModel>
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      "mutation",
      MutationCtx<TDataModel>,
      MutationCtx<TDataModel>
    >({
      ...this.def,
      functionType: "mutation",
    });
  }

  action(): ConvexBuilderWithFunctionKind<
    TDataModel,
    "action",
    ActionCtx<TDataModel>,
    ActionCtx<TDataModel>
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      "action",
      ActionCtx<TDataModel>,
      ActionCtx<TDataModel>
    >({
      ...this.def,
      functionType: "action",
    });
  }

  $context<U extends Context>(): {
    middleware<UOutContext extends Context>(
      middleware: ConvexMiddleware<U, UOutContext>
    ): ConvexMiddleware<U, UOutContext>;
  } {
    // Return an object that allows middleware creation with a specific context type
    return {
      middleware<UOutContext extends Context>(
        middleware: ConvexMiddleware<U, UOutContext>
      ): ConvexMiddleware<U, UOutContext> {
        return middleware;
      },
    };
  }

  middleware<UOutContext extends Context>(
    middleware: ConvexMiddleware<EmptyObject, UOutContext>
  ): ConvexMiddleware<EmptyObject, UOutContext>;
  middleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext>;
  middleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext> {
    return middleware;
  }
}

export class ConvexBuilderWithFunctionKind<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TInitialContext extends Context = EmptyObject,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
  TVisibility extends Visibility = "public",
  THasHandler extends boolean = false,
  THandlerReturn = any,
> {
  protected def: ConvexBuilderDef<
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
  }

  $context<U extends Context>(): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    U & EmptyObject,
    U,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
    THasHandler,
    THandlerReturn
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      U & EmptyObject,
      U,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      THasHandler,
      THandlerReturn
    >({
      ...this.def,
      middlewares: [],
    });
  }

  middleware<UOutContext extends Context>(
    middleware: ConvexMiddleware<TInitialContext, UOutContext>
  ): ConvexMiddleware<TInitialContext, UOutContext>;
  middleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext>;
  middleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext> {
    return middleware;
  }

  use<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
  ): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
    THasHandler,
    THandlerReturn
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TInitialContext,
      TCurrentContext & UOutContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      THasHandler,
      THandlerReturn
    >({
      ...this.def,
      middlewares: [...this.def.middlewares, middleware as AnyConvexMiddleware],
    });
  }

  input<UInput extends ValidatorInput>(
    validator: UInput
  ): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    ToConvexArgsValidator<UInput>,
    TReturnsValidator,
    TVisibility,
    THasHandler,
    THandlerReturn
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ToConvexArgsValidator<UInput>)
      : (validator as ToConvexArgsValidator<UInput>);

    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TInitialContext,
      TCurrentContext,
      ToConvexArgsValidator<UInput>,
      TReturnsValidator,
      TVisibility,
      THasHandler,
      THandlerReturn
    >({
      ...this.def,
      argsValidator: convexValidator,
    });
  }

  returns<UReturns extends ReturnsValidatorInput>(
    validator: UReturns
  ): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    TArgsValidator,
    ToConvexReturnsValidator<UReturns>,
    TVisibility,
    THasHandler,
    THandlerReturn
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ToConvexReturnsValidator<UReturns>)
      : (validator as ToConvexReturnsValidator<UReturns>);

    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      ToConvexReturnsValidator<UReturns>,
      TVisibility,
      THasHandler,
      THandlerReturn
    >({
      ...this.def,
      returnsValidator: convexValidator,
    });
  }

  handler<
    TReturn extends [TReturnsValidator] extends [ConvexReturnsValidator]
      ? ExpectedReturnType<TReturnsValidator>
      : any = [TReturnsValidator] extends [ConvexReturnsValidator]
      ? ExpectedReturnType<TReturnsValidator>
      : any,
  >(
    handlerFn: (options: {
      context: TCurrentContext;
      input: InferredArgs<TArgsValidator>;
    }) => Promise<TReturn>
  ): ConvexBuilderWithHandler<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
    [TReturnsValidator] extends [ConvexReturnsValidator]
      ? ExpectedReturnType<TReturnsValidator>
      : TReturn
  > &
    CallableBuilder<
      TCurrentContext,
      TArgsValidator,
      [TReturnsValidator] extends [ConvexReturnsValidator]
        ? ExpectedReturnType<TReturnsValidator>
        : TReturn
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
      baseArgs: InferredArgs<TArgsValidator>
    ) => {
      return handlerFn({
        context: transformedCtx as TCurrentContext,
        input: baseArgs,
      });
    };

    type InferredReturn = [TReturnsValidator] extends [ConvexReturnsValidator]
      ? ExpectedReturnType<TReturnsValidator>
      : TReturn;

    return new ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      InferredReturn
    >({
      ...this.def,
      handler: rawHandler as any,
    }) as ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      InferredReturn
    > &
      CallableBuilder<TCurrentContext, TArgsValidator, InferredReturn>;
  }
}

// Type for a callable ConvexBuilderWithHandler
type CallableBuilder<
  TCurrentContext extends Context,
  TArgsValidator extends ConvexArgsValidator | undefined,
  THandlerReturn,
> = {
  (
    context: TCurrentContext
  ): (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>;
};

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

export function createBuilder<
  TDataModel extends GenericDataModel,
>(): ConvexBuilder<TDataModel> {
  return new ConvexBuilder<TDataModel>({
    middlewares: [],
    visibility: "public",
  });
}
