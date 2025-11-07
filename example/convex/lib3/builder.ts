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
} from "./types";
import type { z } from "zod";
import {
  isZodSchema,
  toConvexValidator,
  type ValidatorInput,
  type ReturnsValidatorInput,
  type InferZodType,
} from "./zod_support";

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
}

export class ConvexBuilder<
  TFunctionType extends FunctionType | undefined = undefined,
  TInitialContext extends Context = Record<never, never>,
  TCurrentContext extends Context = Record<never, never>,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
  TVisibility extends Visibility = "public",
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
    >,
  ) {
    this.def = def;
  }

  /**
   * Sets the initial context type hint for middleware.
   */
  $context<U extends Context>(): ConvexBuilder<
    TFunctionType,
    U & Record<never, never>,
    U,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    return new ConvexBuilder({
      ...this.def,
      middlewares: [],
    });
  }

  /**
   * Creates a middleware function.
   */
  middleware<UOutContext extends Context>(
    middleware: ConvexMiddleware<TInitialContext, UOutContext>,
  ): ConvexMiddleware<TInitialContext, UOutContext> {
    return middleware;
  }

  /**
   * Applies middleware to the pipeline.
   */
  use<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>,
  ): ConvexBuilder<
    TFunctionType,
    TInitialContext,
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    return new ConvexBuilder({
      ...this.def,
      middlewares: [...this.def.middlewares, middleware],
    });
  }

  /**
   * Sets this as a query function.
   */
  query(): ConvexBuilder<
    "query",
    TInitialContext extends Record<never, never> ? QueryCtx : TInitialContext,
    TCurrentContext extends Record<never, never> ? QueryCtx : TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    return new ConvexBuilder({
      ...this.def,
      functionType: "query",
    }) as any;
  }

  /**
   * Sets this as a mutation function.
   */
  mutation(): ConvexBuilder<
    "mutation",
    TInitialContext extends Record<never, never>
      ? MutationCtx
      : TInitialContext,
    TCurrentContext extends Record<never, never>
      ? MutationCtx
      : TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    return new ConvexBuilder({
      ...this.def,
      functionType: "mutation",
    }) as any;
  }

  /**
   * Sets this as an action function.
   */
  action(): ConvexBuilder<
    "action",
    TInitialContext extends Record<never, never> ? ActionCtx : TInitialContext,
    TCurrentContext extends Record<never, never> ? ActionCtx : TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    return new ConvexBuilder({
      ...this.def,
      functionType: "action",
    }) as any;
  }

  /**
   * Sets the function as internal.
   */
  internal(): ConvexBuilder<
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    "internal"
  > {
    return new ConvexBuilder({
      ...this.def,
      visibility: "internal",
    });
  }

  /**
   * Sets the input validation schema (Convex validators or Zod schema).
   */
  input<UInput extends ValidatorInput>(
    validator: UInput,
  ): ConvexBuilder<
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    ConvexArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    // Convert Zod schema to Convex validator if needed
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ConvexArgsValidator)
      : (validator as ConvexArgsValidator);

    return new ConvexBuilder({
      ...this.def,
      argsValidator: convexValidator,
    }) as any;
  }

  /**
   * Sets the output validation schema (Convex validator or Zod schema).
   */
  returns<UReturns extends ReturnsValidatorInput>(
    validator: UReturns,
  ): ConvexBuilder<
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    TArgsValidator,
    ConvexReturnsValidator,
    TVisibility
  > {
    // Convert Zod schema to Convex validator if needed
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ConvexReturnsValidator)
      : (validator as ConvexReturnsValidator);

    return new ConvexBuilder({
      ...this.def,
      returnsValidator: convexValidator,
    }) as any;
  }

  /**
   * Defines the handler and creates the registered Convex function.
   */
  handler<TReturn>(
    handlerFn: (options: {
      context: TCurrentContext;
      input: TArgsValidator extends ConvexArgsValidator
        ? InferArgs<TArgsValidator>
        : Record<never, never>;
    }) => Promise<TReturn>,
  ): TFunctionType extends "query"
    ? TVisibility extends "public"
      ? RegisteredQuery<
          "public",
          TArgsValidator extends ConvexArgsValidator
            ? InferArgs<TArgsValidator>
            : Record<never, never>,
          Promise<TReturn>
        >
      : RegisteredQuery<
          "internal",
          TArgsValidator extends ConvexArgsValidator
            ? InferArgs<TArgsValidator>
            : Record<never, never>,
          Promise<TReturn>
        >
    : TFunctionType extends "mutation"
      ? TVisibility extends "public"
        ? RegisteredMutation<
            "public",
            TArgsValidator extends ConvexArgsValidator
              ? InferArgs<TArgsValidator>
              : Record<never, never>,
            Promise<TReturn>
          >
        : RegisteredMutation<
            "internal",
            TArgsValidator extends ConvexArgsValidator
              ? InferArgs<TArgsValidator>
              : Record<never, never>,
            Promise<TReturn>
          >
      : TFunctionType extends "action"
        ? TVisibility extends "public"
          ? RegisteredAction<
              "public",
              TArgsValidator extends ConvexArgsValidator
                ? InferArgs<TArgsValidator>
                : Record<never, never>,
              Promise<TReturn>
            >
          : RegisteredAction<
              "internal",
              TArgsValidator extends ConvexArgsValidator
                ? InferArgs<TArgsValidator>
                : Record<never, never>,
              Promise<TReturn>
            >
        : never {
    const {
      functionType,
      middlewares,
      argsValidator,
      returnsValidator,
      visibility,
    } = this.def;

    if (!functionType) {
      throw new Error(
        "Function type not set. Call .query(), .mutation(), or .action() first.",
      );
    }

    // Compose middleware with handler
    const composedHandler = async (
      baseCtx: QueryCtx | MutationCtx | ActionCtx,
      baseArgs: TArgsValidator extends ConvexArgsValidator
        ? InferArgs<TArgsValidator>
        : Record<never, never>,
    ) => {
      let currentContext: any = baseCtx;

      // Run middleware chain
      for (const middleware of middlewares) {
        const result = await middleware({
          context: currentContext,
          next: async (options) => ({ context: options.context }),
        });
        currentContext = result.context;
      }

      return handlerFn({
        context: currentContext as TCurrentContext,
        input: baseArgs,
      });
    };

    // Build Convex config
    const config = {
      args: argsValidator || {},
      ...(returnsValidator ? { returns: returnsValidator } : {}),
      handler: composedHandler,
    } as any;

    // Register with appropriate Convex function
    if (functionType === "query") {
      return (
        visibility === "public"
          ? queryGeneric(config)
          : internalQueryGeneric(config)
      ) as any;
    }

    if (functionType === "mutation") {
      return (
        visibility === "public"
          ? mutationGeneric(config)
          : internalMutationGeneric(config)
      ) as any;
    }

    if (functionType === "action") {
      return (
        visibility === "public"
          ? actionGeneric(config)
          : internalActionGeneric(config)
      ) as any;
    }

    throw new Error(`Unknown function type: ${functionType}`);
  }
}

export const cvx = new ConvexBuilder<
  undefined,
  Record<never, never>,
  Record<never, never>,
  undefined,
  undefined,
  "public"
>({
  middlewares: [],
  visibility: "public",
});
