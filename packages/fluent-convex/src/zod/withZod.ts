import type { z } from "zod/v4";
import { zodToConvex, zodOutputToConvex } from "convex-helpers/server/zod4";
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
  handlerArgsType,
  handlerReturnType,
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
  // safeParseAsync so async refinements (`.refine(async ...)`) work. Only the
  // schema's own validation failures become a client-visible ConvexError. An
  // error thrown inside a user callback (even a ZodError from a nested parse)
  // propagates untouched and stays hidden in production, because its paths and
  // messages can describe server-side data. Throw a ConvexError from the
  // callback if you want the client to see it.
  const parsed = await schema.safeParseAsync(args);
  if (!parsed.success) throw toConvexError(parsed.error.issues);
  return parsed.data;
}

type PublicScalar = string | number | boolean | null;

/** The shape of each entry in a ConvexError's `data.ZodError`. */
export type PublicZodIssue = {
  code: string;
  message: string;
  path: (string | number)[];
  /** Branch failures of an `invalid_union` issue, one list per branch. */
  errors?: PublicZodIssue[][];
  /** Nested failures, e.g. a record key that failed its key schema. */
  issues?: PublicZodIssue[];
  [field: string]:
    | PublicScalar
    | PublicScalar[]
    | PublicZodIssue[]
    | PublicZodIssue[][]
    | undefined;
};

// `input` can hold whatever a parse saw (e.g. with reportInput) and `params` is
// free-form refine metadata, so neither goes to clients.
const DROPPED_ISSUE_FIELDS = new Set(["input", "params", "inst", "def"]);
const SAFE_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
// Unions inside unions inside unions: stop somewhere sane.
const MAX_ISSUE_DEPTH = 8;
// A wide union inside an array can turn a small input into tens of thousands
// of branch issues, so the whole error carries at most this many, shared
// across every level. Clients only need the first few to explain the failure.
const MAX_PUBLIC_ISSUES = 100;

type IssueBudget = { remaining: number };

function toPublicScalar(value: unknown): PublicScalar | undefined {
  if (typeof value === "bigint") return value.toString();
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return undefined;
}

function toPublicIssues(
  issues: unknown,
  depth: number,
  budget: IssueBudget
): PublicZodIssue[] {
  const out: PublicZodIssue[] = [];
  if (!Array.isArray(issues)) return out;
  for (const issue of issues) {
    if (budget.remaining <= 0) break;
    budget.remaining--;
    out.push(toPublicIssue(issue, depth, budget));
  }
  return out;
}

/**
 * Rebuild each issue from plain values only: code, message, path, scalar
 * fields like `minimum` or `expected`, arrays of scalars like `keys`, and the
 * nested issues Zod uses for unions (`errors`) and record keys (`issues`).
 * Everything else is dropped. That keeps the data a valid Convex value (no
 * cycles, no "$" keys, bigints as strings), which matters because Convex runs
 * convexToJson on it and a failure there turns the error back into "Server
 * Error", and it keeps user metadata attached to issues off the wire.
 */
function toPublicIssue(
  issue: unknown,
  depth: number,
  budget: IssueBudget
): PublicZodIssue {
  const raw = (
    typeof issue === "object" && issue !== null ? issue : {}
  ) as Record<string, unknown>;
  const out: PublicZodIssue = {
    code: String(raw.code ?? "custom"),
    message: String(raw.message ?? "Invalid input"),
    path: Array.isArray(raw.path)
      ? raw.path.map((p) => (typeof p === "number" ? p : String(p)))
      : [],
  };
  for (const [key, value] of Object.entries(raw)) {
    if (key in out || DROPPED_ISSUE_FIELDS.has(key) || !SAFE_KEY.test(key)) {
      continue;
    }
    if (key === "errors" || key === "issues") {
      if (depth >= MAX_ISSUE_DEPTH || !Array.isArray(value)) continue;
      if (key === "errors") {
        const branches: PublicZodIssue[][] = [];
        for (const branch of value) {
          if (budget.remaining <= 0) break;
          branches.push(toPublicIssues(branch, depth + 1, budget));
        }
        out.errors = branches;
      } else {
        out.issues = toPublicIssues(value, depth + 1, budget);
      }
      continue;
    }
    if (Array.isArray(value)) {
      const scalars = value.slice(0, MAX_PUBLIC_ISSUES).map(toPublicScalar);
      if (scalars.every((v) => v !== undefined)) {
        out[key] = scalars as PublicScalar[];
      }
      continue;
    }
    const scalar = toPublicScalar(value);
    if (scalar !== undefined) out[key] = scalar;
  }
  return out;
}

function toConvexError(
  issues: unknown[]
): ConvexError<{ ZodError: PublicZodIssue[] }> {
  return new ConvexError({
    ZodError: toPublicIssues(issues, 0, { remaining: MAX_PUBLIC_ISSUES }),
  });
}

// ---------- Type helpers ----------

export type ValidatorInput =
  | PropertyValidators
  | GenericValidator
  | z.ZodObject<any>;

export type ReturnsValidatorInput = GenericValidator | z.ZodType;

