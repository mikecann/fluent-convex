import { convex } from "./lib";
import type { Auth } from "convex/server";

// A generic middleware that checks if the user is authenticated
// Works with queries, mutations, and actions
export const authMiddleware = convex
  // Define a minimal context type that all Convex contexts have
  .$context<{ auth: Auth }>()
  .createMiddleware(async (context, next) => {
    const identity = await context.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return next({
      ...context,
      user: {
        id: identity.subject,
        name: identity.name ?? "Unknown",
      },
    });
  });

// A generic middleware that adds a timestamp
// Works with queries, mutations, and actions
export const addTimestamp = convex.createMiddleware(async (context, next) => {
  return next({
    ...context,
    timestamp: Date.now(),
  });
});

export const addValueMiddleware = <TValue>(value: TValue) =>
  convex.createMiddleware(async (context, next) => {
    return next({
      ...context,
      value,
    });
  });

// Onion middleware: logs execution time and catches errors.
// Because middleware uses true onion composition, `next()` executes
// the rest of the chain (subsequent middleware + handler), so we can
// measure timing and catch errors from downstream.
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
        `[${operationName}] Failed after ${duration}ms: ${error.message}`,
      );
      throw error;
    }
  });
