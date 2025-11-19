import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { v } from "convex/values";
import { createBuilder } from "fluent-convex";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import type { DataModel } from "./_generated/dataModel";

describe("Basic queries and mutations", () => {
  test("should add and list numbers with simple validators", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 23 });
    await t.mutation(api.myFunctions.addNumber, { value: 42 });

    const { numbers } = await t.query(api.myFunctions.listNumbersSimple, {
      count: 10,
    });
    expect(numbers).toEqual([23, 42]);
  });

  test("should work with v.object() validators", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 100 });

    const { numbers } = await t.query(
      api.myFunctions.listNumbersSimpleWithConvexValidators,
      { count: 5 },
    );
    expect(numbers).toContain(100);
  });

  test("should work with Zod validators", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 99 });

    const { numbers } = await t.query(
      api.myFunctions.listNumbersSimpleWithZod,
      { count: 5 },
    );
    expect(numbers).toContain(99);
  });

  test("should limit results based on count parameter", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 1 });
    await t.mutation(api.myFunctions.addNumber, { value: 2 });
    await t.mutation(api.myFunctions.addNumber, { value: 3 });

    const { numbers } = await t.query(api.myFunctions.listNumbersSimple, {
      count: 2,
    });
    expect(numbers).toHaveLength(2);
  });
});

describe("Middleware functionality", () => {
  test("should work with auth middleware", async () => {
    const t = convexTest(schema, modules);
    const tWithAuth = t.withIdentity({
      subject: "user123",
      name: "Test User",
    });

    const id = await tWithAuth.mutation(api.myFunctions.addNumberAuth, {
      value: 77,
    });
    expect(id).toBeDefined();

    const result = await tWithAuth.query(api.myFunctions.listNumbersAuth, {
      count: 5,
    });
    expect(result.viewer).toBe("Test User");
    expect(result.numbers).toContain(77);
  });

  test("should throw error without auth", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.myFunctions.addNumberAuth, { value: 50 }),
    ).rejects.toThrow("Unauthorized");
  });

  test("should work with multiple middleware composition", async () => {
    const t = convexTest(schema, modules);
    const tWithAuth = t.withIdentity({
      subject: "user456",
      name: "Alice",
    });

    await tWithAuth.mutation(api.myFunctions.addNumberAuth, { value: 88 });

    const result = await tWithAuth.query(
      api.myFunctions.listNumbersWithTimestamp,
      { count: 5 },
    );

    expect(result.viewer).toBe("Alice");
    expect(result.timestamp).toBeTypeOf("number");
    expect(result.numbers).toContain(88);
  });

  test("should work with inline middleware", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 55 });

    const result = await t.query(api.myFunctions.quickQuery, { limit: 3 });
    expect(result).toBeInstanceOf(Array);
  });

  test("should execute middleware added after handler", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 100 });
    await t.mutation(api.myFunctions.addNumber, { value: 200 });

    const result = await t.query(
      api.myFunctions.queryWithPostHandlerMiddleware,
      { count: 5 },
    );

    expect(result.numbers).toBeInstanceOf(Array);
    expect(result.requestId).toBeDefined();
    expect(typeof result.requestId).toBe("string");
    expect(result.requestId.startsWith("req-")).toBe(true);
  });

  test("should execute multiple middleware added after handler in order", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 300 });

    const result = await t.query(
      api.myFunctions.queryWithMultiplePostHandlerMiddleware,
      { count: 5 },
    );

    expect(result.numbers).toBeInstanceOf(Array);
    expect(result.requestId).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(typeof result.requestId).toBe("string");
    expect(typeof result.timestamp).toBe("number");
    expect(result.requestId.startsWith("req-")).toBe(true);
  });

  test("should execute middleware after handler for mutations", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(
      api.myFunctions.mutationWithPostHandlerMiddleware,
      { value: 400 },
    );

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("string");
    expect(result.requestId).toBeDefined();
    expect(typeof result.requestId).toBe("string");
    expect(result.requestId.startsWith("mut-")).toBe(true);
  });
});

describe("Internal functions", () => {
  test("should call internal query", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 111 });

    const allNumbers = await t.query(internal.myFunctions.internalListAll, {});
    expect(allNumbers.length).toBeGreaterThan(0);
    expect(allNumbers[0]).toBe(111);
    expect(typeof allNumbers[0]).toBe("number");
  });
});

describe("Return type validation", () => {
  test("should return validated response with Convex validators", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 33 });

    const result = await t.query(
      api.myFunctions.listNumbersSimpleWithConvexValidators,
      { count: 5 },
    );

    expect(result).toHaveProperty("numbers");
    expect(Array.isArray(result.numbers)).toBe(true);
  });

  test("should return validated response with Zod validators", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.myFunctions.addNumber, { value: 44 });

    const result = await t.query(api.myFunctions.listNumbersSimpleWithZod, {
      count: 5,
    });

    expect(result).toHaveProperty("numbers");
    expect(Array.isArray(result.numbers)).toBe(true);
  });

  test("should return Id from mutation with returns validator", async () => {
    const t = convexTest(schema, modules);

    const id = await t.mutation(api.myFunctions.addNumber, { value: 222 });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

describe("Handler uniqueness enforcement", () => {
  test("should not have handler method after calling handler()", () => {
    const testBuilder = createBuilder<DataModel>();

    const builder = testBuilder
      .query()
      .input({ id: v.string() })
      .handler(async () => ({ success: true }));

    // ConvexBuilderWithHandler does not have a handler method
    // TypeScript prevents calling it at compile time, and runtime confirms it doesn't exist
    expect((builder as any).handler).toBeUndefined();
  });

  test("should not have handler method after calling handler() on mutation", () => {
    const testBuilder = createBuilder<DataModel>();

    const builder = testBuilder
      .mutation()
      .input({ name: v.string() })
      .handler(async () => ({ success: true }));

    // ConvexBuilderWithHandler does not have a handler method
    expect((builder as any).handler).toBeUndefined();
  });

  test("should not have handler method after calling handler() on action", () => {
    const testBuilder = createBuilder<DataModel>();

    const builder = testBuilder
      .action()
      .input({ url: v.string() })
      .handler(async () => ({ success: true }));

    // ConvexBuilderWithHandler does not have a handler method
    expect((builder as any).handler).toBeUndefined();
  });

  test("should not have handler method even after middleware is added", () => {
    const testBuilder = createBuilder<DataModel>();

    const authMiddleware = testBuilder
      .query()
      .middleware(async ({ context, next }: any) => {
        return next({ context });
      });

    const builder = testBuilder
      .query()
      .input({ id: v.string() })
      .handler(async () => ({ success: true }))
      .use(authMiddleware);

    // ConvexBuilderWithHandler does not have a handler method
    expect((builder as any).handler).toBeUndefined();
  });
});
