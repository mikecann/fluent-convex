import type { z } from "zod";
import { zodToConvex } from "convex-helpers/server/zod";
import type {
  PropertyValidators,
  GenericValidator,
  Validator,
} from "convex/values";
import type { ConvexArgsValidator } from "./types";

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

// Helper type to convert ValidatorInput to a proper ConvexArgsValidator while preserving types
export type ToConvexArgsValidator<T extends ValidatorInput> =
  T extends z.ZodObject<infer Shape>
    ? {
        [K in keyof Shape]: Shape[K] extends z.ZodType<infer Output>
          ? Validator<
              Output,
              Shape[K] extends z.ZodOptional<any> ? "optional" : "required",
              any
            >
          : never;
      }
    : T extends z.ZodEffects<infer Schema>
      ? Schema extends z.ZodObject<infer Shape>
        ? {
            [K in keyof Shape]: Shape[K] extends z.ZodType<infer FieldOutput>
              ? Validator<
                  FieldOutput,
                  Shape[K] extends z.ZodOptional<any> ? "optional" : "required",
                  any
                >
              : never;
          }
        : ConvexArgsValidator
      : T extends ConvexArgsValidator
        ? T
        : ConvexArgsValidator;

// Helper type to convert ReturnsValidatorInput to a proper ConvexReturnsValidator while preserving types
export type ToConvexReturnsValidator<T extends ReturnsValidatorInput> =
  T extends z.ZodType<infer Output>
    ? Validator<Output, "required", any>
    : T extends GenericValidator
      ? T
      : GenericValidator;
