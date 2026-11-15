import type { z } from "zod/v4";
import { zodToConvex } from "convex-helpers/server/zod4";
import type { GenericDataModel } from "convex/server";
import { ConvexError } from "convex/values";
import type {
  PropertyValidators,
  GenericValidator,
  Validator,
} from "convex/values";
import { ConvexBuilderWithFunctionKind } from "../ConvexBuilderWithFunctionKind.js";
import type { ConvexMiddleware } from "../middleware.js";
import type {
  FunctionType,
  Context,
  EmptyObject,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  ConvexBuilderDef,
} from "../types.js";

// ---------- Duck-type Zod detection ----------

export function isZodSchema(value: unknown): value is z.ZodType {
  return (
    value != null &&
    typeof value === "object" &&
    "_zod" in value &&
    "parse" in value
  );
}

/**
 * Zod 3 schemas have `_def` but no `_zod`. They can't be converted, and without
 * this check they'd fall through to the plain Convex path and fail later with a
 * confusing "entries must be validators" error at registration.
 */
function assertNotZod3(value: unknown): void {
  if (
    value != null &&
    typeof value === "object" &&
    "_def" in value &&
    "parse" in value &&
    !("_zod" in value)
  ) {
    throw new Error(
      'fluent-convex/zod needs Zod 4 schemas. On zod 3.25+, import { z } from "zod/v4".'
    );
  }
}

/**
 * Validate args with the schema. A failure is thrown as a ConvexError, the same
 * shape convex-helpers' zCustomQuery uses ({ ZodError: issues }), because Convex
 * replaces the message of any other error with "Server Error" in production and
 * the client would never see why its input was rejected.
 */
async function parseArgs(schema: z.ZodType, args: unknown): Promise<unknown> {
  let parsed;
  try {
    // safeParseAsync so async refinements (`.refine(async ...)`) work.
    parsed = await schema.safeParseAsync(args);
  } catch (e) {
    // safeParse only catches its own checks. A ZodError thrown from inside a
    // user callback (e.g. `.transform(s => other.parse(s))`) propagates, and is
    // still a validation failure the client should see. Anything else is a
    // server bug and stays hidden.
    if (isZodError(e)) throw toConvexError(e.issues);
    throw e;
  }
  if (!parsed.success) throw toConvexError(parsed.error.issues);
  return parsed.data;
}

/**
 * Classic `.parse()` throws ZodError, zod/v4/core's parse throws $ZodError, and
 * errors built with `new z.ZodError(...)` don't extend native Error in Zod 4,
 * so match on the name Zod sets and the issues array rather than instanceof.
 */
function isZodError(e: unknown): e is { issues: unknown[] } {
  if (typeof e !== "object" || e === null) return false;
  const { name, issues } = e as { name?: unknown; issues?: unknown };
  return (name === "ZodError" || name === "$ZodError") && Array.isArray(issues);
}

/** The shape of each entry in a ConvexError's `data.ZodError`. */
export type PublicZodIssue = {
  code: string;
  message: string;
  path: (string | number)[];
  [field: string]: string | number | boolean | null | (string | number)[];
};

// Issue fields that can carry arbitrary or server-side data. `input` can hold
// whatever a nested parse saw (e.g. with reportInput), `params` is free-form
// refine metadata. Neither is part of the error contract we send to clients.
const DROPPED_ISSUE_FIELDS = new Set(["input", "params", "inst", "def"]);

/**
 * Copy only plain values off each issue: code, message, path and scalar fields
 * like `minimum`, `expected` or `origin`. Anything nested (union branches,
 * user metadata) is dropped. That keeps the data a valid Convex value (no
 * cycles, no "$" keys, no bigints, which become strings) and keeps whatever a
 * user callback attached to an issue off the wire.
 */
