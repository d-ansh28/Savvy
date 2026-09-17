/**
 * Savvy deterministic reward engine.
 *
 * ALL financial arithmetic lives here — never in the UI, never in an LLM.
 * The engine is pure: same wallet + purchase => same result.
 *
 * Semantics:
 * - A transaction earns the SINGLE best matching reward rule (real cards pay
 *   either the base rate or the category multiplier — never both).
 * - Caps limit the REWARD VALUE (₹) per month — not the spend.
 * - Cashback + offers are money back now; points/miles are value earned
 *   on top (deferred) and do NOT reduce the effective cost.
 * - Offers apply only to the matching merchant (and issuer/network when the
 *   offer targets specific cards), with stacking rules honored.
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
  /** Money back now (cashback) — reduces effective cost. */
  cashback: number;
  /** Points/miles earned — deferred value, shown separately. */
  points: number;
  pointKind: "cashback" | "points" | "miles";
  /** ₹ value of the points earned on this transaction. */
  pointsValue: number;
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

/** Outside-wallet suggestion: what a card NOT in the wallet would earn here. */
export interface CatalogSuggestion {
  slug: string;
  issuer: string;
  name: string;
  rewardType: DemoCard["rewardType"];
  estimatedBenefit: number;
  annualFee: number;
  why: string;
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
  /** Best cards NOT in the wallet for this purchase (catalog discovery). */
  catalogSuggestions: CatalogSuggestion[];
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

const inr = (n: number) => `₹${round2(n).toLocaleString("en-IN")}`;

/** Inclusive date check against the offer window. */
function offerActive(offer: Offer, dateISO: string): boolean {
  return dateISO >= offer.startsAt && dateISO <= offer.endsAt;
}

/**
 * Resolve which catalog merchant the purchase is at, by exact/alias/prefix
 * match on name. Returns null when the merchant is unknown — offers then
 * apply only by category (never cross-merchant).
 */
function resolveMerchantId(merchantName: string, merchants: { id: string; name: string; aliases: string[] }[]): string | null {
  const q = merchantName.trim().toLowerCase();
  if (!q) return null;
  for (const m of merchants) {
    if (m.name.toLowerCase() === q || m.id === q) return m.id;
    if (m.aliases.some((a) => a.toLowerCase() === q)) return m.id;
  }
  // Prefix containment ("amazon sale", "swiggy instamart") — min 4 chars.
  for (const m of merchants) {
    const names = [m.name.toLowerCase(), ...m.aliases.map((a) => a.toLowerCase())];
    if (names.some((n) => n.length >= 4 && (q.includes(n) || n.includes(q)))) return m.id;
  }
  return null;
}

/** Offer value for this purchase, before merchant/payment eligibility. */
function offerValue(offer: Offer, amount: number): number {
  const raw = offer.percent
    ? Math.min(amount * offer.percent, offer.maxBenefit)
    : Math.min(offer.flat ?? 0, offer.maxBenefit);
  return round2(Math.max(0, raw));
}

/**
 * Offers eligible for THIS card at THIS merchant. An offer applies when:
 * - it is active for the purchase date,
 * - the cart meets its minimum,
 * - it targets the purchase merchant (or, for unknown merchants, matches the
 *   merchant category), and
 * - when it names specific issuers/networks, the card matches them.
 */
function eligibleOffers(
  offers: Offer[],
  purchase: PurchaseInput,
  card: DemoCard,
  merchantId: string | null,
  merchantCategory: Category | undefined,
): Offer[] {
  return offers.filter((o) => {
    if (!offerActive(o, purchase.dateISO)) return false;
    if (o.minAmount > purchase.amount) return false;
    if (offerValue(o, purchase.amount) <= 0) return false;

    const cardIssuers = card.issuer.toLowerCase();
    const issuerOk =
      !o.eligibleIssuers?.length ||
      o.eligibleIssuers.some((i) => cardIssuers.includes(i.toLowerCase()));
    const networkOk =
      !o.eligibleNetworks?.length || o.eligibleNetworks.includes(card.network);
    if (!issuerOk || !networkOk) return false;

    if (merchantId) {
      return o.merchantId === merchantId;
    }
    // Unknown merchant: only category-level offers (same category) may apply.
    return merchantCategory !== undefined && o.merchantCategory === merchantCategory;
  });
}

/**
 * Select the offers to apply honoring stacking rules: apply the single best
 * offer; further offers only when the applied offer explicitly stacks with
 * them, up to a maximum of two (one bank + one merchant/platform offer).
 */
function applyOffers(
  offers: Offer[],
  purchase: PurchaseInput,
): { total: number; applied: { offer: Offer; value: number }[] } {
  const sorted = [...offers].sort(
    (a, b) => offerValue(b, purchase.amount) - offerValue(a, purchase.amount),
  );
  if (sorted.length === 0) return { total: 0, applied: [] };

  const applied: { offer: Offer; value: number }[] = [sorted[0]].map((o) => ({
    offer: o,
    value: offerValue(o, purchase.amount),
  }));

  if (sorted[0].stacksWith && sorted[0].stacksWith.length > 0) {
    for (const candidate of sorted.slice(1)) {
      if (applied.length >= 2) break;
      if (!sorted[0].stacksWith.includes(candidate.id)) continue;
      applied.push({ offer: candidate, value: offerValue(candidate, purchase.amount) });
    }
  }

  return {
    total: round2(applied.reduce((s, a) => s + a.value, 0)),
    applied,
  };
}

/** Evaluate a single rule for this purchase (no caps). */
function evaluateRule(
  rule: RewardRule,
  purchase: PurchaseInput,
): { value: number; rulePoints: number } | null {
  if (rule.category && rule.category !== purchase.category) return null;
  if (rule.excludedCategories?.includes(purchase.category)) return null;
  if (rule.onlineOnly && purchase.channel === "offline") return null;
  if (rule.minAmount !== undefined && purchase.amount < rule.minAmount) return null;
  if (rule.maxAmount !== undefined && purchase.amount > rule.maxAmount) return null;

  if (rule.kind === "cashback" && rule.percent) {
    return { value: purchase.amount * rule.percent, rulePoints: 0 };
  }
  if ((rule.kind === "points" || rule.kind === "miles") && rule.pointsPer100 && rule.pointValue) {
    const rulePoints = Math.floor((purchase.amount / 100) * rule.pointsPer100);
    return { value: rulePoints * rule.pointValue, rulePoints };
  }
  return null;
}

/** Evaluate a single card against the purchase, deterministically. */
function evaluateCard(
  card: DemoCard,
  purchase: PurchaseInput,
  offers: Offer[],
  merchantId: string | null,
  merchantCategory: Category | undefined,
): MethodEvaluation {
  const assumptions: string[] = [];
  const warnings: string[] = [];

  // 1. Reward rules — the card earns its SINGLE best matching rate.
  let best: { rule: RewardRule; value: number; rulePoints: number } | null = null;
  let matchedRuleCount = 0;
  for (const rule of card.rules) {
    const res = evaluateRule(rule, purchase);
    if (!res) continue;
    matchedRuleCount++;
    if (!best || res.value > best.value) {
      best = { rule, value: res.value, rulePoints: res.rulePoints };
    }
  }

  if (!best) {
    return {
      slug: card.slug,
      issuer: card.issuer,
      name: card.name,
      network: card.network,
      art: card.art,
      rewardType: card.rewardType,
      cashback: 0,
      points: 0,
      pointKind: card.rewardType,
      pointsValue: 0,
      offer: null,
      totalBenefit: 0,
      effectiveCost: purchase.amount,
      steps: ["No reward rule matched this purchase."],
      assumptions,
      warnings,
      eligible: false,
      ineligibleReason: "No reward rule matched this purchase",
      annualFee: card.annualFee,
    };
  }

  const { rule, rulePoints } = best;
  let baseValue = best.value;
  const steps: string[] = [];

  if (rule.kind === "cashback" && rule.percent) {
    steps.push(
      `Cashback: ${inr(purchase.amount)} × ${(rule.percent * 100).toFixed(1).replace(/\.0$/, "")}% = ${inr(baseValue)}`,
    );
  } else {
    steps.push(
      `Points: ${inr(purchase.amount)} ÷ 100 × ${rule.pointsPer100} = ${rulePoints.toLocaleString("en-IN")} ${rule.kind === "miles" ? "miles" : "points"} × ₹${rule.pointValue}/pt = ${inr(baseValue)}`,
    );
  }

  // Caps — monthlyCap caps the ₹ reward value for the month; transactionCap
  // caps the ₹ reward value per transaction. (Cap currency = reward ₹.)
  if (rule.monthlyCap !== undefined && baseValue > rule.monthlyCap) {
    warnings.push(
      `Monthly cap: ${inr(rule.monthlyCap)} reward value per month — benefit reduced from ${inr(baseValue)} to ${inr(rule.monthlyCap)}.`,
    );
    baseValue = rule.monthlyCap;
  }
  if (rule.transactionCap !== undefined && baseValue > rule.transactionCap) {
    warnings.push(`Transaction cap ${inr(rule.transactionCap)} applied.`);
    baseValue = rule.transactionCap;
  }
  baseValue = round2(baseValue);

  if (rule.category === undefined && matchedRuleCount > 1) {
    assumptions.push("Base (non-category) rate applied — no boosted category matched this purchase.");
  }
  if (rule.onlineOnly) {
    assumptions.push("Assumes online transaction (rule is online-only).");
  }
  if (rule.monthlyCap !== undefined) {
    assumptions.push(`Monthly reward cap ${inr(rule.monthlyCap)} on this rate.`);
  }
  if (rule.note) assumptions.push(rule.note);
  assumptions.push(`Rate source: ${rule.provenance.source} — verified ${rule.provenance.last_verified}. Status: ${rule.status}.`);

  // 2. Offers — merchant-targeted, issuer/network-filtered, stacking honored.
  const applicable = eligibleOffers(offers, purchase, card, merchantId, merchantCategory);
  const { total: offerBenefit, applied } = applyOffers(applicable, purchase);

  for (const a of applied) {
    assumptions.push(
      `Offer "${a.offer.title}" applied: ${inr(a.value)} (${a.offer.source}, verified ${a.offer.lastVerified}).`,
    );
  }
  if (applied.length > 1) {
    assumptions.push("Offers were stacked per declared stacking rules — verify at checkout.");
  }
  steps.push(
    applied.length > 0
      ? `Offers: ${inr(offerBenefit)} across ${applied.length} eligible offer(s).`
      : "Offers: none applicable for this merchant, date and payment method.",
  );

  // 3. Totals. Cashback is money back now; points are deferred value.
  const isCashback = card.rewardType === "cashback" && rule.kind === "cashback";
  const cashback = isCashback ? baseValue : 0;
  const pointsValue = isCashback ? 0 : round2(baseValue);
  const points = isCashback ? 0 : rulePoints;

  const totalBenefit = round2(cashback + pointsValue + offerBenefit);
  const effectiveCost = round2(Math.max(0, purchase.amount - cashback - offerBenefit));

  return {
    slug: card.slug,
    issuer: card.issuer,
    name: card.name,
    network: card.network,
    art: card.art,
    rewardType: card.rewardType,
    cashback,
    points,
    pointKind: card.rewardType,
    pointsValue,
    offer:
      applied.length > 0
        ? {
            offerId: applied[0].offer.id,
            title:
              applied.length === 1
                ? applied[0].offer.title
                : `${applied.length} offer(s) applied`,
            benefit: round2(offerBenefit),
          }
        : null,
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
  merchants: { id: string; name: string; aliases: string[]; category: Category }[],
): Omit<OptimizeResult, "assumptions" | "warnings" | "sourceStatus"> & {
  assumptions: string[];
  warnings: string[];
  sourceStatus: OptimizeResult["sourceStatus"];
} {
  const merchantName = purchase.merchantName;
  const merchantId = resolveMerchantId(merchantName, merchants);
  const merchantCategory = merchants.find((m) => m.id === merchantId)?.category;
  const evaluations: MethodEvaluation[] = [];

  for (const wc of wallet) {
    if (!wc.active) continue;
    const card = allCards.find((c) => c.slug === wc.slug);
    if (!card) continue;
    evaluations.push(
      evaluateCard(card, purchase, allOffers, merchantId, merchantCategory),
    );
  }

  const eligible = evaluations
    .filter((e) => e.eligible)
    .sort((a, b) =>
      b.totalBenefit - a.totalBenefit ||
      a.effectiveCost - b.effectiveCost ||
      a.annualFee - b.annualFee,
    );

  const best = eligible[0] ?? null;
  const alternatives = eligible.slice(1);

  // Outside-wallet discovery — deterministic evaluation of catalog cards the
  // user doesn't own, honestly labeled as catalog estimates.
  const ownedSlugs = new Set(wallet.map((w) => w.slug));
  const suggestions: CatalogSuggestion[] = allCards
    .filter((c) => !ownedSlugs.has(c.slug))
    .map((c) => {
      const ev = evaluateCard(c, purchase, allOffers, merchantId, merchantCategory);
      const catMatch = ev.eligible
        ? c.categories.includes(purchase.category)
        : false;
      return {
        slug: c.slug,
        issuer: c.issuer,
        name: c.name,
        rewardType: c.rewardType,
        estimatedBenefit: ev.totalBenefit,
        annualFee: c.annualFee,
        why: ev.eligible
          ? catMatch
            ? `Boosted ${categoryLabel(purchase.category).toLowerCase()} rewards — est. ${inr(ev.totalBenefit)} benefit on this purchase`
            : `Est. ${inr(ev.totalBenefit)} benefit on this purchase at base rate`
          : `No matching reward rule for ${categoryLabel(purchase.category).toLowerCase()} here`,
      };
    })
    .filter((s) => s.estimatedBenefit > 0)
    .sort((a, b) => b.estimatedBenefit - a.estimatedBenefit)
    .slice(0, 3);

  const assumptions = [
    "Calculations are estimates based on catalog reward rules — verify current terms with your issuer at checkout.",
    merchantCategory
      ? `Merchant matched to ${categoryLabel(merchantCategory).toLowerCase()}; issuer MCC mapping may differ.`
      : "Unknown merchant — only category-level offers considered.",
    "A transaction earns the single best matching rate (base OR category multiplier), never both.",
    "Points/miles value is deferred (earned on top) and does not reduce what you pay today.",
  ];

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
    catalogSuggestions: suggestions,
    combinedOffer: best?.offer ?? null,
    assumptions,
    warnings: best?.warnings ?? [],
    sourceStatus: {
      cards: "Verified catalog rates",
      offers: "Verified offers — active windows only",
      rates: "All arithmetic computed deterministically by the rules engine",
    },
  };
}

export interface CatalogScanRow {
  slug: string;
  card: DemoCard;
  issuer: string;
  name: string;
  network: DemoCard["network"];
  art: DemoCard["art"];
  rewardType: DemoCard["rewardType"];
  /** Total estimated benefit for the given purchase (cashback + points value + offers). */
  totalBenefit: number;
  /** Money-back-now component (cashback + offers). */
  nowBenefit: number;
  /** Deferred points/miles value component. */
  deferredValue: number;
  annualFee: number;
  upi: boolean;
  domesticLounge?: string;
  intlLounge?: string;
  golf?: string;
  /** Top matched reward note, e.g. "10% on Swiggy". */
  bestRuleNote?: string;
  owned: boolean;
}

/**
 * Scan the ENTIRE catalog for the best cards for a given purchase.
 * Deterministic: same inputs => same ranking. Used by Offers (merchant match),
 * Insights (category leaderboard) and the AI assistant (catalog context).
 */
export function bestCardsForPurchase(
  purchase: PurchaseInput,
  allCards: DemoCard[],
  allOffers: Offer[],
  merchants: { id: string; name: string; aliases: string[]; category: Category }[],
  ownedSlugs: string[] = [],
  limit = 10,
): CatalogScanRow[] {
  const merchantId = resolveMerchantId(purchase.merchantName, merchants);
  const merchantCategory = merchants.find((m) => m.id === merchantId)?.category;
  const owned = new Set(ownedSlugs);

  const rows = allCards.map((card) => {
    const ev = evaluateCard(card, purchase, allOffers, merchantId, merchantCategory);
    const now = round2(ev.cashback + (ev.offer?.benefit ?? 0));
    const bestRule =
      card.rules
        .filter((r) => !r.category || r.category === purchase.category)
        .sort(
          (a, b) =>
            (b.pointsPer100 ?? 0) * (b.pointValue ?? 0) + (b.percent ?? 0) * 100 -
            ((a.pointsPer100 ?? 0) * (a.pointValue ?? 0) + (a.percent ?? 0) * 100),
        )[0];
    return {
      slug: card.slug,
      card,
      issuer: card.issuer,
      name: card.name,
      network: card.network,
      art: card.art,
      rewardType: card.rewardType,
      totalBenefit: ev.totalBenefit,
      nowBenefit: now,
      deferredValue: round2(ev.pointsValue),
      annualFee: card.annualFee,
      upi: card.perks?.upi === true,
      domesticLounge: card.perks?.domesticLounge,
      intlLounge: card.perks?.intlLounge,
      golf: card.perks?.golf,
      bestRuleNote: ev.eligible ? bestRule?.note : undefined,
      owned: owned.has(card.slug),
    } as CatalogScanRow;
  });

  return rows
    .sort(
      (a, b) =>
        b.totalBenefit - a.totalBenefit ||
        b.nowBenefit - a.nowBenefit ||
        a.annualFee - b.annualFee,
    )
    .slice(0, limit);
}

export interface CategoryGap {
  category: Category;
  categoryLabel: string;
  categoryEmoji: string;
  /** Representative monthly spend used for the estimate. */
  sampleAmount: number;
  /** #1 card in the entire catalog for this category. */
  catalogBest: CatalogScanRow;
  /** #1 card the user owns for this category (null if none earns anything). */
  ownedBest: CatalogScanRow | null;
  /** ₹/month the user leaves on the table vs the catalog best. */
  monthlyGap: number;
}

const CATEGORY_SAMPLES: { category: Category; amount: number }[] = [
  { category: "ecommerce", amount: 12000 },
  { category: "groceries", amount: 8000 },
  { category: "dining", amount: 6000 },
  { category: "shopping", amount: 8000 },
  { category: "fuel", amount: 5000 },
  { category: "flights", amount: 15000 },
  { category: "hotels", amount: 12000 },
  { category: "travel", amount: 10000 },
  { category: "utilities", amount: 3000 },
  { category: "subscriptions", amount: 1500 },
  { category: "entertainment", amount: 2500 },
  { category: "telecom", amount: 1000 },
];

/**
 * Catalog-wide category analysis: for each major spend category, the best card
 * in the whole catalog vs the best card the user owns — the monthly gap is the
 * money a better card could capture. Deterministic.
 */
export function categoryGapAnalysis(
  allCards: DemoCard[],
  allOffers: Offer[],
  merchants: { id: string; name: string; aliases: string[]; category: Category }[],
  ownedSlugs: string[],
): CategoryGap[] {
  const today = new Date().toISOString().slice(0, 10);
  const out: CategoryGap[] = [];
  for (const { category, amount } of CATEGORY_SAMPLES) {
    const rows = bestCardsForPurchase(
      { merchantName: "", amount, category, dateISO: today, channel: "online" },
      allCards,
      allOffers,
      merchants,
      ownedSlugs,
      allCards.length,
    );
    if (rows.length === 0) continue;
    const catalogBest = rows[0];
    const ownedBest = rows.find((r) => r.owned) ?? null;
    // Normalize to monthly value (sample is a monthly-ish basket for the category).
    const monthlyGap = round2(
      Math.max(0, catalogBest.totalBenefit - (ownedBest?.totalBenefit ?? 0)),
    );
    out.push({
      category,
      categoryLabel: categoryLabel(category),
      categoryEmoji: categoryEmoji(category),
      sampleAmount: amount,
      catalogBest,
      ownedBest,
      monthlyGap,
    });
  }
  return out;
}

export interface EarnRateRow {
  slug: string;
  card: DemoCard;
  issuer: string;
  name: string;
  /** Reward ₹ value earned per ₹10,000 spend in this category. */
  valuePer10k: number;
  /** Raw earn label, e.g. "5% cashback" or "10 pts/₹100". */
  rateLabel: string;
  rewardType: DemoCard["rewardType"];
  annualFee: number;
  upi: boolean;
}

/**
 * Rank the ENTIRE catalog by how fast each card earns rewards for a given
 * category. Deterministic; used by the rewards vault's "fastest earners" panel.
 */
export function bestEarnersForCategory(
  category: Category,
  allCards: DemoCard[],
  limit = 8,
): EarnRateRow[] {
  const rows: EarnRateRow[] = [];
  for (const card of allCards) {
    const rule =
      card.rules.find((r) => r.category === category) ??
      card.rules.find((r) => r.category === undefined);
    if (!rule) continue;
    const rupeesPer100 =
      rule.kind === "cashback"
        ? (rule.percent ?? 0) * 100
        : (rule.pointsPer100 ?? 0) * (rule.pointValue ?? 0);
    if (!(rupeesPer100 > 0)) continue;
    rows.push({
      slug: card.slug,
      card,
      issuer: card.issuer,
      name: card.name,
      valuePer10k: Math.round(rupeesPer100 * 100),
      rateLabel:
        rule.kind === "cashback"
          ? `${Math.round((rule.percent ?? 0) * 1000) / 10}% cashback`
          : `${rule.pointsPer100} ${rule.kind === "miles" ? "miles" : "pts"}/₹100`,
      rewardType: card.rewardType,
      annualFee: card.annualFee,
      upi: card.perks?.upi === true,
    });
  }
  return rows.sort((a, b) => b.valuePer10k - a.valuePer10k).slice(0, limit);
}

/**
 * Rank the entire catalog by how fast each card earns a given REWARD KIND
 * (cashback / points / miles) at its best base rate. Deterministic; used by
 * the rewards vault's "earn this currency fastest" panel.
 */
export function bestEarnersForRewardKind(
  kind: DemoCard["rewardType"],
  allCards: DemoCard[],
  limit = 8,
): EarnRateRow[] {
  const rows: EarnRateRow[] = [];
  for (const card of allCards) {
    if (card.rewardType !== kind) continue;
    const rule =
      card.rules.find((r) => r.category === undefined) ??
      [...card.rules].sort(
        (a, b) =>
          (b.pointsPer100 ?? 0) * (b.pointValue ?? 0) + (b.percent ?? 0) * 100 -
          ((a.pointsPer100 ?? 0) * (a.pointValue ?? 0) + (a.percent ?? 0) * 100),
      )[0];
    if (!rule) continue;
    const rupeesPer100 =
      rule.kind === "cashback"
        ? (rule.percent ?? 0) * 100
        : (rule.pointsPer100 ?? 0) * (rule.pointValue ?? 0);
    if (!(rupeesPer100 > 0)) continue;
    rows.push({
      slug: card.slug,
      card,
      issuer: card.issuer,
      name: card.name,
      valuePer10k: Math.round(rupeesPer100 * 100),
      rateLabel:
        rule.kind === "cashback"
          ? `${Math.round((rule.percent ?? 0) * 1000) / 10}% cashback`
          : `${rule.pointsPer100} ${rule.kind === "miles" ? "miles" : "pts"}/₹100`,
      rewardType: card.rewardType,
      annualFee: card.annualFee,
      upi: card.perks?.upi === true,
    });
  }
  return rows.sort((a, b) => b.valuePer10k - a.valuePer10k).slice(0, limit);
}
