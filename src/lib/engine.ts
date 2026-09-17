/**
 * Savvy deterministic reward engine.
 *
 * ALL financial arithmetic lives here — never in the UI, never in an LLM.
 * The engine is pure: same wallet + purchase => same result.
 *
 * Pipeline: retrieve wallet → evaluate card rules → apply caps/min/max →
 * resolve offers with stacking rules → compute benefit → compare methods →
 * produce recommendation + alternatives + assumptions + warnings.
 */

import {
  type Category,
  type DemoCard,
  type Offer,
  type RewardRule,
  categoryEmoji,
  categoryLabel,
} from "./catalog";

export interface PurchaseInput {
  merchantName: string;
  amount: number;
  category: Category;
  dateISO: string; // yyyy-mm-dd
  channel: "online" | "offline";
}

export interface WalletCard {
  slug: string;
  nickname?: string;
  cardNumberLast4?: string;
  active: boolean;
}

export interface RewardBalance {
  programId: string;
  points?: number;
  cashback?: number;
  /** ISO date — points expiring on this date (user provided). */
  expiresAt?: string;
  expiringPoints?: number;
}

export interface AppliedOffer {
  offerId: string;
  title: string;
  benefit: number;
}

export interface MethodEvaluation {
  slug: string;
  issuer: string;
  name: string;
  network: DemoCard["network"];
  art: DemoCard["art"];
  rewardType: DemoCard["rewardType"];
  cashback: number;
  points: number;
  pointKind: "cashback" | "points" | "miles";
  offer: AppliedOffer | null;
  totalBenefit: number;
  effectiveCost: number;
  /** Human-readable calculation steps — shown in the "Why" breakdown. */
  steps: string[];
  assumptions: string[];
  warnings: string[];
  eligible: boolean;
  ineligibleReason?: string;
  annualFee: number;
}

