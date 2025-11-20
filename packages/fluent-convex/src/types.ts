import type { PropertyValidators, GenericValidator } from "convex/values";
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type { AnyConvexMiddleware } from "./middleware";

export type Context = object;

export type ConvexArgsValidator = PropertyValidators | GenericValidator;
export type ConvexReturnsValidator = GenericValidator;

type ValidatorType<T> = T extends GenericValidator ? T["type"] : never;

export type EmptyObject = Record<never, never>;

export type MaybeDefaultContext<
  TExisting extends Context,
  TFallback extends Context,
> = TExisting extends EmptyObject ? TFallback : TExisting;

type OptionalKeys<T extends Record<PropertyKey, any>> = {
  [K in keyof T]: T[K] extends GenericValidator
    ? T[K]["isOptional"] extends "optional"
      ? K
      : never
    : never;
}[keyof T];

type RequiredKeys<T extends Record<PropertyKey, any>> = {
  [K in keyof T]: T[K] extends GenericValidator
    ? T[K]["isOptional"] extends "optional"
      ? never
      : K
    : never;
}[keyof T];

type OptionalArgs<T extends Record<PropertyKey, any>> = {
  [K in OptionalKeys<T>]?: T[K] extends GenericValidator
    ? ValidatorType<T[K]> | undefined
    : never;
};

type RequiredArgs<T extends Record<PropertyKey, any>> = {
  [K in RequiredKeys<T>]: ValidatorType<T[K]>;
};

export type InferArgs<T extends ConvexArgsValidator> =
  T extends GenericValidator ? T["type"] : RequiredArgs<T> & OptionalArgs<T>;

export type InferReturns<T extends ConvexReturnsValidator> = ValidatorType<T>;

export type Promisable<T> = T | PromiseLike<T>;

export type QueryCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericQueryCtx<DataModel>;
export type MutationCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericMutationCtx<DataModel>;
export type ActionCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericActionCtx<DataModel>;

export type FunctionType = "query" | "mutation" | "action";
export type Visibility = "public" | "internal"; // Type for a callable ConvexBuilderWithHandler

export type CallableBuilder<
  TCurrentContext extends Context,
  TArgsValidator extends ConvexArgsValidator | undefined,
  THandlerReturn,
> = {
  (
    context: TCurrentContext
  ): (args: InferredArgs<TArgsValidator>) => Promise<THandlerReturn>;
};
export interface ConvexBuilderDef<
  TFunctionType extends FunctionType | undefined = undefined,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
> {
  functionType?: TFunctionType;
  middlewares: readonly AnyConvexMiddleware[];
  argsValidator?: TArgsValidator;
  returnsValidator?: TReturnsValidator;
  handler?: (context: Context, input: any) => Promise<any>;
}
export type ExpectedReturnType<
  TReturnsValidator extends ConvexReturnsValidator | undefined,
> = TReturnsValidator extends ConvexReturnsValidator
  ? InferReturns<TReturnsValidator>
  : any;

export type InferredHandlerReturn<
  TReturnsValidator extends ConvexReturnsValidator | undefined,
  TReturn,
> = [TReturnsValidator] extends [ConvexReturnsValidator]
  ? ExpectedReturnType<TReturnsValidator>
  : TReturn;

export type InferredArgs<T extends ConvexArgsValidator | undefined> =
  T extends ConvexArgsValidator ? InferArgs<T> : EmptyObject;
