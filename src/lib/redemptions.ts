import { getProgram, getDemoCard, OFFERS, getMerchant, type RewardKind } from "./catalog";

/**
 * DYNAMIC REDEMPTION PLANNER (deterministic)
 * ------------------------------------------
 * For a tracked reward balance, computes the concrete things those points can
 * get RIGHT NOW — and how to claim them — using only verified catalog data:
 *
 *  1. Voucher ladder      — face-value vouchers at the program's verified
 *                           per-point value (pointsRequired = value ÷ pv).
 *  2. Offer boosters      — LIVE rolling-window offers from the offers catalog
 *                           the user can claim with cards they own: free extra
 *                           rupee value on top of any redemption (0 points).
 *  3. Travel conversion   — points × pv × portal multiplier expressed as the
 *                           travel budget it becomes (flights/hotels/trips),
 *                           always labeled as a portal-rate conversion.
 *  4. Statement credit    — for cashback-kind programs, the honest single-step
 *                           answer (cashback auto-credits; there is nothing to
 *                           "claim").
 *
 * Everything is derived from the program's demoPointValue and today's live
 * offer windows. Nothing is hardcoded per-threshold; nothing is invented.
 */

export type RedemptionCategory =
  | "flight"
  | "hotel"
  | "trip"
  | "voucher"
  | "statement"
  | "offer";

export interface RedemptionOption {
  /** Program this option belongs to (DEMO_PROGRAMS.id). */
  programId: string;
  /** What you actually get, e.g. "Amazon Pay voucher". */
  title: string;
  /** Concrete detail, e.g. "₹1,000 instant voucher — usable on anything". */
  example: string;
  category: RedemptionCategory;
  emoji: string;
  /** Points this option spends (0 = costs no points, e.g. an offer booster). */
  pointsRequired: number;
  /** Deterministic est. rupee value of the option. */
  estValue: number;
  /** Where the redemption physically happens (portal/app). */
  whereToClaim: string;
  /** Ordered, actionable claim steps (may be a single step). */
  claimSteps: string[];
  /** Extra conditions (caps, availability, deadlines). */
  caveat?: string;
  /** Set when the value comes from a live catalog offer. */
  offerBoost?: {
    merchant: string;
    card: string;
    offerTitle: string;
    endsAt: string;
  };
}

/** Voucher face values used to build each program's ladder (₹). */
const VOUCHER_LADDER = [250, 500, 1_000, 2_000] as const;

/** Travel-portal multiplier used by the scenario engine (catalog estimate). */
const TRAVEL_PORTAL_MULTIPLIER = 1.1;

export interface OwnedCardRef {
  slug: string;
}

export interface RedemptionContext {
  /** Wallet cards — gates offer boosters to offers the user can actually claim. */
  ownedCards?: OwnedCardRef[];
  /** ISO date for live-offer checks; defaults to today. */
  todayISO?: string;
}

// ---------------------------------------------------------------------------
// Voucher ladder
// ---------------------------------------------------------------------------

interface VoucherVenue {
  merchantId: string;
  label: string;
  via: string;
  steps: (faceValue: number) => string[];
}

/** Where each program's vouchers are issued, from the verified catalog. */
const VOUCHER_VENUES: Record<string, VoucherVenue> = {
  "amex-mr": {
    merchantId: "amazon",
    label: "Amazon Pay",
    via: "Amex Offers → Membership Rewards → Vouchers",
    steps: (v) => [
      "Log in at americanexpress.com/en-in → Offers → Membership Rewards",
      `Pick the Amazon Pay ₹${v.toLocaleString("en-IN")} voucher and confirm with MR points`,
      "The voucher code arrives in your registered email within minutes",
    ],
  },
  "hdfc-reward-points": {
    merchantId: "amazon",
    label: "SmartBuy voucher",
    via: "HDFC SmartBuy → Redeem → Vouchers",
    steps: (v) => [
      "Log in to SmartBuy (offers.smartbuy.hdfcbank.com) with your HDFC card",
      `Choose a partner voucher worth ₹${v.toLocaleString("en-IN")} and pay with Reward Points`,
      "The code is issued instantly on-screen and by email",
    ],
  },
  "axis-edge-miles": {
    merchantId: "flipkart",
    label: "EDGE REWARDZ voucher",
    via: "Axis EDGE REWARDZ → Vouchers",
    steps: (v) => [
      "Log in to Axis Internet Banking → EDGE REWARDZ",
      `Redeem EDGE Miles for the ₹${v.toLocaleString("en-IN")} voucher`,
      "The voucher code is issued instantly on-screen",
    ],
  },
  "tata-neu": {
    merchantId: "bigbasket",
    label: "BigBasket voucher",
    via: "Tata Neu app → NeuCoins → Vouchers",
    steps: (v) => [
      "Open the Tata Neu app → NeuCoins section",
      `Choose the BigBasket ₹${v.toLocaleString("en-IN")} voucher — NeuCoins debit 1:1`,
      "The voucher credits instantly and applies at BigBasket checkout",
    ],
  },
};

