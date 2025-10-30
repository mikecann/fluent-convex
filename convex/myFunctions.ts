import { v } from "convex/values";
import { cvx } from "./lib3/convex_builder";

// Example: Simple query without middleware
export const listNumbersSimple = cvx
  .query()
  .args({ count: v.number() })
  .handler(async (ctx, args) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(args.count);

    return {
      viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
      numbers: numbers.reverse().map((number) => number.value),
    };
  });

// Define reusable authentication middleware using the oRPC pattern
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

// Now we can use it directly without calling it!
export const listNumbersAuth = cvx
  .query()
  .use(authMiddleware)
  .args({ count: v.number() })
  .handler(async (ctx, args) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(args.count);

    return {
      viewer: ctx.user.name, // user is available from middleware!
      numbers: numbers.reverse().map((number) => number.value),
    };
  });

// Mutation with the same middleware
export const addNumber = cvx
  .mutation()
  .use(authMiddleware)
  .args({ value: v.number() })
  .returns(v.id("numbers"))
  .handler(async (ctx, args) => {
    console.log(`User ${ctx.user.name} is adding ${args.value}`);
    return await ctx.db.insert("numbers", { value: args.value });
  });

// Multiple middleware composition
const addTimestamp = cvx.query().middleware(async ({ context, next }) => {
  return next({
    context: {
      ...context,
      timestamp: Date.now(),
    },
  });
});

export const listNumbersWithTimestamp = cvx
  .query()
  .use(authMiddleware)
  .use(addTimestamp)
  .args({ count: v.number() })
  .handler(async (ctx, args) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(args.count);

    return {
      viewer: ctx.user.name,
      timestamp: ctx.timestamp,
      numbers: numbers.map((n) => n.value),
    };
  });

// Internal query
export const internalListAll = cvx
  .query()
  .internal()
  .args({})
  .handler(async (ctx, _args) => {
    const numbers = await ctx.db.query("numbers").collect();
    return numbers;
  });

// You can also define middleware inline
export const quickQuery = cvx
  .query()
  .use(
    cvx.query().middleware(async ({ context, next }) => {
      return next({
        context: {
          ...context,
          requestId: Math.random().toString(36).substring(7),
        },
      });
    }),
  )
  .args({ limit: v.number() })
  .handler(async (ctx, args) => {
    console.log(`Request ${ctx.requestId}`);
    const numbers = await ctx.db.query("numbers").take(args.limit);
    return numbers;
  });
