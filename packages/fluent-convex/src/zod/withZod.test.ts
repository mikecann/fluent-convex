import { describe, it, expect } from "vitest";
import { ConvexError, convexToJson, v } from "convex/values";
import * as zcore from "zod/v4/core";
import { z } from "zod/v4";
import { z as z3 } from "zod/v3";
import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
} from "convex/server";
import { createBuilder } from "../builder.js";
import { ConvexBuilderWithFunctionKind } from "../ConvexBuilderWithFunctionKind.js";
import { WithZod, isZodSchema } from "./withZod.js";

const schema = defineSchema({
  test: defineTable({
    value: v.string(),
  }),
});

const convex = createBuilder<DataModelFromSchemaDefinition<typeof schema>>();

describe("isZodSchema", () => {
  it("should detect Zod schemas", () => {
    expect(isZodSchema(z.string())).toBe(true);
    expect(isZodSchema(z.object({ a: z.number() }))).toBe(true);
    expect(isZodSchema(z.number().min(1))).toBe(true);
  });

  it("should reject non-Zod values", () => {
    expect(isZodSchema(v.string())).toBeFalsy();
    expect(isZodSchema(42)).toBeFalsy();
    expect(isZodSchema(null)).toBeFalsy();
    expect(isZodSchema(undefined)).toBeFalsy();
    expect(isZodSchema({ parse: () => {} })).toBeFalsy();
  });
});

describe("WithZod plugin", () => {
  it("should work via .extend(WithZod)", () => {
    const builder = convex.query().extend(WithZod);
    expect(builder).toBeInstanceOf(WithZod);
    expect(builder).toBeInstanceOf(ConvexBuilderWithFunctionKind);
  });

  it("should preserve WithZod through .use()", () => {
    const builder = convex.query().extend(WithZod);
    const middleware = builder.createMiddleware(async (ctx, next) => {
      return next({ ...ctx, extra: "data" });
    });
    const afterUse = builder.use(middleware);
    expect(afterUse).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .input() with Convex validator", () => {
    const builder = convex.query().extend(WithZod);
    const afterInput = builder.input({ count: v.number() });
    expect(afterInput).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .input() with Zod schema", () => {
    const builder = convex.query().extend(WithZod);
    const afterInput = builder.input(z.object({ count: z.number() }));
    expect(afterInput).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .returns() with Convex validator", () => {
    const builder = convex.query().extend(WithZod);
    const afterReturns = builder.returns(v.string());
    expect(afterReturns).toBeInstanceOf(WithZod);
  });

  it("should preserve WithZod through .returns() with Zod schema", () => {
    const builder = convex.query().extend(WithZod);
    const afterReturns = builder.returns(z.string());
    expect(afterReturns).toBeInstanceOf(WithZod);
  });

  it("should accept Zod schemas in .input() and execute handler", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number() }))
      .handler(async (_ctx, input) => {
        return { result: input.count * 2 };
      });

    const result = await fn({} as any, { count: 5 });
    expect(result).toEqual({ result: 10 });
  });

  it("should accept Zod schemas in .returns() and execute handler", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .returns(z.object({ numbers: z.array(z.number()) }))
      .handler(async () => {
        return { numbers: [1, 2, 3] };
      });

    const result = await fn({} as any, {});
    expect(result).toEqual({ numbers: [1, 2, 3] });
  });

  it("should validate Zod input refinements at runtime", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ count: z.number().positive() }))
      .handler(async (_ctx, input) => {
        return input.count;
      });

    // Valid input should pass
    const result = await fn({} as any, { count: 5 });
    expect(result).toBe(5);

    // Invalid input should throw
    await expect(fn({} as any, { count: -1 })).rejects.toThrow();
  });

  it("should validate Zod returns refinements at runtime", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .returns(z.number().positive())
      .handler(async () => {
        return -1; // This should fail validation
      });

    await expect(fn({} as any, {})).rejects.toThrow();
  });

  it("should work with plain Convex validators when using WithZod", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input({ count: v.number() })
      .handler(async (_ctx, input) => {
        return input.count;
      });

    const result = await fn({} as any, { count: 42 });
    expect(result).toBe(42);
  });

  it("should chain .use(), .input(), .returns() while preserving WithZod", async () => {
    const builder = convex.query().extend(WithZod);

    const middleware = builder.createMiddleware(async (ctx, next) => {
      return next({ ...ctx, extra: "data" });
    });

    const fn = builder
      .use(middleware)
      .input(z.object({ name: z.string().min(1) }))
      .returns(z.string())
      .handler(async (ctx: any, input) => {
        return `${input.name}-${ctx.extra}`;
      });

    const result = await fn({} as any, { name: "test" });
    expect(result).toBe("test-data");
  });

  it("should reject empty string via Zod refinement in chained builder", async () => {
    const builder = convex.query().extend(WithZod);

    const middleware = builder.createMiddleware(async (ctx, next) => {
      return next({ ...ctx, extra: "data" });
    });

    const fn = builder
      .use(middleware)
      .input(z.object({ name: z.string().min(1) }))
      .handler(async (_ctx: any, input) => {
        return input.name;
      });

    await expect(fn({} as any, { name: "" })).rejects.toThrow();
  });
});