/**
 * Voucher options for a program, derived from its verified per-point value:
 * the largest face values the balance can afford, plus the ladder context.
 */
function voucherOptions(programId: string, pv: number): RedemptionOption[] {
  const venue = VOUCHER_VENUES[programId];
  if (!venue) return [];
  const merchant = getMerchant(venue.merchantId);
  const out: RedemptionOption[] = [];
  for (const face of VOUCHER_LADDER) {
    const pts = Math.ceil(face / pv);
    out.push({
      programId,
      title: `${venue.label} ₹${face.toLocaleString("en-IN")}`,
      example: `${merchant?.name ?? venue.label} instant voucher — usable on anything in the cart`,
      category: "voucher",
      emoji: "🎁",
      pointsRequired: pts,
      estValue: face,
      whereToClaim: venue.via,
      claimSteps: venue.steps(face),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Offer boosters — live offers claimable with cards the user owns
// ---------------------------------------------------------------------------

/** Replicates the engine's inclusive offer-window check. */
function offerActive(startsAt: string, endsAt: string, todayISO: string): boolean {
  return todayISO >= startsAt && todayISO <= endsAt;
}

/**
 * Live catalog offers the user can claim with owned cards, expressed as free
 * rupee value (0 points spent). Deterministic: benefit is the offer's flat
 * value, or its maxBenefit cap for percent offers ("up to", capped).
 */
function offerBoosterOptions(
  programId: string,
  ownedCards: OwnedCardRef[],
  todayISO: string,
): RedemptionOption[] {
  const resolved = ownedCards
    .map((c) => getDemoCard(c.slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (!resolved.length) return [];

  const out: RedemptionOption[] = [];
  for (const offer of OFFERS) {
    if (!offerActive(offer.startsAt, offer.endsAt, todayISO)) continue;
    // Issuer eligibility: at least one owned card from an eligible issuer.
    if (
      offer.eligibleIssuers &&
      !resolved.some((c) =>
        offer.eligibleIssuers!.some((sub) => c.issuer.toLowerCase().includes(sub.toLowerCase())),
      )
    ) {
      continue;
    }
    const claimCard =
      resolved.find((c) =>
        offer.eligibleIssuers?.some((sub) => c.issuer.toLowerCase().includes(sub.toLowerCase())),
      ) ?? resolved[0];
    const merchant = getMerchant(offer.merchantId);
    const isPercent = offer.percent !== undefined;
    const benefit = isPercent ? offer.maxBenefit : (offer.flat ?? offer.maxBenefit);
    if (!(benefit > 0)) continue;
    out.push({
      programId,
      title: `${merchant?.name ?? offer.merchantId} offer — up to ₹${benefit.toLocaleString("en-IN")} extra`,
      example: isPercent
        ? `${offer.title}: ${Math.round(offer.percent! * 100)}% off with your ${claimCard.name} (capped at ₹${offer.maxBenefit.toLocaleString("en-IN")})`
        : `${offer.title}: flat ₹${(offer.flat ?? benefit).toLocaleString("en-IN")} with your ${claimCard.name}`,
      category: "offer",
      emoji: "🔥",
      pointsRequired: 0,
      estValue: benefit,
      whereToClaim: `${claimCard.issuer} app → Offers`,
      claimSteps: [
        `Open the ${claimCard.issuer} app → Offers → activate "${offer.title}"`,
        `Pay at ${merchant?.name ?? offer.merchantId} with your ${claimCard.name} before ${offer.endsAt}`,
        `Stack it with any points redemption from this program for extra total value`,
      ],
      caveat: isPercent ? "Percent offers need a qualifying spend — the cap is the max possible benefit." : undefined,
      offerBoost: {
        merchant: merchant?.name ?? offer.merchantId,
        card: `${claimCard.issuer} ${claimCard.name}`,
        offerTitle: offer.title,
        endsAt: offer.endsAt,
      },
    });
  }
  // Highest free value first; keep the top three so the plan stays readable.
  return out.sort((a, b) => b.estValue - a.estValue).slice(0, 3);
}

// ---------------------------------------------------------------------------
// Travel conversion — portal-rate budget from the points balance
// ---------------------------------------------------------------------------

function travelOptions(
  programId: string,
  pv: number,
  points: number,
  kind: RewardKind,
): RedemptionOption[] {
  const portalBudget = Math.round(points * pv * TRAVEL_PORTAL_MULTIPLIER);
  if (!(portalBudget > 0)) return [];

  const base: RedemptionOption[] = [
    {
      programId,
      title: "Flight booking via travel portal",
      example: `≈₹${portalBudget.toLocaleString("en-IN")} toward an IndiGo/Air India domestic ticket`,
      category: "flight",
      emoji: "✈️",
      pointsRequired: points,
      estValue: portalBudget,
      whereToClaim: "Issuer travel portal → Flights",
      claimSteps: [
        "Open your issuer's travel portal and search flights like a normal booking",
        "At payment choose 'Pay with points' — points convert at the portal rate",
        "The e-ticket comes straight from the airline",
      ],
      caveat: `Portal rate ≈ ₹${(Math.round(pv * TRAVEL_PORTAL_MULTIPLIER * 100) / 100).toFixed(2)}/pt — check the exact rate at checkout.`,
    },
  ];

  if (kind !== "miles") {
    base.push({
      programId,
      title: "Hotel stay via travel portal",
      example: `≈₹${portalBudget.toLocaleString("en-IN")} toward a Taj/city-hotel booking`,
      category: "hotel",
      emoji: "🏨",
      pointsRequired: points,
      estValue: portalBudget,
      whereToClaim: "Issuer travel portal → Hotels",
      claimSteps: [
        "Open your issuer's travel portal → Hotels, pick city + dates",
        "Choose 'Pay with points' at checkout",
        "The booking confirmation comes from the hotel partner",
      ],
      caveat: `Portal rate ≈ ₹${(Math.round(pv * TRAVEL_PORTAL_MULTIPLIER * 100) / 100).toFixed(2)}/pt — check the exact rate at checkout.`,
    });
  }

  base.push({
    programId,
    title: "Trip combo (flight + hotel)",
    example: `≈₹${portalBudget.toLocaleString("en-IN")} spread across one flight + stay itinerary`,
    category: "trip",
    emoji: "🏝️",
    pointsRequired: points,
    estValue: portalBudget,
    whereToClaim: "Issuer travel portal → bundle booking",
    claimSteps: [
      "Build the flight + hotel itinerary in the travel portal",
      "Redeem points against the total; pay any gap with your card",
      "E-tickets and hotel vouchers arrive by email",
    ],
    caveat: `Same portal rate applies to every leg — ₹${(Math.round(pv * TRAVEL_PORTAL_MULTIPLIER * 100) / 100).toFixed(2)}/pt.`,
  });

  return base;
}

// ---------------------------------------------------------------------------
// Statement credit (cashback-kind programs)
// ---------------------------------------------------------------------------

function statementOption(programId: string, pv: number, points: number): RedemptionOption {
  return {
    programId,
    title: "Statement credit",
    example: `Your ₹${points.toLocaleString("en-IN")} cashback — spend it anywhere`,
    category: "statement",
    emoji: "🧾",
    pointsRequired: 0,
    estValue: Math.round(points * pv),
    whereToClaim: "Automatic — no action needed",
    claimSteps: [
      "Nothing to claim: cashback auto-credits to your card statement quarterly (₹1 = ₹1)",
    ],
  };
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

/**
 * All concrete redemption options for a balance, ranked best-first:
 * offer boosters (free value, 0 points), then best ₹-per-point spent, then
 * travel conversions and vouchers. Cashback programs get the honest
 * statement-credit answer plus any live offer boosters.
 */
export function redemptionOptionsForBalance(
  programId: string,
  points: number,
  ctx: RedemptionContext = {},
): RedemptionOption[] {
  const program = getProgram(programId);
  if (!program) return [];
  const todayISO = ctx.todayISO ?? new Date().toISOString().slice(0, 10);
  const ownedCards = ctx.ownedCards ?? [];
  const boosters = offerBoosterOptions(programId, ownedCards, todayISO);

  if (program.kind === "cashback") {
    return [
      statementOption(programId, 1, points),
      ...boosters,
    ];
  }

  const pv = program.demoPointValue;
  if (!pv) return boosters;

  const vouchers = voucherOptions(programId, pv);
  const travel = travelOptions(programId, pv, points, program.kind);

  const ranked = [...vouchers, ...travel].sort(
    (a, b) => b.estValue / b.pointsRequired - a.estValue / a.pointsRequired || b.estValue - a.estValue,
  );

  return [...boosters, ...ranked];
}

export interface RankedRedemptions {
  affordable: RedemptionOption[];
  nearlyThere: { option: RedemptionOption; pointsGap: number }[];
}

/**
 * Ranked "what your points can get RIGHT NOW": affordable options first
 * (best value-to-points first), then the closest unaffordable options with
 * the exact points gap — deterministic, from the planner above.
 */
export function rankedRedemptions(
  programId: string,
  points: number,
  ctx: RedemptionContext = {},
): RankedRedemptions {
  const options = redemptionOptionsForBalance(programId, points, ctx);
  const affordable = options
    .filter((o) => points >= o.pointsRequired)
    .sort(
      (a, b) =>
        // Free-value options (0 points) always rank first; then ₹/point.
        (b.pointsRequired === 0 ? Number.MAX_SAFE_INTEGER : b.estValue / b.pointsRequired) -
          (a.pointsRequired === 0 ? Number.MAX_SAFE_INTEGER : a.estValue / a.pointsRequired) ||
        b.estValue - a.estValue,
    );
  const nearlyThere = options
    .filter((o) => o.pointsRequired > points)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)
    .slice(0, 3)
    .map((o) => ({ option: o, pointsGap: o.pointsRequired - points }));
  return { affordable, nearlyThere };
}

/** Human label for a redemption category. */
export function redemptionCategoryLabel(category: RedemptionCategory): string {
  switch (category) {
    case "flight":
      return "Flight";
    case "hotel":
      return "Hotel stay";
    case "trip":
      return "Trip";
    case "voucher":
      return "Voucher";
    case "offer":
      return "Offer boost";
    case "statement":
      return "Cash";
  }
}

/**
 * Fastest deterministic way to close the gap for the next big reward. The gap
 * is converted to rupees with the program's verified demoPointValue, then
 * compared against the top catalog earner's ₹ value per ₹10k spend.
 */
export function earnRateHint(
  kind: RewardKind,
  gapPoints: number,
  pointValue: number,
): { card: string; per10k: number; monthsHint: string } | null {
  const top = bestEarnersForRewardKindCompat(kind);
  if (!top.length) return null;
  const e = top[0];
  const gapRupees = gapPoints * pointValue;
  const months = Math.ceil(gapRupees / Math.max(1, e.valuePer10k));
  return {
    card: `${e.issuer} ${e.name}`,
    per10k: e.valuePer10k,
    monthsHint:
      months <= 1
        ? "one month of typical spend"
        : `about ${months} months at ₹10k/month spend`,
  };
}

import { bestEarnersForRewardKind } from "./engine";
import { DEMO_CARDS } from "./catalog";

function bestEarnersForRewardKindCompat(kind: RewardKind) {
  return bestEarnersForRewardKind(kind, DEMO_CARDS, 1);
}
