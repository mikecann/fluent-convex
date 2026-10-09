/**
 * authCleanup.ts - Hourly cron job to clear old demo sign-ins.
 *
 * Every guest who signs in to the auth demo adds a user, an account, a
 * session and refresh tokens. None of that needs to outlive a visit, so this
 * deletes every Convex Auth row that's more than an hour old. Anyone still
 * signed in from before then is signed out, which is fine for a demo.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const MAX_AGE_MS = 60 * 60 * 1000;

// A single mutation can only read and write so much, so each table is
// cleared in batches, scheduling another run until nothing old is left
const BATCH_SIZE = 200;

// Every table that authTables adds to the schema
const AUTH_TABLES = [
  "users",
  "authAccounts",
  "authSessions",
  "authRefreshTokens",
  "authVerificationCodes",
  "authVerifiers",
  "authRateLimits",
] as const;

export const clearOldSignIns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const before = Date.now() - MAX_AGE_MS;
    // Each table clears in its own transactions, so one can't hold up another
    for (const table of AUTH_TABLES) {
      await ctx.scheduler.runAfter(0, internal.authCleanup.clearOldRows, {
        table,
        before,
      });
    }
  },
});

export const clearOldRows = internalMutation({
  args: {
    table: v.union(...AUTH_TABLES.map((table) => v.literal(table))),
    before: v.number(),
  },
  handler: async (ctx, { table, before }) => {
    const batch = await ctx.db
      .query(table)
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", before))
      .take(BATCH_SIZE);
    for (const doc of batch) {
      await ctx.db.delete(table, doc._id);
    }
    if (batch.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.authCleanup.clearOldRows, {
        table,
        before,
      });
    }
  },
});
