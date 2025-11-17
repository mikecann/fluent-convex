import { convex } from "./lib";
import type { Auth } from "convex/server";

// A generic middleware that checks if the user is authenticated
// Works with queries, mutations, and actions
export const authMiddleware = convex
  // Define a minimal context type that all Convex contexts have
  .$context<{ auth: Auth }>()
  .middleware(async ({ context, next }) => {
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

// A generic middleware that adds a timestamp
// Works with queries, mutations, and actions
export const addTimestamp = convex.middleware(async ({ context, next }) => {
  return next({
    context: {
      ...context,
      timestamp: Date.now(),
    },
  });
});

export const addValueMiddleware = <TValue>(value: TValue) =>
  convex.middleware(async ({ context, next }) => {
    return next({
      context: {
        ...context,
        value,
      },
    });
  });
