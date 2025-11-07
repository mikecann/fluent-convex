import type { z } from "zod";
import { zodToConvex } from "convex-helpers/server/zod";
import type { PropertyValidators, GenericValidator } from "convex/values";

// Type guard to check if something is a Zod schema
export function isZodSchema(value: any): value is z.ZodTypeAny {
  return (
    value && typeof value === "object" && "_def" in value && "parse" in value
  );
}

// Convert Zod schema to Convex validator
export function toConvexValidator<T extends z.ZodTypeAny>(
  schema: T,
): PropertyValidators | GenericValidator {
  return zodToConvex(schema) as any;
}

// Type-level utilities
export type IsZodObject<T> = T extends z.ZodObject<any> ? true : false;
export type IsZodType<T> = T extends z.ZodType ? true : false;

// Extract Zod schema type
export type InferZodType<T extends z.ZodType> = z.infer<T>;

// Unified input type that accepts both Convex and Zod
// Note: ZodEffects is for .refine() and other transformations
// Convex accepts both PropertyValidators ({ key: v.type() }) and GenericValidator (v.object({ key: v.type() }))
export type ValidatorInput =
  | PropertyValidators
  | GenericValidator
  | z.ZodObject<any>
  | z.ZodEffects<any>;
export type ReturnsValidatorInput = GenericValidator | z.ZodType;
