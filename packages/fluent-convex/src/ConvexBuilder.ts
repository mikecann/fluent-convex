import type { GenericDataModel } from "convex/server";
import { InferredArgs } from "./types";
import { InferHandlerReturn } from "./types";
import { ConvexBuilderDef } from "./types";
import { CallableBuilder } from "./types";
import { ConvexBuilderWithHandler } from "./ConvexBuilderWithHandler";
import type { ConvexMiddleware, AnyConvexMiddleware } from "./middleware";
import type {
  FunctionType,
  Context,
  EmptyObject,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "./types";
import {
  type ValidatorInput,
  type ToConvexArgsValidator,
  isZodSchema,
  toConvexValidator,
  type ReturnsValidatorInput,
  type ToConvexReturnsValidator,
} from "./zod_support";

export class ConvexBuilder<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType | undefined = undefined,
  TInitialContext extends Context = EmptyObject,
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

  query(
    this: ConvexBuilder<
      TDataModel,
      undefined,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >
  ): ConvexBuilder<
    TDataModel,
    "query",
    QueryCtx<TDataModel>,
    QueryCtx<TDataModel>
  > {
    return new ConvexBuilder({
      ...this.def,
      functionType: "query",
    }) as any;
  }

  mutation(
    this: ConvexBuilder<
      TDataModel,
      undefined,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >
  ): ConvexBuilder<
    TDataModel,
    "mutation",
    MutationCtx<TDataModel>,
    MutationCtx<TDataModel>
  > {
    return new ConvexBuilder({
      ...this.def,
      functionType: "mutation",
    }) as any;
  }

  action(
    this: ConvexBuilder<
      TDataModel,
      undefined,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >
  ): ConvexBuilder<
    TDataModel,
    "action",
    ActionCtx<TDataModel>,
    ActionCtx<TDataModel>
  > {
    return new ConvexBuilder({
      ...this.def,
      functionType: "action",
    }) as any;
  }

  $context<U extends Context>(): ConvexBuilder<
    TDataModel,
    TFunctionType,
    U & EmptyObject,
    U,
    TArgsValidator,
    TReturnsValidator
  > {
    return new ConvexBuilder({
      ...this.def,
      middlewares: [],
    }) as any;
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
    this: ConvexBuilder<
      TDataModel,
      FunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >,
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
  ): ConvexBuilder<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator
  > {
    return new ConvexBuilder({
      ...this.def,
      middlewares: [...this.def.middlewares, middleware as AnyConvexMiddleware],
    }) as any;
  }

  input<UInput extends ValidatorInput>(
    this: ConvexBuilder<
      TDataModel,
      FunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >,
    validator: UInput
  ): ConvexBuilder<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    ToConvexArgsValidator<UInput>,
    TReturnsValidator
  > {
    const convexValidator = (
      isZodSchema(validator) ? toConvexValidator(validator) : validator
    ) as ToConvexArgsValidator<UInput>;

    return new ConvexBuilder({
      ...this.def,
      argsValidator: convexValidator,
    }) as any;
  }

  returns<UReturns extends ReturnsValidatorInput>(
    this: ConvexBuilder<
      TDataModel,
      FunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >,
    validator: UReturns
  ): ConvexBuilder<
    TDataModel,
    TFunctionType,
    TInitialContext,
    TCurrentContext,
    TArgsValidator,
    ToConvexReturnsValidator<UReturns>
  > {
    const convexValidator = (
      isZodSchema(validator) ? toConvexValidator(validator) : validator
    ) as ToConvexReturnsValidator<UReturns>;

    return new ConvexBuilder({
      ...this.def,
      returnsValidator: convexValidator,
    }) as any;
  }

  handler<
    TReturn extends InferHandlerReturn<
      TReturnsValidator,
      any
    > = InferHandlerReturn<TReturnsValidator, any>,
  >(
    this: ConvexBuilder<
      TDataModel,
      FunctionType,
      TInitialContext,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >,
    handlerFn: (options: {
      context: TCurrentContext;
      input: InferredArgs<TArgsValidator>;
    }) => Promise<TReturn>
  ): ConvexBuilderWithHandler<
    TDataModel,
    TFunctionType & FunctionType,
    TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    InferHandlerReturn<TReturnsValidator, TReturn>
  > &
    CallableBuilder<
      TCurrentContext,
      TArgsValidator,
      InferHandlerReturn<TReturnsValidator, TReturn>
    > {
    if (this.def.handler) {
      throw new Error(
        "Handler already defined. Only one handler can be set per function chain."
      );
    }

    const rawHandler = async (
      transformedCtx: Context,
      baseArgs: InferredArgs<TArgsValidator>
    ) => {
      return handlerFn({
        context: transformedCtx as TCurrentContext,
        input: baseArgs,
      });
    };

    type InferredReturn = InferHandlerReturn<TReturnsValidator, TReturn>;

    return new ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType & FunctionType,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator,
      InferredReturn
    >({
      ...this.def,
      handler: rawHandler as any,
    } as any) as any;
  }
}
