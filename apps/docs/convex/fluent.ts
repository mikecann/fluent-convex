/**
 * fluent.ts - The single builder instance, auth middleware, and reusable chains.
 *
 * This is the foundation of every fluent-convex function in the app.
 * We create ONE builder typed to our DataModel so `context.db` knows
 * about the `numbers` and `tasks` tables, define auth middleware, and
 * export reusable chains that bake it in.
 */

import { createBuilder } from "fluent-convex";
import type { DataModel } from "./_generated/dataModel";
import type { Auth } from "convex/server";

// #region builder
// The root builder - typed to our schema so `context.db` knows
// about the `numbers` and `tasks` tables.
export const convex = createBuilder<DataModel>();
// #endregion

// #region authMiddlewareAndChains

// #region authMiddleware
// Context-enrichment middleware: checks authentication and adds `user`
// to the context. Works with queries, mutations, and actions because
// we scope the required context to the minimal `{ auth: Auth }` shape
// that all Convex function types share.
export const authMiddleware = convex
  .$context<{ auth: Auth }>()
  .createMiddleware(async (context, next) => {
    const identity = await context.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Everything downstream now has `context.user` available
    return next({
      ...context,
      user: {
        id: identity.subject,
        name: identity.name ?? "Unknown",
      },
    });
  });
// #endregion

// #region reusableAuthChains
// Reusable partial chains - pre-configure middleware so downstream
// consumers don't need to repeat `.use(authMiddleware)` everywhere.
// Because authMiddleware uses $context<{ auth: Auth }>, it works
// with all three function types - queries, mutations, AND actions.
export const authedQuery = convex.query().use(authMiddleware);
export const authedMutation = convex.mutation().use(authMiddleware);
export const authedAction = convex.action().use(authMiddleware);
// #endregion

// #endregion
