import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal helpers for the email+password and guest credentials providers.
 * The providers run in an action context (no direct db access), so these
 * queries/mutations are the DB bridge. Passwords are stored only as
 * PBKDF2-SHA256 hashes — never in plain text.
 */
export const findByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const create = internalMutation({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      emailVerificationTime: Date.now(),
      passwordHash: args.passwordHash,
    });
  },
});

/**
 * Create an empty wallet for a guest user if one doesn't already exist.
 * Guest accounts only need this so the dashboard renders a neutral wallet
 * instead of hitting "Session issue".
 */
export const createGuestWallet = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("wallets", {
      userId: args.userId,
      plan: "free",
      subscriptionStatus: "none",
      freeRunsUsed: 0,
      periodStart: new Date().toISOString().slice(0, 10),
      seedLoaded: false,
      updatedAt: Date.now(),
    });
  },
});
