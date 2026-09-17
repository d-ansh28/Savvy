"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { vly } from "../lib/vly-integrations";
import {
  type OptimizeResult,
  type PurchaseInput,
  optimizePurchase,
} from "../lib/engine";
import { DEMO_CARDS, OFFERS, DEMO_MERCHANTS } from "../lib/catalog";
import { runsLimitForPlan } from "../lib/pricing";

/**
 * Deterministic purchase optimization with server-enforced free-run limits.
 * No LLM involved in arithmetic — the engine does all math.
 */
export const purchaseOptimize = action({
  args: {
    merchantName: v.string(),
    amount: v.number(),
    category: v.string(),
    dateISO: v.string(),
    channel: v.string(),
  },
  handler: async (ctx, args): Promise<{ result: OptimizeResult; usage: { freeRunsUsed: number; limit: number; plan: string } }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const amount = args.amount;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      throw new Error("Enter a valid amount between ₹1 and ₹1,00,00,000.");
    }
    const merchantName = args.merchantName.trim().slice(0, 80);
    if (!merchantName) throw new Error("Merchant name is required.");

    const wallet = await ctx.runQuery(api.wallets.getWalletState, {});
    if (!wallet) throw new Error("Not signed in");
    const limit = runsLimitForPlan(wallet.wallet.plan);
    const usage = { freeRunsUsed: wallet.wallet.freeRunsUsed, limit, plan: wallet.wallet.plan };

    if (wallet.wallet.freeRunsUsed >= limit) {
      throw new Error("FREE_LIMIT_REACHED");
    }

    const walletCards = wallet.cards;
    if (walletCards.filter((c) => c.active).length === 0) {
      // Don't burn a free run on a wallet that can't produce a result.
      throw new Error("NO_ACTIVE_CARDS");
    }

    const purchase: PurchaseInput = {
      merchantName,
      amount,
      category: args.category as PurchaseInput["category"],
      dateISO: args.dateISO,
      channel: args.channel === "offline" ? "offline" : "online",
    };

    // Deterministic core — engine does ALL arithmetic.
    const result = optimizePurchase(
      walletCards.filter((c) => c.active).map((c) => ({ slug: c.slug, active: true })),
      DEMO_CARDS,
      OFFERS,
      purchase,
      DEMO_MERCHANTS,
    );

    // Record + consume one run only after a successful computation.
    const consumed = await ctx.runMutation(internal.usage.consumeAndRecord, {
      userId,
      merchantName,
      amount,
      category: args.category,
      bestCardSlug: result.best?.slug,
      totalBenefit: result.best?.totalBenefit ?? 0,
      effectiveCost: result.best?.effectiveCost ?? amount,
    });

    return { result, usage: { ...usage, freeRunsUsed: consumed.freeRunsUsed } };
  },
});

const SYSTEM_PROMPT = `You are Savvy's purchase-explainer. You receive a DETERMINISTIC calculation result from our rules engine and must explain it to the user in plain English.

Rules you MUST follow:
- NEVER invent card benefits, rates, caps, offers or point values. Only use the JSON provided.
- NEVER do arithmetic beyond restating numbers already present in the JSON.
- If data is missing, say "Unable to calculate accurately with the available information."
- Always use the phrase "estimated benefit" when describing benefit amounts — these are estimates, not guarantees.
- Be concise: 2-3 short paragraphs. No markdown headers, no bullet lists longer than 3 items.
- Use Indian Rupee formatting like ₹1,100.`;

export const explainRecommendation = action({
  args: {
    result: v.any(),
    question: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ explanation: string }> => {
    await getAuthUserId(ctx); // must be signed in
    const question = args.question?.slice(0, 300);
    const userPrompt = question
      ? `User question: ${question}\n\nCalculation JSON:\n${JSON.stringify(args.result)}`
      : `Explain why this option won and break down each calculation step for the user.\n\nCalculation JSON:\n${JSON.stringify(args.result)}`;

    const response = await vly.ai.completion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 500,
    }).catch((e: unknown) => {
      console.error("vly.ai.completion failed:", e);
      return { success: false as const, error: "AI service unavailable" };
    });

    if (!response.success || !response.data) {
      // Graceful degradation: a deterministic fallback instead of an error,
      // so the UI always has an explanation grounded in the exact numbers.
      return { explanation: deterministicExplanation(args.result) };
    }
    return { explanation: response.data.choices[0]?.message?.content ?? "" };
  },
});

/** Deterministic fallback explanation built ONLY from the engine's numbers. */
function deterministicExplanation(r: {
  best?: { issuer?: string; name?: string; totalBenefit?: number; effectiveCost?: number; cashback?: number; points?: number; offer?: { benefit?: number } | null } | null;
}): string {
  if (!r.best) {
    return "No payment method in your wallet produced a positive estimated benefit for this purchase.";
  }
  const b = r.best;
  const parts: string[] = [];
  if (b.cashback && b.cashback > 0) parts.push(`estimated cashback of ₹${Math.round(b.cashback).toLocaleString("en-IN")}`);
  if (b.offer?.benefit && b.offer.benefit > 0) parts.push(`eligible offer worth ₹${Math.round(b.offer.benefit).toLocaleString("en-IN")}`);
  if (b.points && b.points > 0) parts.push(`${Math.round(b.points).toLocaleString("en-IN")} points/miles earned (deferred value)`);
  const benefitText = parts.length > 0 ? parts.join(", ") : "no direct benefit on this spend";
  return `Using the ${b.issuer ?? ""} ${b.name ?? ""} gives a total estimated benefit of ₹${Math.round(b.totalBenefit ?? 0).toLocaleString("en-IN")} — ${benefitText}. Cashback and offers are money back now, so your effective cost is ₹${Math.round(b.effectiveCost ?? 0).toLocaleString("en-IN")}. Points are value earned on top and can be redeemed later. These are estimates from demo reward rules, not guaranteed savings.`;
}
