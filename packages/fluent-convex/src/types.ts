import type { PropertyValidators, GenericValidator } from "convex/values";
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type { AnyConvexMiddleware } from "./middleware.js";

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
  [K in keyof T]-?: T[K] extends GenericValidator
    ? T[K]["isOptional"] extends "optional"
      ? K
      : never
    : never;
}[keyof T];

type RequiredKeys<T extends Record<PropertyKey, any>> = {
  [K in keyof T]-?: T[K] extends GenericValidator
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
    context: TCurrentContext,
    args: InferredArgs<TArgsValidator>
  ): Promise<THandlerReturn>;
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
  /** Optional hook to validate/transform args before the handler runs. Throw to reject. */
  argsTransform?: (args: unknown) => unknown | Promise<unknown>;
  /** Optional hook to validate/transform the return value after the handler runs. Throw to reject. */
  returnsTransform?: (result: unknown) => unknown | Promise<unknown>;
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

/**
 * Type-only keys a plugin can put on its validator types when the handler sees
 * something different from what the client sends or gets back. WithZod uses
 * them because Zod `.default()`s and `.transform()`s run between the two.
 * They're symbols so they never count as an argument or field: Convex's
 * `PropertyValidators` is a string-keyed record. Nothing exists at runtime.
 */
export declare const handlerArgsType: unique symbol;
export declare const handlerReturnType: unique symbol;

// The keys are required (on the type only), so their presence can be checked
// directly and `unknown`/`any`/`undefined` handler types survive intact.

/** What `.handler()` receives: the plugin's parsed args type, if it set one. */
export type HandlerArgs<T extends ConvexArgsValidator | undefined> =
  T extends { readonly [handlerArgsType]: infer H } ? H : InferredArgs<T>;

/** What `.handler()` must return when `.returns()` is set. */
export type HandlerReturn<
  TReturnsValidator extends ConvexReturnsValidator | undefined,
> = TReturnsValidator extends { readonly [handlerReturnType]: infer H }
  ? H
  : InferredHandlerReturn<TReturnsValidator, any>;

type SameType<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * True when the handler sees the same types a direct caller does. `.handler()`
 * intersects the user's own function type into its result so ctrl+click on a
 * call lands on their code, but when a plugin's types differ (Zod transforms or
 * defaults) that extra signature would let calls through with the handler's
 * types instead of the caller's, so it's left off then.
 */
export type HandlerMatchesCaller<
  TArgsValidator extends ConvexArgsValidator | undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined,
> =
  SameType<HandlerArgs<TArgsValidator>, InferredArgs<TArgsValidator>> extends true
    ? SameType<
        HandlerReturn<TReturnsValidator>,
        InferredHandlerReturn<TReturnsValidator, any>
      >
    : false;
