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

const CHAT_SYSTEM_PROMPT = `You are Savvy's wallet assistant. You answer user questions about their cards, rewards, offers and savings using ONLY the JSON context provided (walletSnapshot with a catalog section ranking the best card per category across the full catalog).

Rules you MUST follow:
- Answer the user's actual question directly — do not reply with a generic refusal when the data needed IS present in the JSON.
- For "which card is best for X" questions: use catalog.bestPerCategory and catalog.topUpgrades. Name the specific card and issuer from the JSON.
- NEVER invent rates, caps, offers, point values or cards that are not in the JSON.
- Numbers in your answer must come verbatim from the JSON — never compute new figures.
- If the JSON genuinely lacks the data (e.g. live partner transfer charts), say: "Unable to calculate accurately with the available information."
- Keep it under 120 words, friendly and practical. Suggest the relevant Savvy page (Purchase Optimizer, Rewards Vault, Insights) when useful.
- Use Indian Rupee formatting like ₹1,100.`;

export const explainRecommendation = action({
  args: {
    result: v.any(),
    question: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ explanation: string }> => {
    await getAuthUserId(ctx); // must be signed in
    const question = args.question?.slice(0, 300);

    // Freeform questions carry a wallet/catalog snapshot (no `best` purchase
    // result) — use the chat prompt so the AI actually answers them.
    const isChat = question !== undefined && args.result?.context === "freeform wallet question";
    const systemPrompt = isChat ? CHAT_SYSTEM_PROMPT : SYSTEM_PROMPT;

    const userPrompt = question
      ? `User question: ${question}\n\nContext JSON:\n${JSON.stringify(args.result)}`
      : `Explain why this option won and break down each calculation step for the user.\n\nCalculation JSON:\n${JSON.stringify(args.result)}`;

    const response = await vly.ai.completion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 500,
    }).catch((e: unknown) => {
      console.error("vly.ai.completion failed:", e);
      return { success: false as const, error: "AI service unavailable" };
    });

    if (!response.success || !response.data) {
      // Graceful degradation: deterministic answer instead of an error, so
      // the UI always shows something grounded in the user's real data.
      const fallback = isChat
        ? chatFallback(args.result, question ?? "")
        : deterministicExplanation(args.result);
      return { explanation: fallback };
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
  return `Using the ${b.issuer ?? ""} ${b.name ?? ""} gives a total estimated benefit of ₹${Math.round(b.totalBenefit ?? 0).toLocaleString("en-IN")} — ${benefitText}. Cashback and offers are money back now, so your effective cost is ₹${Math.round(b.effectiveCost ?? 0).toLocaleString("en-IN")}. Points are value earned on top and can be redeemed later. These are estimates from catalog reward rules, not guaranteed savings.`;
}

/**
 * Deterministic chat fallback for freeform questions — answers from the
 * wallet/catalog snapshot the client already computed. Question-aware, so it
 * never replies with the purchase-mode message.
 */
function chatFallback(r: {
  walletSnapshot?: {
    cards?: string[];
    activeCards?: string[];
    balances?: { program?: string; points?: number; expiresAt?: string | null; expiringPoints?: number | null }[];
    totalPoints?: number;
    cashbackBalance?: number;
    plan?: string;
    freeRunsUsed?: number;
    runLimit?: number;
    catalog?: {
      totalCards?: number;
      bestPerCategory?: { category?: string; bestCard?: string; issuer?: string; estBenefit?: number; sampleAmount?: number; ownedAlternative?: string | null; monthlyGapIfUpgraded?: number }[];
      topUpgrades?: string[];
    };
  } | null;
}, question: string): string {
  const snap = r.walletSnapshot;
  if (!snap) {
    return "Your wallet is still loading. Please try again in a moment.";
  }
  const q = question.toLowerCase();
  const lines: string[] = [];
  const catalog = snap.catalog;

  // Category questions: "dining", "fuel", "flights", "best card for ..."
  if (catalog?.bestPerCategory?.length) {
    const match = catalog.bestPerCategory.find((c) => {
      const cat = (c.category ?? "").toLowerCase();
      return (
        (q.includes("dining") || q.includes("food") || q.includes("swiggy") || q.includes("zomato")) && cat.includes("dining") ||
        (q.includes("fuel") || q.includes("petrol")) && cat.includes("fuel") ||
        (q.includes("flight") || q.includes("air")) && cat.includes("flight") ||
        (q.includes("hotel") || q.includes("stay")) && cat.includes("hotel") ||
        (q.includes("grocer") || q.includes("bigbasket") || q.includes("zepto") || q.includes("blinkit")) && cat.includes("grocer") ||
        (q.includes("amazon") || q.includes("flipkart") || q.includes("online")) && cat.includes("commerce") ||
        (q.includes("movie") || q.includes("netflix") || q.includes("subscription")) && (cat.includes("subscription") || cat.includes("entertain")) ||
        (q.includes("shop") || q.includes("myntra")) && cat.includes("shopping")
      );
    });
    if (match?.bestCard) {
      lines.push(
        `For ${match.category ?? "this category"}, the catalog-wide winner across all ${catalog.totalCards ?? ""} cards is ${match.bestCard}${match.issuer ? ` (${match.issuer})` : ""} — an estimated ₹${(match.estBenefit ?? 0).toLocaleString("en-IN")} benefit on ₹${(match.sampleAmount ?? 0).toLocaleString("en-IN")} of monthly spend.`,
      );
      if (match.ownedAlternative) {
        lines.push(
          `Your best card there is ${match.ownedAlternative}${(match.monthlyGapIfUpgraded ?? 0) > 0 ? ` — upgrading could add about ₹${(match.monthlyGapIfUpgraded ?? 0).toLocaleString("en-IN")}/month` : " — you're already on the best option"}.`,
        );
      } else {
        lines.push("You don't have a card earning in this category yet — adding the catalog winner could lift your returns.");
      }
    }
  }

  // Wasting / expiring rewards
  if (q.includes("wasting") || q.includes("expir")) {
    const expiring = (snap.balances ?? []).filter((b) => b.expiringPoints && b.expiringPoints > 0);
    if (expiring.length > 0) {
      lines.push(
        `Points at risk: ${expiring.map((b) => `${(b.expiringPoints ?? 0).toLocaleString("en-IN")} points in ${b.program ?? "a program"} expiring ${b.expiresAt ?? "soon"}`).join("; ")}.`,
      );
    } else {
      lines.push("Nothing in your wallet is flagged as expiring in the next 60 days.");
    }
  }

  // Points / redemption
  if (q.includes("point") || q.includes("redeem") || q.includes("use my")) {
    lines.push(
      `You're tracking ${(snap.totalPoints ?? 0).toLocaleString("en-IN")} points including ₹${(snap.cashbackBalance ?? 0).toLocaleString("en-IN")} cashback across ${(snap.balances ?? []).length} program(s). Open the Rewards Vault for per-program redemption scenarios and the exact math.`,
    );
  }

  // Benefits / unused perks
  if (q.includes("benefit") || q.includes("haven't") || q.includes("unused")) {
    lines.push(
      `Your wallet has ${(snap.cards ?? []).length} card(s), ${(snap.activeCards ?? []).length} active. Perk tracking (lounge visits, golf, milestones) lives on each card in the Wallet page — cards with lounge/UPI perks are flagged there.`,
    );
  }

  // Usage / plan
  if (q.includes("plan") || q.includes("limit") || q.includes("optimization left")) {
    lines.push(
      `You're on the ${snap.plan ?? "free"} plan: ${(snap.runLimit ?? 0) - (snap.freeRunsUsed ?? 0)} of ${(snap.runLimit ?? 0)} optimizations left this month.`,
    );
  }

  // General fallback — say something useful, not the purchase message.
  if (lines.length === 0) {
    lines.push(
      `You have ${(snap.cards ?? []).length} card(s) and ${(snap.totalPoints ?? 0).toLocaleString("en-IN")} points tracked. Ask me "which card is best for dining/fuel/flights", "am I wasting rewards", or "how can I use my points" — or run a Purchase Optimization for exact per-purchase math.`,
    );
    if (catalog?.topUpgrades?.length) {
      lines.push(`Top upgrade opportunities right now: ${catalog.topUpgrades.join(" · ")}.`);
    }
  }

  return lines.join("\n\n");
}
