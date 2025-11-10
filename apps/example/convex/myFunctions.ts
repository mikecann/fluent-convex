import { v } from "convex/values";
import { z } from "zod";
import { createBuilder } from "fluent-convex";
import schema from "./schema";
import { convex } from "./lib";
import { authMiddleware } from "./middleware";

// Example: Simple query without middleware
export const listNumbersSimple = convex
  .query()
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      numbers: numbers.reverse().map((number) => number.value),
    };
  });

// export const doSomethingWithNumbers = convex.query().input({ count: v.number() }).handler(async ({ context, input }) => {
//   const { numbers } = await listNumbersSimple({ context, input });

//   return numbers.map(n => String(n)).join(", ");
// });

export const listNumbersSimpleWithConvexValidators = convex
  .query()
  .input(v.object({ count: v.number() }))
  .returns(v.object({ numbers: v.array(v.number()) }))
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      numbers: numbers.reverse().map((number) => number.value),
    };
  });

export const listNumbersSimpleWithZod = convex
  .query()
  .input(z.object({ count: z.number() }))
  .returns(z.object({ numbers: z.array(z.number()) }))
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      numbers: numbers.reverse().map((number) => number.value),
    };
  });

// A query that requires authentication
export const listNumbersAuth = convex
  .query()
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      viewer: context.user.name, // user is available from middleware!
      numbers: numbers.reverse().map((number) => number.value),
    };
  });

// Mutation with the same middleware
export const addNumberAuth = convex
  .mutation()
  .use(authMiddleware)
  .input({ value: v.number() })
  .returns(v.id("numbers"))
  .handler(async ({ context, input }) => {
    console.log(`User ${context.user.name} is adding ${input.value}`);

    return await context.db.insert("numbers", { value: input.value });
  });

export const addNumber = convex
  .mutation()
  .input({ value: v.number() })
  .returns(v.id("numbers"))
  .handler(async ({ context, input }) => {
    return await context.db.insert("numbers", { value: input.value });
  });

// Multiple middleware composition
const addTimestamp = convex.query().middleware(async ({ context, next }) => {
  return next({
    context: {
      ...context,
      timestamp: Date.now(),
    },
  });
});

export const listNumbersWithTimestamp = convex
  .query()
  .use(authMiddleware)
  .use(addTimestamp)
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      viewer: context.user.name,
      timestamp: context.timestamp,
      numbers: numbers.map((n) => n.value),
    };
  });

// Internal query
export const internalListAll = convex
  .query()
  .internal()
  .input({})
  .handler(async ({ context }) => {
    const numbers = await context.db.query("numbers").collect();

    return numbers;
  });

// You can also define middleware inline
export const quickQuery = convex
  .query()
  .use(
    convex.query().middleware(async ({ context, next }) => {
      return next({
        context: {
          ...context,
          requestId: Math.random().toString(36).substring(7),
        },
      });
    }),
  )
  .input({ limit: v.number() })
  .handler(async ({ context, input }) => {
    console.log(`Request ${context.requestId}`);
    const numbers = await context.db.query("numbers").take(input.limit);
    return numbers;
  });

// Testing optional fields with PropertyValidators
export const addNumberWithMetadata = convex
  .mutation()
  .input({
    value: v.number(),
    label: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
  .returns(v.id("numbers"))
  .handler(async ({ context, input }) => {
    console.log(
      `Adding ${input.value}${input.label ? ` with label "${input.label}"` : ""}`,
    );
    if (input.tags) {
      console.log(`Tags: ${input.tags.join(", ")}`);
    }
    return await context.db.insert("numbers", { value: input.value });
  });

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
  .handler(async ({ context, input }) => {
    if (input.description) {
      console.log(
        `Adding positive number with description: ${input.description}`,
      );
    }
    return await context.db.insert("numbers", { value: input.value });
  });

// Testing actions (which can call other APIs)
export const generateRandomNumbers = convex
  .action()
  .input({
    count: v.number(),
    min: v.number(),
    max: v.number(),
  })
  .returns(v.array(v.number()))
  .handler(async ({ input }) => {
    const numbers: number[] = [];
    for (let i = 0; i < input.count; i++) {
      numbers.push(
        Math.floor(Math.random() * (input.max - input.min + 1)) + input.min,
      );
    }
    return numbers;
  });

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
  .handler(async ({ context, input }) => {
    const min = input.min ?? 0;
    const max = input.max ?? 100;
    const value = Math.floor(Math.random() * (max - min + 1)) + min;

    // Demonstrating that actions can call mutations
    // In a real app, you'd import from api after generation
    const id = await context.runMutation(addNumber as any, { value });
    return { value, id };
  });

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
  .handler(async ({ context, input }) => {
    // Actions can't directly access db, so we'll call the mutation
    const id = await context.runMutation(addNumber as any, {
      value: input.value,
    });
    return {
      value: input.value,
      id,
      user: context.user.name,
    };
  });

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
  .handler(async ({ context, input }) => {
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
  });

// Testing mutation that deletes
export const deleteAllNumbers = convex
  .mutation()
  .input({})
  .handler(async ({ context }) => {
    const allNumbers = await context.db.query("numbers").collect();
    for (const number of allNumbers) {
      await context.db.delete(number._id);
    }
    return { deleted: allNumbers.length };
  });

// Testing query with union types using Zod
export const filterNumbers = convex
  .query()
  .input(
    z.object({
      filter: z.enum(["all", "positive", "negative", "zero"]),
      limit: z.number().default(10),
    }),
  )
  .handler(async ({ context, input }) => {
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
  });
