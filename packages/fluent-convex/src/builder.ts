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
  type DataModelFromSchemaDefinition,
  type SchemaDefinition,
} from "convex/server";
import type { ConvexMiddleware, AnyConvexMiddleware } from "./middleware";
import type {
  Context,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  InferArgs,
  FunctionType,
  Visibility,
  QueryCtx,
  MutationCtx,
  ActionCtx,
  EmptyObject,
  MaybeDefaultContext,
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
  handler?: (
    context: Context,
    input: any
  ) => Promise<any>;
}

export class ConvexBuilder<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType | undefined = undefined,
  TInitialContext extends Context = EmptyObject,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
  TVisibility extends Visibility = "public",
  THasHandler extends boolean = false,
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
  }

  $context<U extends Context>(): ConvexBuilder<
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
    return new ConvexBuilder<
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
  ): ConvexBuilder<
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
    return new ConvexBuilder<
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

  query(): ConvexBuilder<
    TDataModel,
    "query",
    TInitialContext extends EmptyObject
      ? QueryCtx<TDataModel>
      : TInitialContext,
    TCurrentContext extends EmptyObject
      ? QueryCtx<TDataModel>
      : TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
    THasHandler,
    THandlerReturn
  > {
    return new ConvexBuilder<
      TDataModel,
      "query",
      MaybeDefaultContext<TInitialContext, QueryCtx<TDataModel>>,
      MaybeDefaultContext<TCurrentContext, QueryCtx<TDataModel>>,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      THasHandler,
      THandlerReturn
    >({
      ...this.def,
      functionType: "query",
    });
  }

  mutation(): ConvexBuilder<
    TDataModel,
    "mutation",
    TInitialContext extends EmptyObject
      ? MutationCtx<TDataModel>
      : TInitialContext,
    TCurrentContext extends EmptyObject
      ? MutationCtx<TDataModel>
      : TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
    THasHandler,
    THandlerReturn
  > {
    return new ConvexBuilder<
      TDataModel,
      "mutation",
      MaybeDefaultContext<TInitialContext, MutationCtx<TDataModel>>,
      MaybeDefaultContext<TCurrentContext, MutationCtx<TDataModel>>,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      THasHandler,
      THandlerReturn
    >({
      ...this.def,
      functionType: "mutation",
    });
  }

  action(): ConvexBuilder<
    TDataModel,
    "action",
    TInitialContext extends EmptyObject
      ? ActionCtx<TDataModel>
      : TInitialContext,
    TCurrentContext extends EmptyObject
      ? ActionCtx<TDataModel>
      : TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
    THasHandler,
    THandlerReturn
  > {
    return new ConvexBuilder<
      TDataModel,
      "action",
      MaybeDefaultContext<TInitialContext, ActionCtx<TDataModel>>,
      MaybeDefaultContext<TCurrentContext, ActionCtx<TDataModel>>,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      THasHandler,
      THandlerReturn
    >({
      ...this.def,
      functionType: "action",
    });
  }


  input<UInput extends ValidatorInput>(
    validator: UInput
  ): ConvexBuilder<
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

    return new ConvexBuilder<
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
  ): ConvexBuilder<
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

    return new ConvexBuilder<
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

  handler<TReturn>(
    handlerFn: (options: {
      context: TCurrentContext;
      input: InferredArgs<TArgsValidator>;
    }) => Promise<TReturn>
  ): ConvexBuilder<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility,
    true,
    TReturn
  > {
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

    return new ConvexBuilder<
      TDataModel,
      TFunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      true,
      TReturn
    >({
      ...this.def,
      handler: rawHandler as any,
    });
  }

  public(): THasHandler extends true
    ? TFunctionType extends "query"
      ? RegisteredQuery<"public", InferredArgs<TArgsValidator>, Promise<THandlerReturn>>
      : TFunctionType extends "mutation"
        ? RegisteredMutation<"public", InferredArgs<TArgsValidator>, Promise<THandlerReturn>>
        : TFunctionType extends "action"
          ? RegisteredAction<"public", InferredArgs<TArgsValidator>, Promise<THandlerReturn>>
          : never
    : never {
    return this._register("public") as any;
  }

  internal(): THasHandler extends true
    ? TFunctionType extends "query"
      ? RegisteredQuery<"internal", InferredArgs<TArgsValidator>, Promise<THandlerReturn>>
      : TFunctionType extends "mutation"
        ? RegisteredMutation<"internal", InferredArgs<TArgsValidator>, Promise<THandlerReturn>>
        : TFunctionType extends "action"
          ? RegisteredAction<"internal", InferredArgs<TArgsValidator>, Promise<THandlerReturn>>
          : never
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

export function createBuilder<TSchema extends SchemaDefinition<any, boolean>>(
  _schema: TSchema
): ConvexBuilder<
  DataModelFromSchemaDefinition<TSchema>,
  undefined,
  EmptyObject,
  EmptyObject,
  undefined,
  undefined,
  "public",
  false,
  any
> {
  return new ConvexBuilder({
    middlewares: [],
    visibility: "public",
  });
}
