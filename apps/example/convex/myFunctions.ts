import { v } from "convex/values";
import { z } from "zod/v4";
import { convex } from "./lib";
import { addTimestamp, authMiddleware, withLogging } from "./middleware";
import { api, internal } from "./_generated/api";

// Example: Simple query without middleware
export const listNumbersSimple = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      numbers: numbers.reverse().map((number) => number.value),
    };
  })
  .public();

export const listNumbersSimpleWithConvexValidators = convex
  .query()
  .input(v.object({ count: v.number() }))
  .returns(v.object({ numbers: v.array(v.number()) }))
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      numbers: numbers.reverse().map((number) => number.value),
    };
  })
  .public();

export const listNumbersSimpleWithZod = convex
  .query()
  .input(z.object({ count: z.number() }))
  .returns(z.object({ numbers: z.array(z.number()) }))
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      numbers: numbers.reverse().map((number) => number.value),
    };
  })
  .public();

// A query that requires authentication
export const listNumbersAuth = convex
  .query()
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      viewer: context.user.name, // user is available from middleware!
      numbers: numbers.reverse().map((number) => number.value),
    };
  })
  .public();

// Mutation with the same middleware
export const addNumberAuth = convex
  .mutation()
  .use(authMiddleware)
  .input({ value: v.number() })
  .returns(v.id("numbers"))
  .handler(async (context, input) => {
    console.log(`User ${context.user.name} is adding ${input.value}`);

    return await context.db.insert("numbers", { value: input.value });
  })
  .public();

export const addNumber = convex
  .mutation()
  .input({ value: v.number() })
  .returns(v.id("numbers"))
  .handler(async (context, input) => {
    return await context.db.insert("numbers", { value: input.value });
  })
  .public();

export const addNumberWithOptional = convex
  .mutation()
  .input({ value: v.number(), label: v.optional(v.string()) })
  .returns(v.id("numbers"))
  .handler(async (context, input) => {
    console.log(
      `Adding ${input.value}${input.label ? ` with label "${input.label}"` : ""}`,
    );
    return await context.db.insert("numbers", { value: input.value });
  })
  .public();

// Multiple middleware composition
export const listNumbersWithTimestamp = convex
  .query()
  .use(authMiddleware)
  .use(addTimestamp)
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      viewer: context.user.name,
      timestamp: context.timestamp,
      numbers: numbers.map((n) => n.value),
    };
  })
  .public();

// Internal query
export const internalListAll = convex
  .query()
  .input({})
  .handler(async (context) => {
    const numbers = await context.db.query("numbers").collect();
    return numbers.map((n) => n.value);
  })
  .internal();

// You can also define middleware inline
export const quickQuery = convex
  .query()
  .use(
    convex.query().middleware(async (context, next) => {
      return next({
        ...context,
        requestId: Math.random().toString(36).substring(7),
      });
    }),
  )
  .input({ limit: v.number() })
  .handler(async (context, input) => {
    console.log(`Request ${context.requestId}`);
    const numbers = await context.db.query("numbers").take(input.limit);
    return numbers;
  })
  .public();

// Testing middleware added AFTER handler
export const queryWithPostHandlerMiddleware = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    // This middleware will be applied before this handler runs
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return {
      numbers: numbers.map((n) => n.value),
      // requestId will be available from middleware added after handler
      requestId: (context as any).requestId,
    };
  })
  .use(
    convex.query().middleware(async (context, next) => {
      return next({
        ...context,
        requestId: `req-${Math.random().toString(36).substring(7)}`,
      });
    }),
  )
  .public();

// Testing multiple middleware added after handler
export const queryWithMultiplePostHandlerMiddleware = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return {
      numbers: numbers.map((n) => n.value),
      requestId: (context as any).requestId,
      timestamp: (context as any).timestamp,
    };
  })
  .use(
    convex.query().middleware(async (context, next) => {
      return next({
        ...context,
        requestId: `req-${Date.now()}`,
      });
    }),
  )
  .use(addTimestamp)
  .public();

