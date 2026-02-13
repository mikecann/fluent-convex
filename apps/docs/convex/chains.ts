/**
 * chains.ts - Reusable chains and the callable syntax.
 *
 * Build "library functions"
 * that can be reused, extended, and called BEFORE they are registered
 * with .public() or .internal().
 *
 * Key concepts:
 *   - A builder with a handler but NO .public()/.internal() is "callable"
 *   - Callable builders can be invoked directly inside other handlers
 *   - The same callable can also be registered as a standalone function
 *   - You can add more middleware to a callable and then register it
 */

import { v } from "convex/values";
import { convex } from "./fluent";
import { authMiddleware, addTimestamp, withLogging } from "./middleware";

// ---------------------------------------------------------------------------
// Pattern 1: Callable - define logic, call it everywhere
// ---------------------------------------------------------------------------

// #region callable
// This callable is NOT registered - it's a reusable building block.
// Think of it like a helper function, but with full middleware support.
const getNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    const rows = await ctx.db.query("numbers").order("desc").take(args.count);
    return rows.map((r) => r.value);
  });

// Register it as a public query - clients can call this over the network.
export const listNumbers = getNumbers.public();
// #endregion

// ---------------------------------------------------------------------------
// Pattern 2: Call a callable inside another handler
// ---------------------------------------------------------------------------

// #region callFromHandler
// Because `getNumbers` is callable, we can invoke it directly
// inside other handlers. No additional Convex function invocation,
// full type safety on args and return value.
export const getNumbersWithTimestamp = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    // Call the unregistered callable directly - reuses the same logic
    const numbers = await getNumbers(ctx, args);

    return {
      numbers,
      fetchedAt: Date.now(),
    };
  })
  .public();
// #endregion

// ---------------------------------------------------------------------------
// Pattern 3: Register the same callable multiple ways
// ---------------------------------------------------------------------------

// #region registerMultipleWays
// The original callable is unchanged - we can register it again
// with different middleware stacked on top.

// Public, with logging
export const listNumbersLogged = getNumbers
  .use(withLogging("listNumbersLogged"))
  .public();

// Protected behind auth
export const listNumbersProtected = getNumbers
  .use(authMiddleware)
  .public();

// Internal only (server-to-server), with timestamp middleware
export const listNumbersInternal = getNumbers
  .use(addTimestamp)
  .internal();
// #endregion

// ---------------------------------------------------------------------------
// Using middleware with .use()
// ---------------------------------------------------------------------------

// #region usingMiddleware
// Single middleware - adds `context.user`
export const authedNumbers = convex
  .query()
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async (ctx, input) => {
    const numbers = await ctx.db.query("numbers").order("desc").take(input.count);
    return {
      viewer: ctx.user.name, // <-- from authMiddleware
      numbers: numbers.map((n) => n.value),
    };
  })
  .public();

// Multiple middleware - each .use() merges its context additions
export const loggedAuthedNumbers = convex
  .query()
  .use(withLogging("loggedAuthedNumbers"))
  .use(authMiddleware)
  .use(addTimestamp)
  .input({ count: v.number() })
  .handler(async (ctx, input) => {
    const numbers = await ctx.db.query("numbers").order("desc").take(input.count);
    return {
      viewer: ctx.user.name, // <-- from authMiddleware
      timestamp: ctx.timestamp, // <-- from addTimestamp
      numbers: numbers.map((n) => n.value),
      // withLogging wraps this handler and logs timing to the console
    };
  })
  .public();
// #endregion

// ---------------------------------------------------------------------------
// Pattern: Stacking middleware on a callable
// ---------------------------------------------------------------------------

// #region stackedMiddleware
const listWithMetadata = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, input) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(input.count);
    return {
      numbers: numbers.map((n) => n.value),
      timestamp: (ctx as any).timestamp as number | undefined,
    };
  });

// Stack logging + timestamp middleware, then register
export const listNumbersWithMetadata = listWithMetadata
  .use(withLogging("listNumbersWithMetadata"))
  .use(addTimestamp)
  .public();
// #endregion
