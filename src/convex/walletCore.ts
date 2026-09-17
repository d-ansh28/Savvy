import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// Union of query and mutation contexts — write helpers only use the intersection
// via runtime guards below. Convex's ctx.db for queries is read-only.
import { getDemoCard, getProgram } from "../lib/catalog";

export const FREE_RUNS_LIMIT = 3;

function currentPeriodStart(): string {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day),
  );
  return monday.toISOString().slice(0, 10);
}

type WalletDoc = Doc<"wallets">;type AnyCtx = QueryCtx | MutationCtx;

function hasWriteDb(
  ctx: AnyCtx,
): ctx is (QueryCtx & { db: MutationCtx["db"] }) | MutationCtx {
  return typeof (ctx.db as { patch?: unknown }).patch === "function";
}

export async function getWalletOrCreateInternal(
  ctx: AnyCtx,
  userId: string,
): Promise<WalletDoc> {
  const existing = await ctx.db
    .query("wallets")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) {
    // Weekly rollover of free-run usage
    const period = currentPeriodStart();
    if (existing.periodStart !== period && hasWriteDb(ctx)) {
      await ctx.db.patch(existing._id, { periodStart: period, freeRunsUsed: 0 });
      return { ...existing, periodStart: period, freeRunsUsed: 0 };
    }
    return existing;
  }
  if (!hasWriteDb(ctx)) throw new Error("Wallet creation requires a mutation context");
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

/** Consumes one free run, enforcing the weekly cap and plan overrides. */
export async function consumeRunInternal(
  ctx: MutationCtx,
  userId: string,
  runCost: number,
): Promise<{ ok: boolean; freeRunsUsed: number; limit: number; plan: string }> {
  const wallet = await getWalletOrCreateInternal(ctx, userId);
  const planAllowsUnlimited = wallet.plan !== "free" && wallet.subscriptionStatus === "active";
  if (planAllowsUnlimited) {
    return { ok: true, freeRunsUsed: wallet.freeRunsUsed, limit: FREE_RUNS_LIMIT, plan: wallet.plan };
  }
  if (wallet.freeRunsUsed + runCost > FREE_RUNS_LIMIT) {
    return { ok: false, freeRunsUsed: wallet.freeRunsUsed, limit: FREE_RUNS_LIMIT, plan: wallet.plan };
  }
  await ctx.db.patch(wallet._id, { freeRunsUsed: wallet.freeRunsUsed + runCost });
  return { ok: true, freeRunsUsed: wallet.freeRunsUsed + runCost, limit: FREE_RUNS_LIMIT, plan: wallet.plan };
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
