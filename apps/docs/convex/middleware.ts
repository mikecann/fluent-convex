/**
 * middleware.ts - Reusable middleware definitions for fluent-convex.
 *
 * Middleware transforms the context object before (and optionally after)
 * the handler runs. There are two main patterns:
 *
 *   1. Context-enrichment - adds new properties to the context
 *   2. Onion (wrap) - runs code before AND after the handler
 *
 * The authMiddleware is defined in fluent.ts alongside the builder.
 * This file holds additional middleware examples.
 */

import { convex } from "./fluent";
export { authMiddleware } from "./fluent";

// ---------------------------------------------------------------------------
// #region addTimestamp
// Simple context-enrichment middleware: injects the current timestamp
// into the context so handlers can use `context.timestamp`.
export const addTimestamp = convex.createMiddleware(async (context, next) => {
  return next({
    ...context,
    timestamp: Date.now(),
  });
});
// #endregion

// ---------------------------------------------------------------------------
// #region withLogging
// Onion middleware (parameterized): wraps the entire downstream chain
// so it can measure execution time and catch errors. Because `next()`
// executes all subsequent middleware + the handler, this middleware
// "surrounds" them like layers of an onion.
export const withLogging = (operationName: string) =>
  convex.createMiddleware(async (context, next) => {
    const start = Date.now();
    console.log(`[${operationName}] Starting...`);
    try {
      const result = await next(context);
      const duration = Date.now() - start;
      console.log(`[${operationName}] Completed in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      console.error(
        `[${operationName}] Failed after ${duration}ms: ${error.message}`
      );
      throw error;
    }
  });
// #endregion