function toPublicIssue(issue: unknown): PublicZodIssue {
  const raw = (typeof issue === "object" && issue !== null ? issue : {}) as Record<
    string,
    unknown
  >;
  const out: PublicZodIssue = {
    code: String(raw.code ?? "custom"),
    message: String(raw.message ?? "Invalid input"),
    path: Array.isArray(raw.path)
      ? raw.path.map((p) => (typeof p === "number" ? p : String(p)))
      : [],
  };
  for (const [key, value] of Object.entries(raw)) {
    if (key in out || DROPPED_ISSUE_FIELDS.has(key)) continue;
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) continue;
    if (typeof value === "bigint") out[key] = value.toString();
    else if (
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out;
}

function toConvexError(issues: unknown[]): ConvexError<{ ZodError: PublicZodIssue[] }> {
  return new ConvexError({ ZodError: issues.map(toPublicIssue) });
}

// ---------- Type helpers ----------

export type ValidatorInput =
  | PropertyValidators
  | GenericValidator
  | z.ZodObject<any>;

export type ReturnsValidatorInput = GenericValidator | z.ZodType;

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
    : T extends ConvexArgsValidator
      ? T
      : ConvexArgsValidator;

export type ToConvexReturnsValidator<T extends ReturnsValidatorInput> =
  T extends z.ZodType<infer Output>
    ? Validator<Output, "required", any>
    : T extends GenericValidator
      ? T
      : GenericValidator;

// ---------- WithZod plugin class ----------

/**
 * Zod plugin for fluent-convex. Extends the builder to accept Zod schemas
 * in `.input()` and `.returns()`, with full runtime validation including
 * refinements (`.min()`, `.max()`, `.email()`, etc.).
 *
 * Usage:
 * ```ts
 * import { WithZod } from "fluent-convex/zod";
 *
 * export const myQuery = convex
 *   .query()
 *   .extend(WithZod)
 *   .input(z.object({ count: z.number().min(1).max(100) }))
 *   .handler(async (ctx, input) => { ... })
 *   .public();
 * ```
 */
export class WithZod<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
> extends ConvexBuilderWithFunctionKind<
  TDataModel,
  TFunctionType,
  TCurrentContext,
  TArgsValidator,
  TReturnsValidator
> {
  constructor(
    builderOrDef:
      | ConvexBuilderWithFunctionKind<
          TDataModel,
          TFunctionType,
          TCurrentContext,
          TArgsValidator,
          TReturnsValidator
        >
      | ConvexBuilderDef<TFunctionType, TArgsValidator, TReturnsValidator>
  ) {
    // Accept either a builder instance (from .extend()) or a raw def (from _clone())
    const def =
      builderOrDef instanceof ConvexBuilderWithFunctionKind
        ? (builderOrDef as any).def
        : builderOrDef;
    super(def);
  }

  /**
   * Preserve WithZod through the chain. When .use(), .input(), .returns()
   * create a new builder, they call _clone() which returns a new WithZod.
   */
  protected _clone(def: ConvexBuilderDef<any, any, any>): any {
    return new WithZod(def);
  }

  /**
   * Override use() to return WithZod type (runtime behavior is inherited from base).
   *
   * The suppression has to live on the last line of this doc comment, not in a
   * `//` comment: tsc drops `//` comments from the emitted .d.ts, and without it
   * consumers with `skipLibCheck: false` get TS2416 on this override.
   * @ts-ignore -- narrows return type from base to WithZod */
  use<UOutContext extends Context>(
    middleware: ConvexMiddleware<TCurrentContext, UOutContext>
  ): WithZod<
    TDataModel,
    TFunctionType,
    TCurrentContext & UOutContext,
    TArgsValidator,
    TReturnsValidator
  > {
    return super.use(middleware) as any;
  }

  /**
   * Accepts Zod schemas in addition to Convex validators.
   * When a Zod schema is detected, converts to Convex validator and sets
   * argsTransform for full runtime validation including refinements.
   * @ts-ignore -- widens the parameter to accept Zod schemas (see use() above) */
  input<UInput extends ValidatorInput>(
    validator: UInput
  ): WithZod<
    TDataModel,
    TFunctionType,
    TCurrentContext,
    ToConvexArgsValidator<UInput>,
    TReturnsValidator
  > {
    if (isZodSchema(validator)) {
      const convexValidator = zodToConvex(validator as any) as any;
      return this._clone({
        ...(this as any).def,
        argsValidator: convexValidator,
        argsTransform: (args: unknown) =>
          parseArgs(validator as unknown as z.ZodType, args),
      });
    }
    assertNotZod3(validator);
    // Delegate to base for plain Convex validators
    return (
      ConvexBuilderWithFunctionKind.prototype.input as any
    ).call(this, validator);
  }

  /**
   * Accepts Zod schemas in addition to Convex validators.
   * When a Zod schema is detected, converts to Convex validator and sets
   * returnsTransform for full runtime validation including refinements.
   * @ts-ignore -- widens the parameter to accept Zod schemas (see use() above) */
  returns<UReturns extends ReturnsValidatorInput>(
    validator: UReturns
  ): WithZod<
    TDataModel,
    TFunctionType,
    TCurrentContext,
    TArgsValidator,
    ToConvexReturnsValidator<UReturns>
  > {
    if (isZodSchema(validator)) {
      const convexValidator = zodToConvex(validator as any) as any;
      return this._clone({
        ...(this as any).def,
        returnsValidator: convexValidator,
        // A bad return value is a bug in the handler, not the caller, so this
        // stays a plain error (hidden from clients in production), like
        // convex-helpers does. parseAsync so async refinements work.
        returnsTransform: (result: unknown) =>
          (validator as unknown as z.ZodType).parseAsync(result),
      });
    }
    assertNotZod3(validator);
    // Delegate to base for plain Convex validators
    return (
      ConvexBuilderWithFunctionKind.prototype.returns as any
    ).call(this, validator);
  }
}
