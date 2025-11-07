import type { PropertyValidators, GenericValidator } from "convex/values";
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";

// Context type
export type Context = Record<PropertyKey, any>;

// Convex validator types
// Convex accepts both PropertyValidators ({ key: v.type() }) and ObjectValidator (v.object({ key: v.type() }))
export type ConvexArgsValidator = PropertyValidators | GenericValidator;
export type ConvexReturnsValidator = GenericValidator;

// Infer types from Convex validators
export type InferArgs<T extends ConvexArgsValidator> =
  T extends GenericValidator
    ? T["type"] // If it's v.object(), extract the type directly
    : {
        // If it's PropertyValidators, infer from each property
        [K in keyof T]: T[K] extends GenericValidator
          ? T[K]["isOptional"] extends true
            ? T[K]["type"] | undefined
            : T[K]["type"]
          : never;
      };

export type InferReturns<T extends ConvexReturnsValidator> = T["type"];

// Convex context types
export type QueryCtx = GenericQueryCtx<GenericDataModel>;
export type MutationCtx = GenericMutationCtx<GenericDataModel>;
export type ActionCtx = GenericActionCtx<GenericDataModel>;

// Function types
export type FunctionType = "query" | "mutation" | "action";
export type Visibility = "public" | "internal";
