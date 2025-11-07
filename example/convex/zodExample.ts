import { z } from "zod";
import { cvx } from "./lib3/builder";

// Define Zod schemas
const NumberInputSchema = z.object({
  count: z.number().int().min(1).max(100),
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

// Example 1: Using Zod for input validation
export const listNumbersWithZod = cvx
  .query()
  .input(NumberInputSchema)
  .handler(async ({ context, input }) => {
    // input.count is properly typed as number
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      numbers: numbers.map((n) => n.value),
    };
  });

// Example 2: Using Zod for both input and returns
const NumbersResponseSchema = z.object({
  viewer: z.string().nullable(),
  numbers: z.array(z.number()),
});

export const listNumbersWithZodReturns = cvx
  .query()
  .input(NumberInputSchema)
  .returns(NumbersResponseSchema as any) // Need to cast for now due to Zod -> Convex type complexity
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      viewer: (await context.auth.getUserIdentity())?.name ?? null,
      numbers: numbers.reverse().map((n) => n.value),
    };
  });

// Example 3: Middleware with Zod-validated query
const authMiddleware = cvx.query().middleware(async ({ context, next }) => {
  const identity = await context.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  return next({
    context: {
      ...context,
      user: {
        id: identity.subject,
        name: identity.name ?? "Unknown",
      },
    },
  });
});

export const protectedZodQuery = cvx
  .query()
  .use(authMiddleware)
  .input(
    z.object({
      limit: z.number().int().positive().default(10),
      offset: z.number().int().nonnegative().default(0),
    }),
  )
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.limit);

    return {
      user: context.user.name,
      numbers: numbers.map((n) => n.value),
    };
  });

// Example 4: Mixing Convex validators and Zod
import { v } from "convex/values";

export const mixedValidation = cvx
  .query()
  .input(NumberInputSchema) // Using Zod
  .returns(v.object({ count: v.number() })) // Using Convex validator
  .handler(async ({ context, input }) => {
    const numbers = await context.db.query("numbers").take(input.count);
    return { count: numbers.length };
  });

// Example 5: Complex Zod schema with refinements
const ComplexInputSchema = z
  .object({
    startDate: z.number(),
    endDate: z.number(),
    tags: z.array(z.string()).min(1).max(10),
    sortBy: z.enum(["date", "name", "count"]).default("date"),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
  });

export const complexZodQuery = cvx
  .query()
  .input(ComplexInputSchema)
  .handler(async ({ context, input }) => {
    // All Zod validation happens automatically, including the refinement!
    console.log(
      `Querying from ${input.startDate} to ${input.endDate}, sorted by ${input.sortBy}`,
    );

    const numbers = await context.db.query("numbers").collect();
    return numbers.slice(0, 10);
  });
