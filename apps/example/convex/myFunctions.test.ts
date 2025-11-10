import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

describe("Basic queries and mutations", () => {
  test("should add and list numbers with simple validators", async () => {
    const t = convexTest(schema);
    await t.mutation(api.myFunctions.addNumber, { value: 23 });
    await t.mutation(api.myFunctions.addNumber, { value: 42 });

    const { numbers } = await t.query(api.myFunctions.listNumbersSimple, {
      count: 10,
    });
    expect(numbers).toEqual([23, 42]);
  });

  test("should work with v.object() validators", async () => {
    const t = convexTest(schema);
    await t.mutation(api.myFunctions.addNumber, { value: 100 });

    const { numbers } = await t.query(
      api.myFunctions.listNumbersSimpleWithConvexValidators,
      { count: 5 },
    );
    expect(numbers).toContain(100);
  });

  test("should work with Zod validators", async () => {
    const t = convexTest(schema);
    await t.mutation(api.myFunctions.addNumber, { value: 99 });

    const { numbers } = await t.query(
      api.myFunctions.listNumbersSimpleWithZod,
      { count: 5 },
    );
    expect(numbers).toContain(99);
  });

  test("should limit results based on count parameter", async () => {
    const t = convexTest(schema);
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
    const t = convexTest(schema);
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
    const t = convexTest(schema);

    await expect(
      t.mutation(api.myFunctions.addNumberAuth, { value: 50 }),
    ).rejects.toThrow("Unauthorized");
  });

  test("should work with multiple middleware composition", async () => {
    const t = convexTest(schema);
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
    const t = convexTest(schema);
    await t.mutation(api.myFunctions.addNumber, { value: 55 });

    const result = await t.query(api.myFunctions.quickQuery, { limit: 3 });
    expect(result).toBeInstanceOf(Array);
  });
});

describe("Internal functions", () => {
  test("should call internal query", async () => {
    const t = convexTest(schema);
    await t.mutation(api.myFunctions.addNumber, { value: 111 });

    const allNumbers = await t.query(internal.myFunctions.internalListAll, {});
    expect(allNumbers.length).toBeGreaterThan(0);
    expect(allNumbers[0]).toHaveProperty("value");
    expect(allNumbers[0]).toHaveProperty("_id");
  });
});

describe("Return type validation", () => {
  test("should return validated response with Convex validators", async () => {
    const t = convexTest(schema);
    await t.mutation(api.myFunctions.addNumber, { value: 33 });

    const result = await t.query(
      api.myFunctions.listNumbersSimpleWithConvexValidators,
      { count: 5 },
    );

    expect(result).toHaveProperty("numbers");
    expect(Array.isArray(result.numbers)).toBe(true);
  });

  test("should return validated response with Zod validators", async () => {
    const t = convexTest(schema);
    await t.mutation(api.myFunctions.addNumber, { value: 44 });

    const result = await t.query(api.myFunctions.listNumbersSimpleWithZod, {
      count: 5,
    });

    expect(result).toHaveProperty("numbers");
    expect(Array.isArray(result.numbers)).toBe(true);
  });

  test("should return Id from mutation with returns validator", async () => {
    const t = convexTest(schema);

    const id = await t.mutation(api.myFunctions.addNumber, { value: 222 });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
