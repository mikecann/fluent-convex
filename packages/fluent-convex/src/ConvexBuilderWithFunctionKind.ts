import type { GenericDataModel } from "convex/server";
import { ConvexBuilderWithHandler } from "./ConvexBuilderWithHandler";
import { InferredArgs } from "./types";
import { ExpectedReturnType } from "./types";
import { ConvexBuilderDef } from "./types";
import { CallableBuilder } from "./types";
import type { ConvexMiddleware, AnyConvexMiddleware } from "./middleware";
import type {
  FunctionType,
  Context,
  EmptyObject,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  Visibility,
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
  TVisibility extends Visibility = "public",
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
    U,
    TArgsValidator,
    TReturnsValidator,
    TVisibility
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      U,
      TArgsValidator,
      TReturnsValidator,
      TVisibility
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
    TReturnsValidator,
    TVisibility
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext & UOutContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility
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
    TReturnsValidator,
    TVisibility
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ToConvexArgsValidator<UInput>)
      : (validator as ToConvexArgsValidator<UInput>);

    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      ToConvexArgsValidator<UInput>,
      TReturnsValidator,
      TVisibility
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
    ToConvexReturnsValidator<UReturns>,
    TVisibility
  > {
    const convexValidator = isZodSchema(validator)
      ? (toConvexValidator(validator) as ToConvexReturnsValidator<UReturns>)
      : (validator as ToConvexReturnsValidator<UReturns>);

    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      TArgsValidator,
      ToConvexReturnsValidator<UReturns>,
      TVisibility
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
      return handlerFn(transformedCtx as TCurrentContext, baseArgs);
    };

    type InferredReturn = [TReturnsValidator] extends [ConvexReturnsValidator]
      ? ExpectedReturnType<TReturnsValidator>
      : TReturn;

    return new ConvexBuilderWithHandler<
      TDataModel,
      TFunctionType,
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
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator,
      TVisibility,
      InferredReturn
    > &
      CallableBuilder<TCurrentContext, TArgsValidator, InferredReturn>;
  }
}
