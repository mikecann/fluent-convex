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

export type QueryCtx = GenericQueryCtx<GenericDataModel>;
export type MutationCtx = GenericMutationCtx<GenericDataModel>;
export type ActionCtx = GenericActionCtx<GenericDataModel>;

export type FunctionType = "query" | "mutation" | "action";
export type Visibility = "public" | "internal";