// ---- Client-side arg types ----
// These follow how zodToConvex builds the registered Convex validator, by the
// schema's structure, so clients are typed by what Convex will accept before
// Zod runs. Zod's own z.input isn't enough: `z.coerce.number()` has input
// `unknown` but registers `v.number()`, and `.passthrough()` allows extra keys
// that the registered `v.object()` rejects.
//
// convex-helpers has an exact type for this (ConvexValidatorFromZod), but
// referencing it from our .d.ts makes consumers with `skipLibCheck: false`
// type-check its zod4.d.ts, which currently fails there with TS2589.

/**
 * `.optional()` and `.default()` are what make a registered field optional,
 * including when they sit inside a wrapper the converter looks through (the
 * input stage of a pipe, `.nullable()`, `.readonly()`, `.catch()`, `z.lazy()`).
 */
type IsOptionalField<F> =
  F extends z.ZodOptional<any> | z.ZodDefault<any>
    ? true
    : F extends z.ZodPipe<infer In, any>
      ? IsOptionalField<In>
      : F extends
            | z.ZodNullable<infer Inner>
            | z.ZodReadonly<infer Inner>
            | z.ZodCatch<infer Inner>
            | z.ZodLazy<infer Inner>
        ? IsOptionalField<Inner>
        : false;

/** The value a client may send for a schema, per the registered validator. */
type ClientValue<F> =
  // `.transform()` is a pipe from the original schema: Convex checks the input stage.
  F extends z.ZodPipe<infer In, any>
    ? ClientValue<In>
    : // z.preprocess's first stage is a bare transform, registered as v.any().
      F extends z.ZodTransform<any, any>
      ? any
      : F extends z.ZodDefault<infer Inner> | z.ZodOptional<infer Inner>
        ? ClientValue<Inner> | undefined
        : F extends z.ZodNullable<infer Inner>
          ? ClientValue<Inner> | null
          : F extends z.ZodObject<infer Shape>
            ? ClientObject<Shape>
            : F extends z.ZodArray<infer Element>
              ? ClientValue<Element>[]
              : F extends z.ZodUnion<infer Options>
                ? ClientValue<Options[number]>
                : F extends z.ZodRecord<infer Key, infer Value>
                  ? IsOptionalField<Value> extends true
                    ? Partial<Record<z.output<Key> & PropertyKey, ClientValue<Value>>>
                    : Record<z.output<Key> & PropertyKey, ClientValue<Value>>
                  : F extends z.ZodTuple<infer Items, infer Rest>
                    ? ClientTuple<Items, Rest>
                    : // `.required()` on an object wraps each field like this.
                      F extends z.ZodNonOptional<infer Inner>
                      ? Exclude<ClientValue<Inner>, undefined>
                      : // Wrappers the converter unwraps.
                      F extends
                          | z.ZodCatch<infer Inner>
                          | z.ZodReadonly<infer Inner>
                          | z.ZodLazy<infer Inner>
                      ? ClientValue<Inner>
                      : // Leaves (strings, numbers incl. z.coerce, literals,
                        // enums, ...) register as their plain type.
                        z.output<F>;

type ClientTuple<Items, Rest> = Items extends readonly unknown[]
  ? Rest extends z.ZodType
    ? [...{ [I in keyof Items]: ClientValue<Items[I]> }, ...ClientValue<Rest>[]]
    : { [I in keyof Items]: ClientValue<Items[I]> }
  : never;

type ClientObject<Shape> = {
  [K in keyof Shape as IsOptionalField<Shape[K]> extends true
    ? never
    : K]: ClientValue<Shape[K]>;
} & {
  [K in keyof Shape as IsOptionalField<Shape[K]> extends true
    ? K
    : never]?: ClientValue<Shape[K]>;
};

/**
 * Args for a Zod object schema: one Convex validator type per declared field,
 * typed by what the client may send. The handler gets Zod's parsed output,
 * carried on the type-only `handlerArgsType` key.
 */
type ZodObjectArgsValidator<T extends z.ZodObject<any>> = {
  [K in keyof T["shape"]]: Validator<
    ClientValue<T["shape"][K]>,
    IsOptionalField<T["shape"][K]> extends true ? "optional" : "required",
    any
  >;
} & { readonly [handlerArgsType]: z.output<T> };

export type ToConvexArgsValidator<T extends ValidatorInput> =
  T extends z.ZodObject<any>
    ? ZodObjectArgsValidator<T>
    : T extends ConvexArgsValidator
      ? T
      : ConvexArgsValidator;

/**
 * Returns for a Zod schema: the client gets Zod's *output* type (what the
 * registered zodOutputToConvex validator checks), while the handler returns
 * the *input* type, which the schema then parses/transforms.
 */
export type ToConvexReturnsValidator<T extends ReturnsValidatorInput> =
  T extends z.ZodType
    ? Validator<z.output<T>, "required", any> & {
        readonly [handlerReturnType]: z.input<T>;
      }
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
      // Convex checks the value *after* returnsTransform has run, so this has
      // to describe Zod's output side. With zodToConvex (the input side) a
      // `.transform()` made every call fail Convex's return validation.
      const convexValidator = zodOutputToConvex(validator as any) as any;
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
