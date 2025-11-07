import type { z } from "zod";
import { zodToConvex } from "convex-helpers/server/zod";
import type { PropertyValidators, GenericValidator } from "convex/values";

export function isZodSchema(value: any): value is z.ZodTypeAny {
  return (
    value && typeof value === "object" && "_def" in value && "parse" in value
  );
}

export function toConvexValidator<T extends z.ZodTypeAny>(
  schema: T
): PropertyValidators | GenericValidator {
  return zodToConvex(schema) as any;
}

export type ValidatorInput =
  | PropertyValidators
  | GenericValidator
  | z.ZodObject<any>
  | z.ZodEffects<any>;

export type ReturnsValidatorInput = GenericValidator | z.ZodType;
