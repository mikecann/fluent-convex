import type { GenericDataModel } from "convex/server";
import { ConvexBuilderWithHandler } from "./ConvexBuilderWithHandler";
import { InferredArgs, InferredHandlerReturn } from "./types";
import { ConvexBuilderDef } from "./types";
import { CallableBuilder } from "./types";
import type { ConvexMiddleware, AnyConvexMiddleware } from "./middleware";
import type {
  FunctionType,
  Context,
  EmptyObject,
  ConvexArgsValidator,
  ConvexReturnsValidator,
} from "./types";
import {
  type ValidatorInput,
  type ToConvexArgsValidator,
  isZodSchema,
  toConvexValidator,
  type ReturnsValidatorInput,
  type ToConvexReturnsValidator,
} from "./zod_support";

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

  $context<U extends Context>(): ConvexBuilderWithFunctionKind<
    TDataModel,
    TFunctionType,
    U,
    TArgsValidator,
    TReturnsValidator
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      U,
      TArgsValidator,
      TReturnsValidator
    >({
      ...this.def,
      middlewares: [],
    });
  }

  middleware<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
  ): ConvexMiddleware<TCurrentContext, UOutContext>;
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
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext & UOutContext,
      TArgsValidator,
      TReturnsValidator
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
    TCurrentContext,
    ToConvexArgsValidator<UInput>,
    TReturnsValidator
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ToConvexArgsValidator<UInput>)
      : (validator as ToConvexArgsValidator<UInput>);

    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      ToConvexArgsValidator<UInput>,
      TReturnsValidator
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
    TCurrentContext,
    TArgsValidator,
    ToConvexReturnsValidator<UReturns>
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ToConvexReturnsValidator<UReturns>)
      : (validator as ToConvexReturnsValidator<UReturns>);

    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      TArgsValidator,
      ToConvexReturnsValidator<UReturns>
    >({
      ...this.def,
      returnsValidator: convexValidator,
    });
  }

  handler<
    TReturn extends InferredHandlerReturn<
      TReturnsValidator,
      any
    > = InferredHandlerReturn<TReturnsValidator, any>,
  >(
    handlerFn: (
      context: TCurrentContext,
      input: InferredArgs<TArgsValidator>
    ) => Promise<TReturn>
  ): ConvexBuilderWithHandler<
    TDataModel,
    TFunctionType,
    TCurrentContext,
    TArgsValidator,
    TReturnsValidator,
    InferredHandlerReturn<TReturnsValidator, TReturn>
  > &
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
      baseArgs: InferredArgs<TArgsValidator>
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
      CallableBuilder<TCurrentContext, TArgsValidator, InferredReturn>;
  }
}
