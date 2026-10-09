/**
 * auth.ts - Convex Auth for the live demos.
 *
 * Visitors sign in as anonymous guests, so there are no emails or passwords
 * to store. Anyone can sign in, so:
 *   - a callback caps how many guests can sign in per minute
 *   - authCleanup.ts deletes guests and their sessions after about an hour
 */

import { ConvexError } from "convex/values";
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

// Most guest sign-ins the demo accepts per rolling minute, across everyone
const GUEST_SIGN_INS_PER_MINUTE = 150;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
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
