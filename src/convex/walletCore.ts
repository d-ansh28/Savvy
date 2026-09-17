import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getDemoCard, getProgram } from "../lib/catalog";
import { runsLimitForPlan } from "../lib/pricing";

export const FREE_RUNS_LIMIT = 3;

function currentPeriodStart(): string {
  const now = new Date();
  // Monthly usage period (YYYY-MM) — resets on the 1st.
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return ym;
}

type WalletDoc = Doc<"wallets">;

/**
 * Default wallet returned when a user hasn't been initialized yet.
 * Queries are read-only in Convex, so the wallet row is created lazily by the
 * first mutation (seed / add card / optimize) instead of the query itself.
 */
export const DEFAULT_WALLET: WalletDoc = {
  _id: "default" as unknown as WalletDoc["_id"],
  _creationTime: 0,
  userId: "",
  plan: "free",
  subscriptionStatus: "none",
  freeRunsUsed: 0,
  periodStart: "",
  seedLoaded: false,
  updatedAt: 0,
};

/** Read wallet if it exists (safe in queries — never writes). */
export async function getWalletReadonly(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<WalletDoc> {
  const existing = await ctx.db
    .query("wallets")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) {
    // Surface the rolled-over usage month without writing in a query context.
    const period = currentPeriodStart();
    if (existing.periodStart !== period) {
      return { ...existing, periodStart: period, freeRunsUsed: 0 };
    }
    return existing;
  }
  return { ...DEFAULT_WALLET, userId, periodStart: currentPeriodStart() };
}

/** Read-or-create wallet. Only callable from mutation/action-write contexts. */
export async function getWalletOrCreateInternal(
  ctx: MutationCtx,
  userId: string,
): Promise<WalletDoc> {
  const existing = await ctx.db
    .query("wallets")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) {
    // Weekly rollover of free-run usage
    const period = currentPeriodStart();
    if (existing.periodStart !== period) {
      await ctx.db.patch(existing._id, { periodStart: period, freeRunsUsed: 0 });
      return { ...existing, periodStart: period, freeRunsUsed: 0 };
    }
    return existing;
  }
  const id = await ctx.db.insert("wallets", {
    userId,
    plan: "free",
    subscriptionStatus: "none",
    freeRunsUsed: 0,
    periodStart: currentPeriodStart(),
    seedLoaded: false,
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(id)) as WalletDoc;
}

export async function getUserCardsInternal(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("walletCards")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

export async function getBalancesInternal(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("rewardBalances")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

export async function getProfileInternal(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("spendingProfile")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/** Insert demo cards, balances and spend profile once per wallet. */
export async function seedDemoDataInternal(ctx: MutationCtx, userId: string) {
  const wallet = await getWalletOrCreateInternal(ctx, userId);
  if (wallet.seedLoaded) return { seeded: false };

  const demoSlugs = ["hdfc-millennia", "sbi-cashback", "axis-flipkart", "amex-mr"];
  for (const slug of demoSlugs) {
    if (!getDemoCard(slug)) continue;
    await ctx.db.insert("walletCards", { userId, slug, active: true, addedAt: Date.now() });
  }

  await ctx.db.insert("rewardBalances", {
    userId,
    programId: "hdfc-cashback",
    points: 3240,
    note: "Demo: auto-credits to statement quarterly",
    updatedAt: Date.now(),
  });
  await ctx.db.insert("rewardBalances", {
    userId,
    programId: "amex-mr",
    points: 48000,
    expiresAt: "2026-10-31",
    expiringPoints: 8000,
    note: "Demo: 8,000 MR points expiring 31 Oct 2026",
    updatedAt: Date.now(),
  });
  await ctx.db.insert("rewardBalances", {
    userId,
    programId: "axis-edge-miles",
    points: 72000,
    note: "Demo: EDGE Miles for travel portal redemptions",
    updatedAt: Date.now(),
  });
  await ctx.db.insert("spendingProfile", {
    userId,
    monthlySpend: 40000,
    updatedAt: Date.now(),
  });

  await ctx.db.patch(wallet._id, { seedLoaded: true });
  return { seeded: true };
}

/** Consumes one free run, enforcing the monthly cap for the user's plan. */
export async function consumeRunInternal(
  ctx: MutationCtx,
  userId: string,
  runCost: number,
): Promise<{ ok: boolean; freeRunsUsed: number; limit: number; plan: string }> {
  const wallet = await getWalletOrCreateInternal(ctx, userId);
  const limit = runsLimitForPlan(wallet.plan);
  const planAllowsUnlimited = false; // every plan has a monthly cap; Free resets monthly
  void planAllowsUnlimited;
  if (wallet.freeRunsUsed + runCost > limit) {
    return { ok: false, freeRunsUsed: wallet.freeRunsUsed, limit, plan: wallet.plan };
  }
  await ctx.db.patch(wallet._id, { freeRunsUsed: wallet.freeRunsUsed + runCost });
  return { ok: true, freeRunsUsed: wallet.freeRunsUsed + runCost, limit, plan: wallet.plan };
}

/** Refund on server-side failure so failures don't burn a free run. */
export async function refundRunInternal(ctx: MutationCtx, userId: string, runCost: number) {
  const wallet = await getWalletOrCreateInternal(ctx, userId);
  const next = Math.max(0, wallet.freeRunsUsed - runCost);
  await ctx.db.patch(wallet._id, { freeRunsUsed: next });
}

export function useProgram(id: string) {
  return getProgram(id);
}

export type { Id };