// Testing mutation with middleware after handler
export const mutationWithPostHandlerMiddleware = convex
  .mutation()
  .input({ value: v.number() })
  .handler(async (context, input) => {
    const id = await context.db.insert("numbers", { value: input.value });
    return {
      id,
      requestId: (context as any).requestId,
    };
  })
  .use(
    convex.mutation().middleware(async (context, next) => {
      return next({
        ...context,
        requestId: `mut-${Date.now()}`,
      });
    }),
  )
  .public();

// Testing optional fields with PropertyValidators
export const addNumberWithMetadata = convex
  .mutation()
  .input({
    value: v.number(),
    label: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
  .returns(v.id("numbers"))
  .handler(async (context, input) => {
    console.log(
      `Adding ${input.value}${input.label ? ` with label "${input.label}"` : ""}`,
    );
    if (input.tags) {
      console.log(`Tags: ${input.tags.join(", ")}`);
    }
    return await context.db.insert("numbers", { value: input.value });
  })
  .public();

// Testing Zod with refinements and custom validation
export const addPositiveNumber = convex
  .mutation()
  .input(
    z.object({
      value: z.number().positive("Value must be positive"),
      description: z.string().optional(),
    }),
  )
  .returns(v.id("numbers"))
  .handler(async (context, input) => {
    if (input.description) {
      console.log(
        `Adding positive number with description: ${input.description}`,
      );
    }
    return await context.db.insert("numbers", { value: input.value });
  })
  .public();

// Testing actions (which can call other APIs)
export const generateRandomNumbers = convex
  .action()
  .input({
    count: v.number(),
    min: v.number(),
    max: v.number(),
  })
  .returns(v.array(v.number()))
  .handler(async (context, input) => {
    const numbers: number[] = [];
    for (let i = 0; i < input.count; i++) {
      numbers.push(
        Math.floor(Math.random() * (input.max - input.min + 1)) + input.min,
      );
    }
    return numbers;
  })
  .public();

// Testing action with runQuery and runMutation
export const addRandomNumber = convex
  .action()
  .input({
    min: v.optional(v.number()),
    max: v.optional(v.number()),
  })
  .returns(
    v.object({
      value: v.number(),
      id: v.string(),
    }),
  )
  .handler(async (context, input) => {
    const min = input.min ?? 0;
    const max = input.max ?? 100;
    const value = Math.floor(Math.random() * (max - min + 1)) + min;

    // Demonstrating that actions can call mutations
    // In a real app, you'd import from api after generation
    const id = await context.runMutation(addNumber as any, { value });
    return { value, id };
  })
  .public();

export const addNumberAuthAction = convex
  .action()
  .use(authMiddleware)
  .input({ value: v.number() })
  .returns(
    v.object({
      value: v.number(),
      id: v.string(),
      user: v.string(),
    }),
  )
  .handler(async (context, input) => {
    // Actions can't directly access db, so we'll call the mutation
    const id = await context.runMutation(addNumber as any, {
      value: input.value,
    });
    return {
      value: input.value,
      id,
      user: context.user.name,
    };
  })
  .public();

// Testing query with complex return type using Zod
export const getNumberStats = convex
  .query()
  .input(z.object({ limit: z.number().optional() }))
  .returns(
    z.object({
      total: z.number(),
      average: z.number(),
      min: z.number().nullable(),
      max: z.number().nullable(),
      numbers: z.array(z.number()),
    }),
  )
  .handler(async (context, input) => {
    const limit = input.limit ?? 100;
    const allNumbers = await context.db
      .query("numbers")
      .order("desc")
      .take(limit);

    const values = allNumbers.map((n) => n.value);
    const total = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = total > 0 ? sum / total : 0;
    const min = total > 0 ? Math.min(...values) : null;
    const max = total > 0 ? Math.max(...values) : null;

    return {
      total,
      average,
      min,
      max,
      numbers: values.slice(0, 10), // Return up to 10 numbers
    };
  })
  .public();

// Testing mutation that deletes
export const deleteAllNumbers = convex
  .mutation()
  .input({})
  .handler(async (context) => {
    const allNumbers = await context.db.query("numbers").collect();
    for (const number of allNumbers) {
      await context.db.delete(number._id);
    }
    return { deleted: allNumbers.length };
  })
  .public();

// Testing query with union types using Zod
export const filterNumbers = convex
  .query()
  .input(
    z.object({
      filter: z.enum(["all", "positive", "negative", "zero"]),
      limit: z.number().default(10),
    }),
  )
  .handler(async (context, input) => {
    const allNumbers = await context.db
      .query("numbers")
      .order("desc")
      .take(100);

    let filtered = allNumbers.map((n) => n.value);

    if (input.filter === "positive") filtered = filtered.filter((n) => n > 0);
    else if (input.filter === "negative")
      filtered = filtered.filter((n) => n < 0);
    else if (input.filter === "zero")
      filtered = filtered.filter((n) => n === 0);

    return {
      filter: input.filter,
      numbers: filtered.slice(0, input.limit),
      totalMatching: filtered.length,
    };
  })
  .public();

// Testing action that calls an internal query
export const getAllNumbersViaInternalQuery = convex
  .action()
  .input({})
  .handler(async (context) => {
    // Actions can call internal queries using context.runQuery with internal API
    // In a real app, you'd import from internal after generation
    const allNumbers: number[] = await context.runQuery(
      internal.myFunctions.internalListAll,
      {},
    );

    return {
      count: allNumbers.length,
      numbers: allNumbers,
    };
  })
  .public();

export const callInternalMutationFromAction = convex
  .action()
  .input({ value: v.number() })
  .handler(async (context, input) => {
    await context.runMutation(internal.myFunctions.internalMutationInsert, {
      value: input.value,
    });
  })
  .public();

export const internalMutationInsert = convex
  .mutation()
  .input({ value: v.number() })
  .handler(async (context, input) => {
    await context.db.insert("numbers", { value: input.value });
  })
  .internal();

// Test function without .returns() - this should still work with proper type inference
export const testQueryWithoutReturns = convex
  .query()
  .input({})
  .handler(async (context) => {
    return { value: 42 };
  })
  .public();

// Test mutation without .returns()
export const testMutationWithoutReturns = convex
  .mutation()
  .input({ value: v.number() })
  .handler(async (context, input) => {
    return await context.db.insert("numbers", { value: input.value });
  })
  .public();

// Test action without .returns()
export const testActionWithoutReturns = convex
  .action()
  .input({ value: v.number() })
  .handler(async (context, input) => {
    return { result: input.value * 2 };
  })
  .public();

// Onion middleware: withLogging wraps the handler, so it can time
// execution and catch errors from downstream.
export const listNumbersWithLogging = convex
  .query()
  .use(withLogging("listNumbersWithLogging"))
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return { numbers: numbers.map((n) => n.value) };
  })
  .public();

// Combining onion + context-enrichment middleware
export const listNumbersWithLoggingAndAuth = convex
  .query()
  .use(withLogging("listNumbersWithLoggingAndAuth"))
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return {
      viewer: context.user.name,
      numbers: numbers.map((n) => n.value),
    };
  })
  .public();

// Test action that calls functions without .returns() - this should work with proper types
// Commented out to avoid circular type errors during investigation
// export const testCallingFunctionsWithoutReturns = convex
//   .action()
//   .input({ value: v.number() })
//   .handler(async (context, input) => {
//     const queryResult = await context.runQuery(
//       api.myFunctions.testQueryWithoutReturns,
//       {},
//     );
//     const mutationResult = await context.runMutation(
//       api.myFunctions.testMutationWithoutReturns,
//       { value: input.value },
//     );
//     const actionResult = await context.runAction(
//       api.myFunctions.testActionWithoutReturns,
//       { value: input.value },
//     );
//     return {
//       queryValue: queryResult.value,
//       mutationId: mutationResult,
//       actionResult: actionResult.result,
//     };
//   })
//   .public();
