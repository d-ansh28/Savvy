import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getDemoCard, getProgram } from "../lib/catalog";
import {
  FREE_RUNS_LIMIT,
  getBalancesInternal,
  getProfileInternal,
  getWalletOrCreateInternal,
  getUserCardsInternal,
  seedDemoDataInternal,
} from "./walletCore";

export const getWalletState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const wallet = await getWalletOrCreateInternal(ctx, userId);
    const cards = await getUserCardsInternal(ctx, userId);
    const balances = await getBalancesInternal(ctx, userId);
    const profile = await getProfileInternal(ctx, userId);
    return {
      wallet,
      cards,
      balances,
      profile,
      freeLimit: FREE_RUNS_LIMIT,
    };
  },
});

export const seedDemoWallet = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return await seedDemoDataInternal(ctx, userId);
  },
});

export const addCard = mutation({
  args: { slug: v.string(), last4: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (!getDemoCard(args.slug)) throw new Error("Unknown card");
    const existing = await getUserCardsInternal(ctx, userId);
    if (existing.some((c) => c.slug === args.slug)) {
      return { added: false, reason: "duplicate" as const };
    }
    await ctx.db.insert("walletCards", {
      userId,
      slug: args.slug,
      cardNumberLast4: args.last4,
      active: true,
      addedAt: Date.now(),
    });
    return { added: true as const };
  },
});

export const removeCard = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const cards = await getUserCardsInternal(ctx, userId);
    const doc = cards.find((c) => c.slug === args.slug);
    if (!doc) return { removed: false as const };
    await ctx.db.delete(doc._id);
    return { removed: true as const };
  },
});

export const setCardActive = mutation({
  args: { slug: v.string(), active: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const cards = await getUserCardsInternal(ctx, userId);
    const doc = cards.find((c) => c.slug === args.slug);
    if (!doc) return { updated: false as const };
    await ctx.db.patch(doc._id, { active: args.active });
    return { updated: true as const };
  },
});

export const addRewardBalance = mutation({
  args: {
    programId: v.string(),
    points: v.number(),
    expiresAt: v.optional(v.string()),
    expiringPoints: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (!getProgram(args.programId)) throw new Error("Unknown program");
    const balances = await getBalancesInternal(ctx, userId);
    const existing = balances.find((b) => b.programId === args.programId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        points: args.points,
        expiresAt: args.expiresAt,
        expiringPoints: args.expiringPoints,
        note: args.note,
        updatedAt: Date.now(),
      });
      return { updated: true as const };
    }
    await ctx.db.insert("rewardBalances", {
      userId,
      programId: args.programId,
      points: args.points,
      expiresAt: args.expiresAt,
      expiringPoints: args.expiringPoints,
      note: args.note,
      updatedAt: Date.now(),
    });
    return { updated: false as const };
  },
});

export const removeRewardBalance = mutation({
  args: { programId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const balances = await getBalancesInternal(ctx, userId);
    const doc = balances.find((b) => b.programId === args.programId);
    if (!doc) return { removed: false as const };
    await ctx.db.delete(doc._id);
    return { removed: true as const };
  },
});

export const setMonthlySpend = mutation({
  args: { monthlySpend: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (args.monthlySpend < 0 || args.monthlySpend > 10_000_000) {
      throw new Error("Monthly spend out of range");
    }
    const profile = await getProfileInternal(ctx, userId);
    if (profile) {
      await ctx.db.patch(profile._id, { monthlySpend: args.monthlySpend, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("spendingProfile", {
        userId,
        monthlySpend: args.monthlySpend,
        updatedAt: Date.now(),
      });
    }
    return { ok: true as const };
  },
});