export interface OptimizeResult {
  merchant: {
    name: string;
    category: Category;
    categoryLabel: string;
    categoryEmoji: string;
  };
  purchase: PurchaseInput;
  best: MethodEvaluation | null;
  alternatives: MethodEvaluation[];
  combinedOffer: AppliedOffer | null;
  assumptions: string[];
  warnings: string[];
  sourceStatus: {
    cards: string;
    offers: string;
    rates: string;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Inclusive date check against the offer window. */
function offerActive(offer: Offer, dateISO: string): boolean {
  return dateISO >= offer.startsAt && dateISO <= offer.endsAt;
}

/** Evaluate a single card against the purchase, deterministically. */
function evaluateCard(
  card: DemoCard,
  purchase: PurchaseInput,
  offers: Offer[],
  monthlySpendAlready: number,
): MethodEvaluation {
  const steps: string[] = [];
  const assumptions: string[] = [];
  const warnings: string[] = [];

  // 1. Reward rules — pick the best matching rule for this category/channel.
  let baseValue = 0;
  let points = 0;
  const pointKind: MethodEvaluation["pointKind"] = card.rewardType;
  let bestRule: RewardRule | undefined;
  let capNote: string | null = null;

  for (const rule of card.rules) {
    if (rule.category && rule.category !== purchase.category) continue;
    if (rule.excludedCategories?.includes(purchase.category)) continue;
    if (rule.onlineOnly && purchase.channel === "offline") continue;
    if (rule.minAmount !== undefined && purchase.amount < rule.minAmount) continue;
    if (rule.maxAmount !== undefined && purchase.amount > rule.maxAmount) continue;

    let value = 0;
    let rulePoints = 0;

    if (rule.kind === "cashback" && rule.percent) {
      value = purchase.amount * rule.percent;
      steps.push(
        `Cashback: ${purchase.amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })} × ${(rule.percent * 100).toFixed(0)}% = ₹${round2(value).toLocaleString("en-IN")}`,
      );
    } else if ((rule.kind === "points" || rule.kind === "miles") && rule.pointsPer100 && rule.pointValue) {
      rulePoints = Math.floor((purchase.amount / 100) * rule.pointsPer100);
      value = rulePoints * rule.pointValue;
      points += rulePoints;
      steps.push(
        `Points: ${purchase.amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })} ÷ 100 × ${rule.pointsPer100} = ${rulePoints.toLocaleString("en-IN")} ${rule.kind === "miles" ? "miles" : "points"} × ₹${rule.pointValue}/pt = ₹${round2(value).toLocaleString("en-IN")}`,
      );
    } else {
      continue;
    }

    // Caps
    if (rule.monthlyCap !== undefined) {
      const remaining = Math.max(0, rule.monthlyCap - (monthlySpendAlready ?? 0));
      const capped = Math.min(value, remaining);
      if (capped < value) {
        warnings.push(
          `Monthly cap: only ₹${round2(capped).toLocaleString("en-IN")} of the ₹${round2(value).toLocaleString("en-IN")} reward fits under the ₹${rule.monthlyCap.toLocaleString("en-IN")} monthly cap (demo assumes you've spent ₹${(monthlySpendAlready ?? 0).toLocaleString("en-IN")} in this category this month).`,
        );
      }
      capNote = `Monthly cap ₹${rule.monthlyCap.toLocaleString("en-IN")} on this rate`;
      value = capped;
    }
    if (rule.transactionCap !== undefined && value > rule.transactionCap) {
      warnings.push(`Transaction cap ₹${rule.transactionCap.toLocaleString("en-IN")} applied.`);
      value = rule.transactionCap;
    }

    if (value > baseValue) {
      baseValue = value;
      bestRule = rule;
    }
  }

  if (!bestRule) {
    return {
      slug: card.slug,
      issuer: card.issuer,
      name: card.name,
      network: card.network,
      art: card.art,
      rewardType: card.rewardType,
      cashback: 0,
      points: 0,
      pointKind,
      offer: null,
      totalBenefit: 0,
      effectiveCost: purchase.amount,
      steps: ["No reward rule matched this purchase."],
      assumptions,
      warnings: [
        ...(card.rewardType === "cashback"
          ? ["Below minimum spend for cashback (e.g. ₹400 base-rate minimum)."]
          : []),
      ],
      eligible: false,
      ineligibleReason: "No reward rule matched this purchase",
      annualFee: card.annualFee,
    };
  }

  if (bestRule.category === undefined) {
    assumptions.push("Base (non-category) rate applied — no boosted category matched.");
  }
  if (bestRule.onlineOnly) {
    assumptions.push("Assumes online transaction (rule is online-only).");
  }
  if (capNote) assumptions.push(capNote);
  if (bestRule.note) assumptions.push(bestRule.note);
  assumptions.push(`Rate source: ${bestRule.provenance.source} — verified ${bestRule.provenance.last_verified}. Status: ${bestRule.status}.`);

  // 2. Offers — merchant offers that are active, meet the minimum, and stack.
  let offerBenefit = 0;
  let appliedOffer: AppliedOffer | null = null;
  const appliedOfferIds = new Set<string>();

  const stackableOffers = offers
    .filter((o) => offerActive(o, purchase.dateISO))
    .filter((o) => o.minAmount <= purchase.amount)
    .sort((a, b) => {
      const va = Math.min(
        a.percent ? purchase.amount * a.percent : (a.flat ?? 0),
        a.maxBenefit,
      );
      const vb = Math.min(
        b.percent ? purchase.amount * b.percent : (b.flat ?? 0),
        b.maxBenefit,
      );
      return vb - va;
    });

  for (const offer of stackableOffers) {
    // stacking rules: if an applied offer declares stacksWith, subsequent
    // offers must be listed there.
    if (appliedOfferIds.size > 0) {
      const last = offers.find((o) => o.id === [...appliedOfferIds][appliedOfferIds.size - 1]);
      if (last && last.stacksWith && !last.stacksWith.includes(offer.id)) continue;
    }
    const raw = offer.percent
      ? Math.min(purchase.amount * offer.percent, offer.maxBenefit)
      : Math.min(offer.flat ?? 0, offer.maxBenefit);
    if (raw <= 0) continue;
    offerBenefit += raw;
    appliedOfferIds.add(offer.id);
    assumptions.push(
      `Offer "${offer.title}" applied: ₹${round2(raw).toLocaleString("en-IN")} (${offer.source}, verified ${offer.lastVerified}).`,
    );
  }

  if (appliedOfferIds.size > 1) {
    assumptions.push("Offers were stacked — verify stacking rules at checkout.");
  }
  if (offerBenefit > 0) {
    steps.push(`Offers: ₹${round2(offerBenefit).toLocaleString("en-IN")} across ${appliedOfferIds.size} eligible offer(s).`);
  } else {
    steps.push("Offers: none applicable for this date/amount.");
  }

  appliedOffer = offerBenefit > 0 ? { offerId: [...appliedOfferIds][0], title: `${appliedOfferIds.size} offer(s) applied`, benefit: round2(offerBenefit) } : null;

  const totalBenefit = round2(baseValue + offerBenefit);
  const effectiveCost = round2(Math.max(0, purchase.amount - totalBenefit));

  return {
    slug: card.slug,
    issuer: card.issuer,
    name: card.name,
    network: card.network,
    art: card.art,
    rewardType: card.rewardType,
    cashback: card.rewardType === "cashback" ? round2(baseValue) : 0,
    points,
    pointKind,
    offer: appliedOffer,
    totalBenefit,
    effectiveCost,
    steps,
    assumptions,
    warnings,
    eligible: true,
    annualFee: card.annualFee,
  };
}

export function optimizePurchase(
  wallet: WalletCard[],
  allCards: DemoCard[],
  allOffers: Offer[],
  purchase: PurchaseInput,
  monthlySpendAlready: number,
): OptimizeResult {
  const merchantName = purchase.merchantName;
  const evaluations: MethodEvaluation[] = [];

  for (const wc of wallet) {
    if (!wc.active) continue;
    const card = allCards.find((c) => c.slug === wc.slug);
    if (!card) {
      continue;
    }
    evaluations.push(evaluateCard(card, purchase, allOffers, monthlySpendAlready));
  }

  const eligible = evaluations
    .filter((e) => e.eligible)
    .sort((a, b) => b.totalBenefit - a.totalBenefit);

  const best = eligible[0] ?? null;
  const alternatives = eligible.slice(1);

  const assumptions = [
    "Calculations are estimates based on demo reward rules, not verified live terms.",
    "Merchant category is assumed from the selected category; issuer MCC mapping may differ.",
    monthlySpendAlready > 0
      ? `Assumes ₹${monthlySpendAlready.toLocaleString("en-IN")} already spent this month toward category caps.`
      : "Assumes no prior spend this month toward category caps.",
  ];

  const warnings = best?.warnings ?? [];

  return {
    merchant: {
      name: merchantName,
      category: purchase.category,
      categoryLabel: categoryLabel(purchase.category),
      categoryEmoji: categoryEmoji(purchase.category),
    },
    purchase,
    best,
    alternatives,
    combinedOffer: best?.offer ?? null,
    assumptions,
    warnings,
    sourceStatus: {
      cards: "Demo catalog — estimated rates",
      offers: "Demo offers — not live promotions",
      rates: "All arithmetic computed deterministically by the rules engine",
    },
  };
}
