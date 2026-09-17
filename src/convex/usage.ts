import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { consumeRunInternal, refundRunInternal } from "./walletCore";

/** Consume one free run (server-enforced) and record the optimization. */
export const consumeAndRecord = internalMutation({
  args: {
    userId: v.string(),
    merchantName: v.string(),
    amount: v.number(),
    category: v.string(),
    bestCardSlug: v.optional(v.string()),
    totalBenefit: v.number(),
    effectiveCost: v.number(),
  },
  handler: async (ctx, args) => {
    const outcome = await consumeRunInternal(ctx, args.userId, 1);
    if (!outcome.ok) throw new Error("FREE_LIMIT_REACHED");
    await ctx.db.insert("optimizations", {
      userId: args.userId,
      merchantName: args.merchantName,
      amount: args.amount,
      category: args.category,
      bestCardSlug: args.bestCardSlug,
      totalBenefit: args.totalBenefit,
      effectiveCost: args.effectiveCost,
      runAt: Date.now(),
    });
    return outcome;
  },
});

/** Refund on server-side failure so failures don't burn a free run. */
export const refundRun = internalMutation({
  args: { userId: v.string(), count: v.number() },
  handler: async (ctx, args) => {
    await refundRunInternal(ctx, args.userId, args.count);
  },
});
