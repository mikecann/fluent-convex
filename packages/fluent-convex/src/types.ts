import type { PropertyValidators, GenericValidator } from "convex/values";
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";

export type Context = Record<PropertyKey, any>;

export type ConvexArgsValidator = PropertyValidators | GenericValidator;
export type ConvexReturnsValidator = GenericValidator;

export type InferArgs<T extends ConvexArgsValidator> =
  T extends GenericValidator
    ? T["type"]
    : {
        [K in keyof T]: T[K] extends GenericValidator
          ? T[K]["isOptional"] extends true
            ? T[K]["type"] | undefined
            : T[K]["type"]
          : never;
      };

export type Promisable<T> = T | PromiseLike<T>;

export type QueryCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericQueryCtx<DataModel>;
export type MutationCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericMutationCtx<DataModel>;
export type ActionCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericActionCtx<DataModel>;

export type FunctionType = "query" | "mutation" | "action";
export type Visibility = "public" | "internal";
