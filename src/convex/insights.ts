import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { categoryLabel, type Category } from "../lib/catalog";

/** Deterministic wallet summary — the LLM never computes these numbers. */
export const walletInsights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const cards = await ctx.db
      .query("walletCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const balances = await ctx.db
      .query("rewardBalances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const profile = await ctx.db
      .query("spendingProfile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const totalPoints = balances.reduce((sum, b) => sum + b.points, 0);
    const cashbackBalance = balances
      .filter((b) => b.programId.includes("cashback"))
      .reduce((sum, b) => sum + b.points, 0);

    // Expiring within 60 days
    const now = Date.now();
    const expiring = balances
      .filter((b) => b.expiresAt && new Date(b.expiresAt).getTime() - now < 60 * 24 * 3600 * 1000)
      .map((b) => ({
        programId: b.programId,
        points: b.expiringPoints ?? b.points,
        expiresAt: b.expiresAt as string,
      }));

    // Largest category opportunity: demo spend profile drives this
    const monthly = profile?.monthlySpend ?? 0;
    let topCategory: { category: Category; label: string; estMonthlyBenefit: number } | null = null;
    if (monthly > 0) {
      // Demo heuristic: e-commerce earns at 5% up to caps in this catalog.
      const demoRates: Partial<Record<Category, number>> = {
        ecommerce: 0.05,
        shopping: 0.04,
        dining: 0.04,
        travel: 0.05,
        groceries: 0.02,
      };
      const est = demoRates.ecommerce ?? 0.05;
      topCategory = {
        category: "ecommerce",
        label: categoryLabel("ecommerce"),
        estMonthlyBenefit: Math.round(monthly * 0.3 * est),
      };
    }

    return {
      cardCount: cards.length,
      activeCardCount: cards.filter((c) => c.active).length,
      totalPoints,
      cashbackBalance,
      expiring,
      monthlySpend: monthly,
      topCategory,
      cardSlugs: cards.map((c) => c.slug),
    };
  },
});
