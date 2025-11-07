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
import {
  isZodSchema,
  toConvexValidator,
  type ValidatorInput,
  type ReturnsValidatorInput,
} from "./zod_support";

type InferredArgs<T extends ConvexArgsValidator | undefined> =
  T extends ConvexArgsValidator ? InferArgs<T> : Record<never, never>;

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
    >
  ) {
    this.def = def;
  }

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

  middleware<UOutContext extends Context>(
    middleware: ConvexMiddleware<TInitialContext, UOutContext>
  ): ConvexMiddleware<TInitialContext, UOutContext> {
    return middleware;
  }

  use<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
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

  input<UInput extends ValidatorInput>(
    validator: UInput
  ): ConvexBuilder<
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    ConvexArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ConvexArgsValidator)
      : (validator as ConvexArgsValidator);

    return new ConvexBuilder({
      ...this.def,
      argsValidator: convexValidator,
    }) as any;
  }

  returns<UReturns extends ReturnsValidatorInput>(
    validator: UReturns
  ): ConvexBuilder<
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    TArgsValidator,
    ConvexReturnsValidator,
    TVisibility
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ConvexReturnsValidator)
      : (validator as ConvexReturnsValidator);

    return new ConvexBuilder({
      ...this.def,
      returnsValidator: convexValidator,
    }) as any;
  }

  handler<TReturn>(
    handlerFn: (options: {
      context: TCurrentContext;
      input: InferredArgs<TArgsValidator>;
    }) => Promise<TReturn>
  ): TFunctionType extends "query"
    ? RegisteredQuery<TVisibility, InferredArgs<TArgsValidator>, Promise<TReturn>>
    : TFunctionType extends "mutation"
      ? RegisteredMutation<TVisibility, InferredArgs<TArgsValidator>, Promise<TReturn>>
      : TFunctionType extends "action"
        ? RegisteredAction<TVisibility, InferredArgs<TArgsValidator>, Promise<TReturn>>
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
        "Function type not set. Call .query(), .mutation(), or .action() first."
      );
    }

    const composedHandler = async (
      baseCtx: QueryCtx | MutationCtx | ActionCtx,
      baseArgs: InferredArgs<TArgsValidator>
    ) => {
      let currentContext: any = baseCtx;

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

    return registrationFn(config) as any;
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
