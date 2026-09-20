import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { ConvexError, type Value } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Guest auth provider.
 *
 * Creates an anonymous "guest" user and an empty wallet on first login, then
 * returns a session so the rest of the app treats the visitor as signed in.
 * No email, no password, no personal data stored — the visitor is free to
 * explore the product and later convert to a real email+password account.
 *
 * Guest accounts are intentionally shared (single deterministic identity) so
 * we don't create a fresh wallet on every page load. A real multi-user product
 * would partition guests by session id; this is enough to let someone explore
 * without signing up.
 */
export const guest = ConvexCredentials({
  id: "guest",
  authorize: async (_credentials, ctx): Promise<{
    userId: Id<"users">;
    sessionId?: Id<"authSessions">;
  } | null> => {
    // A single deterministic guest account so we don't re-create wallets on
    // every page load. In a real multi-user product you'd partition guests by
    // a session id; here one shared guest identity is enough to let someone
    // explore the app without signing up.
    const guestEmail = `guest@perkpilot.in`;

    const existing = (await ctx.runQuery(
      internal.authAccounts.findByEmail,
      { email: guestEmail },
    )) as { _id: Id<"users">; email?: string; passwordHash?: string } | null;

    if (!existing) {
      const userId = (await ctx.runMutation(
        internal.authAccounts.create,
        {
          email: guestEmail,
          passwordHash: await hashGuestPassword(),
        },
      )) as Id<"users">;

      // One empty wallet for the guest so the dashboard doesn't break.
      const walletId = (await ctx.runMutation(
        internal.authAccounts.createGuestWallet,
        { userId },
      )) as Id<"wallets">;

      return {
        userId,
      };
    }

    return {
      userId: existing._id,
    };
  },
});

async function hashGuestPassword(): Promise<string> {
  // Guest accounts are convenience sessions, not security boundaries.
  // Store a harmless deterministic token so the provider can "authorize"
  // without ever asking the user for a password.
  const token = "perkpilot-guest-session";
  const enc = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
