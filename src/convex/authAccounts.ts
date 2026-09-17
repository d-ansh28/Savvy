import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal helpers for the email+password credentials provider.
 * The provider runs in an action context (no direct db access), so these
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
