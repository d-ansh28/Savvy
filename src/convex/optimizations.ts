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
import { DEMO_CARDS, OFFERS } from "../lib/catalog";

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
    const usage = { freeRunsUsed: wallet.wallet.freeRunsUsed, limit: 3, plan: wallet.wallet.plan };

    if (
      wallet.wallet.plan === "free" &&
      wallet.wallet.freeRunsUsed >= 3
    ) {
      throw new Error("FREE_LIMIT_REACHED");
    }

    const walletCards = wallet.cards;
    const monthlySpendAlready = Math.round(wallet.profile?.monthlySpend ?? 0);

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
      monthlySpendAlready,
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

const SYSTEM_PROMPT = `You are PerkPilot AI's purchase-explainer. You receive a DETERMINISTIC calculation result from our rules engine and must explain it to the user in plain English.

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
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || "AI service unavailable");
    }
    return { explanation: response.data.choices[0]?.message?.content ?? "" };
  },
});
