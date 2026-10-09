/**
 * auth.ts - Convex Auth for the live demos.
 *
 * Visitors sign in as anonymous guests, so there are no emails or passwords
 * to store. Anyone can sign in, so:
 *   - a callback caps how many guests can sign in per minute
 *   - authCleanup.ts deletes guests and their sessions after about an hour
 */

import { ConvexError, v } from "convex/values";
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

// Most guest sign-ins the demo accepts per rolling minute, across everyone
const GUEST_SIGN_INS_PER_MINUTE = 30;

export const {
  auth,
  signIn,
  signOut,
  store: authStore,
  isAuthenticated,
} = convexAuth({
  providers: [Anonymous],
  callbacks: {
    // Runs in the same transaction that creates the guest's user, so throwing
    // here means nothing is created
    async afterUserCreatedOrUpdated(ctx) {
      const recent = await ctx.db
        .query("users")
        .withIndex("by_creation_time", (q) =>
          q.gt("_creationTime", Date.now() - 60_000)
        )
        .take(GUEST_SIGN_INS_PER_MINUTE + 1);
      if (recent.length > GUEST_SIGN_INS_PER_MINUTE) {
        throw new ConvexError("The live demo is busy. Try again in a minute.");
      }
    },
  },
});

// Workaround for GHSA-579h-4cfp-fh53, from the advisory: check that the IDs
// sent to the library's `store` are from the right tables. Once we're on
// @convex-dev/auth 0.0.96 or later, delete this and export the library's
// `store` as `store` again.
export const store = internalMutation({
  args: { args: v.any() },
  handler: async (ctx, { args }): Promise<any> => {
    if (args.type === "refreshSession") {
      const [refreshTokenId, sessionId] = args.refreshToken.split("|");
      if (
        ctx.db.normalizeId("authRefreshTokens", refreshTokenId) === null ||
        ctx.db.normalizeId("authSessions", sessionId) === null
      ) {
        return null;
      }
    }
    if (
      args.type === "verifierSignature" &&
      ctx.db.normalizeId("authVerifiers", args.verifier) === null
    ) {
      throw new Error("Invalid verifier");
    }
    return await ctx.runMutation(internal.auth.authStore, { args });
  },
});