describe("WithZod errors and async validation", () => {
  it("throws input failures as a ConvexError carrying the Zod issues", async () => {
    const fn = convex
      .mutation()
      .extend(WithZod)
      .input(z.object({ value: z.number().positive("Value must be positive") }))
      .handler(async (_ctx, input) => input.value);

    // A plain Error would reach the client as "Server Error" in production,
    // so the message has to travel in ConvexError data.
    const err = await fn({} as any, { value: -5 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConvexError);
    const issues = (err as ConvexError<{ ZodError: { message: string }[] }>)
      .data.ZodError;
    expect(issues[0].message).toBe("Value must be positive");
  });

  it("keeps return failures as plain errors so handler output isn't sent to clients", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .returns(z.number().positive())
      .handler(async () => -1);

    const err = await fn({} as any, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ConvexError);
  });

  it("supports async refinements on input", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          name: z.string().refine(async (n) => n !== "taken", "Name is taken"),
        })
      )
      .handler(async (_ctx, input) => input.name);

    expect(await fn({} as any, { name: "free" })).toBe("free");
    const err = await fn({} as any, { name: "taken" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConvexError);
  });

  it("supports async refinements on returns", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .returns(z.string().refine(async (s) => s.length > 0))
      .handler(async () => "ok");

    expect(await fn({} as any, {})).toBe("ok");
  });

  it("turns bigint validation failures into a ConvexError too", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(z.object({ value: z.bigint().min(1n) }))
      .handler(async (_ctx, input) => input.value);

    const err = await fn({} as any, { value: 0n }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConvexError);
  });

  it("turns a ZodError thrown inside a transform into a ConvexError", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          name: z.string().transform((s) => z.string().min(2).parse(s)),
        })
      )
      .handler(async (_ctx, input) => input.name);

    const err = await fn({} as any, { name: "" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConvexError);
  });

  it("leaves other errors thrown inside a transform alone", async () => {
    const fn = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          name: z.string().transform(() => {
            throw new Error("internal");
          }),
        })
      )
      .handler(async (_ctx, input) => input.name);

    const err = await fn({} as any, { name: "x" } as any).catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(ConvexError);
    expect((err as Error).message).toBe("internal");
  });

  // Convex runs convexToJson on ConvexError data when it sends the error to the
  // client; if that throws, the client gets "Server Error" after all.
  const expectClientVisible = (err: unknown) => {
    expect(err).toBeInstanceOf(ConvexError);
    const data = (err as ConvexError<any>).data;
    expect(() => convexToJson(data)).not.toThrow();
    return data.ZodError as Record<string, unknown>[];
  };

  it("keeps the error serializable with odd refine params", async () => {
    const cyclic: any = {};
    cyclic.self = cyclic;
    const fn = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          a: z.string().refine((s) => s !== "bad", {
            message: "Rejected",
            params: { $rule: "x", self: cyclic },
          }),
        })
      )
      .handler(async (_ctx, input) => input.a);

    const err = await fn({} as any, { a: "bad" }).catch((e: unknown) => e);
    const issues = expectClientVisible(err);
    expect(issues[0]).toMatchObject({ code: "custom", message: "Rejected", path: ["a"] });
    expect(issues[0]).not.toHaveProperty("params");
  });

  it("doesn't forward the input a nested parse reported", async () => {
    const secret = "server-only-secret";
    const fn = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          a: z.string().transform(() =>
            z.string().min(100).parse(secret, { reportInput: true })
          ),
        })
      )
      .handler(async (_ctx, input) => input.a);

    const err = await fn({} as any, { a: "x" }).catch((e: unknown) => e);
    expectClientVisible(err);
    expect(JSON.stringify((err as ConvexError<any>).data)).not.toContain(secret);
  });

  it("recognises errors from zod/v4/core and hand-built ZodErrors", async () => {
    const viaCore = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({ a: z.string().transform((s) => zcore.parse(z.string().min(2), s)) })
      )
      .handler(async (_ctx, input) => input.a);
    expectClientVisible(await viaCore({} as any, { a: "" }).catch((e: unknown) => e));

    const handBuilt = convex
      .query()
      .extend(WithZod)
      .input(
        z.object({
          a: z.string().transform(() => {
            throw new z.ZodError([
              { code: "custom", message: "nope", path: [], input: "x" },
            ]);
          }),
        })
      )
      .handler(async (_ctx, input) => input.a);
    const issues = expectClientVisible(
      await handBuilt({} as any, { a: "x" } as any).catch((e: unknown) => e)
    );
    expect(issues[0].message).toBe("nope");
  });

  it("gives a clear error for Zod 3 schemas", () => {
    expect(() =>
      convex
        .query()
        .extend(WithZod)
        .input(z3.object({ a: z3.string() }) as any)
    ).toThrow(/needs Zod 4 schemas/);
    expect(() =>
      convex
        .query()
        .extend(WithZod)
        .returns(z3.string() as any)
    ).toThrow(/needs Zod 4 schemas/);
  });
});
