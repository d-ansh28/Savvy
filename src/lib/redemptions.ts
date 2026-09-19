import { getProgram, getMerchant, type RewardKind } from "./catalog";

/**
 * TIERED AWARD PLANNER (deterministic)
 * ------------------------------------
 * For a tracked reward balance, computes the concrete awards those points can
 * get and exactly how to claim them — as a per-program award ladder:
 *
 *   international trip → weekend trip → domestic return flight →
 *   hotel night → one-way flight → voucher ladder
 *
 * Every award has a fixed realistic rupee value; the points required are
 * DERIVED from the program's verified per-point value (pointsRequired =
 * ceil(value ÷ demoPointValue)), so the same ladder needs different points
 * per program — 18,750 MR points vs 7,500 NeuCoins for the same return
 * flight. Nothing is invented: claim channels, examples and caveats come
 * from the program's catalog entry. Cashback-kind programs get the honest
 * single-step answer (cashback is already rupees; there is nothing to
 * "redeem into").
 */

export type RedemptionCategory =
  | "flight"
  | "hotel"
  | "trip"
  | "voucher"
  | "statement";

export interface RedemptionOption {
  /** Program this option belongs to (DEMO_PROGRAMS.id). */
  programId: string;
  /** The award itself, e.g. "Delhi → Bengaluru return flight". */
  title: string;
  /** Concrete channel/detail, e.g. "via Amex Travel · IndiGo/Air India economy". */
  example: string;
  category: RedemptionCategory;
  emoji: string;
  /** Points/miles this award costs (0 only for cashback statement credit). */
  pointsRequired: number;
  /** Deterministic est. rupee value (pointsRequired × pv, or voucher face). */
  estValue: number;
  /** Where the redemption physically happens (portal/app). */
  whereToClaim: string;
  /** Ordered, actionable claim steps. */
  claimSteps: string[];
  /** Caps, transfer-chart warnings, etc. */
  caveat?: string;
}

// ---------------------------------------------------------------------------
// Award tiers — fixed realistic rupee values; points derived per program
// ---------------------------------------------------------------------------

type AwardTierId =
  | "trip-intl"
  | "trip-weekend"
  | "flight-return"
  | "hotel-night"
  | "flight-oneway";

interface AwardTier {
  id: AwardTierId;
  /** Realistic rupee value of the award; points = ceil(value ÷ pv). */
  value: number;
  title: string;
  emoji: string;
  category: RedemptionCategory;
}

const AWARD_TIERS: AwardTier[] = [
  { id: "trip-intl", value: 60_000, title: "International trip (3N)", emoji: "🌏", category: "trip" },
  { id: "trip-weekend", value: 18_000, title: "Weekend trip (2N)", emoji: "🏝️", category: "trip" },
  { id: "flight-return", value: 7_500, title: "Domestic return flight", emoji: "✈️", category: "flight" },
  { id: "hotel-night", value: 5_000, title: "Hotel night", emoji: "🏨", category: "hotel" },
  { id: "flight-oneway", value: 4_000, title: "One-way flight", emoji: "🛫", category: "flight" },
];

/** Voucher face values for the ladder (₹); points = ceil(face ÷ pv). */
const VOUCHER_FACES = [500, 1_000, 2_000, 5_000] as const;

// ---------------------------------------------------------------------------
// Per-program claim channels — portal, concrete examples, claim steps
// ---------------------------------------------------------------------------

interface ProgramChannel {
  /** Currency unit for this program. */
  unit: string;
  /** Concrete per-tier example, e.g. "Delhi → Bengaluru return, economy". */
  examples: Partial<Record<AwardTierId, string>>;
  /** Fallback example when a tier has no program-specific one. */
  fallbackExample: string;
  /** Where redemptions happen, e.g. "Amex Travel". */
  portal: string;
  /** What the travel inventory is, e.g. "IndiGo/Air India/Vistara economy". */
  inventory: string;
  /** Ordered claim steps; "{tier}" is replaced with the tier title. */
  steps: (tierTitle: string) => string[];
  /** Program-specific warning (caps, transfer charts…). */
  caveat?: string;
}

const CHANNELS: Record<string, ProgramChannel> = {
  "amex-mr": {
    unit: "MR points",
    examples: {
      "trip-intl": "e.g. 3N Thailand — flights + stay booked together in Amex Travel",
      "trip-weekend": "e.g. 2N Goa — flight + hotel bundle in Amex Travel",
      "flight-return": "Delhi → Bengaluru return, economy",
      "hotel-night": "1N 4★ city hotel",
      "flight-oneway": "Mumbai → Delhi one-way, economy",
    },
    fallbackExample: "booked in Amex Travel",
    portal: "Amex Travel (travel.americanexpress.co.in)",
    inventory: "airline/hotel inventory on the Amex Travel portal",
    steps: (tier) => [
      `Book the ${tier.toLowerCase()} in Amex Travel like a normal booking`,
      "At payment, use 'Pay with Points' — MR points convert at the portal rate",
      "Confirmation comes from the airline/hotel directly",
    ],
    caveat:
      "Amex also transfers MR points to 18+ airline/hotel partners at variable ratios — those can beat the portal, but verify the live chart before transferring.",
  },
  "axis-edge-miles": {
    unit: "EDGE Miles",
    examples: {
      "trip-intl": "e.g. 3N Dubai — flights + stay via the EDGE REWARDZ travel portal",
      "trip-weekend": "e.g. 2N Goa — flight + hotel bundle via EDGE REWARDZ",
      "flight-return": "Delhi → Bengaluru return, economy (or transfer miles to a partner airline)",
      "hotel-night": "1N business hotel",
      "flight-oneway": "Bengaluru → Mumbai one-way, economy",
    },
    fallbackExample: "booked in the EDGE REWARDZ travel portal",
    portal: "EDGE REWARDZ travel portal",
    inventory: "flights and hotels on the GrabAxis/EDGE travel portal",
    steps: (tier) => [
      "Log in to Axis Internet Banking → EDGE REWARDZ → Travel",
      `Book the ${tier.toLowerCase()} and choose 'Redeem EDGE Miles' at payment`,
      "The e-ticket/voucher arrives from the travel partner",
    ],
    caveat:
      "Partner airline transfers use variable ratios — they can beat the portal rate, but verify the live chart before transferring.",
  },
  "hdfc-reward-points": {
    unit: "Reward Points",
    examples: {
      "trip-intl": "e.g. 3N Thailand via SmartBuy Travel",
      "trip-weekend": "e.g. 2N Goa — flight + hotel via SmartBuy Travel",
      "flight-return": "Delhi → Bengaluru return, economy",
      "hotel-night": "1N city hotel",
      "flight-oneway": "Mumbai → Goa one-way, economy",
    },
    fallbackExample: "booked in SmartBuy Travel",
    portal: "SmartBuy Travel (offers.smartbuy.hdfcbank.com)",
    inventory: "flights and hotels on the SmartBuy portal",
    steps: (tier) => [
      "Open SmartBuy → Travel and log in with your HDFC card",
      `Book the ${tier.toLowerCase()} and select 'Redeem points' at payment`,
      "Points debit at the SmartBuy rate; any balance goes to your card",
    ],
    caveat:
      "SmartBuy redemption caps apply monthly and vary by card — the portal shows your remaining cap.",
  },
  "scapia-coins": {
    unit: "Coins",
    examples: {
      "trip-intl": "e.g. 3N Thailand booking discounted with Coins",
      "trip-weekend": "e.g. 2N Goa trip discounted with Coins",
      "flight-return": "any domestic return — Coins apply as an instant discount",
      "hotel-night": "any domestic stay — Coins apply as an instant discount",
      "flight-oneway": "any one-way — Coins apply as an instant discount",
    },
    fallbackExample: "booked in the Scapia app",
    portal: "Scapia app → Travel",
    inventory: "flights and hotels bookable inside the Scapia app",
    steps: (tier) => [
      "Open the Scapia app → Travel",
      `Book the ${tier.toLowerCase()} and apply Coins on the payment screen`,
      "The discount applies instantly; pay the rest in-app",
    ],
    caveat:
      "Coins redeem ONLY inside the Scapia app — no vouchers, no cash-out, no transfers.",
  },
  "tata-neu": {
    unit: "NeuCoins",
    examples: {
      "trip-intl": "e.g. 3N international trip via Air India + Taj Holidays",
      "trip-weekend": "e.g. 2N Goa — Air India flight + hotel, one NeuCoins pot",
      "flight-return": "Delhi → Bengaluru on Air India, booked in the Neu app",
      "hotel-night": "1N Taj city hotel",
      "flight-oneway": "Mumbai → Delhi on Air India",
    },
    fallbackExample: "booked inside the Tata Neu app",
    portal: "Tata Neu app (Air India / Taj / BigBasket / Croma)",
    inventory: "Air India flights, Taj hotels and the Tata ecosystem",
    steps: (tier) => [
      "Open the Tata Neu app → Travel",
      `Book the ${tier.toLowerCase()}, then toggle 'Use NeuCoins' at checkout — 1 NeuCoin = ₹1`,
      "NeuCoins debit instantly against the booking",
    ],
  },
};

/** Generic channel for future programs with a per-point value. */
function genericChannel(issuer: string): ProgramChannel {
  return {
    unit: "points",
    examples: {},
    fallbackExample: "booked on the issuer travel portal",
    portal: `${issuer} rewards portal → Travel`,
    inventory: "flights and hotels on the issuer portal",
    steps: (tier) => [
      `Log in to the ${issuer} rewards portal → Travel`,
      `Book the ${tier.toLowerCase()} and choose 'Pay with points'`,
      "Points debit at the portal rate; the balance goes to your card",
    ],
  };
}

// ---------------------------------------------------------------------------
// Planners
// ---------------------------------------------------------------------------

function travelAwards(programId: string, pv: number, kind: RewardKind): RedemptionOption[] {
  const program = getProgram(programId);
  if (!program) return [];
  const ch = CHANNELS[programId] ?? genericChannel(program.issuer);
  const tiers = kind === "miles"
    ? AWARD_TIERS.filter((t) => t.id !== "hotel-night")
    : AWARD_TIERS;
  const out: RedemptionOption[] = tiers.map((tier) => {
    const pointsRequired = Math.ceil(tier.value / pv);
    const example = ch.examples[tier.id] ?? ch.fallbackExample;
    return {
      programId,
      title: tier.title,
      example: `${example} — via ${ch.portal}`,
      category: tier.category,
      emoji: tier.emoji,
      pointsRequired,
      estValue: Math.round(pointsRequired * pv),
      whereToClaim: ch.portal,
      claimSteps: ch.steps(tier.title),
      caveat: ch.caveat,
    };
  });
  return out;
}

function voucherAwards(programId: string, pv: number): RedemptionOption[] {
  const program = getProgram(programId);
  if (!program) return [];
  const ch = CHANNELS[programId] ?? genericChannel(program.issuer);
  const venueByProgram: Record<string, { label: string; merchantId: string; steps: (v: number) => string[] }> = {
    "amex-mr": {
      label: "Amazon Pay voucher",
      merchantId: "amazon",
      steps: (v) => [
        "Log in at americanexpress.com/en-in → Offers → Membership Rewards",
        `Pick the Amazon Pay ₹${v.toLocaleString("en-IN")} voucher and confirm with MR points`,
        "The voucher code arrives in your registered email within minutes",
      ],
    },
    "hdfc-reward-points": {
      label: "SmartBuy voucher",
      merchantId: "amazon",
      steps: (v) => [
        "Log in to SmartBuy (offers.smartbuy.hdfcbank.com) with your HDFC card",
        `Choose a partner voucher worth ₹${v.toLocaleString("en-IN")} and pay with Reward Points`,
        "The code is issued instantly on-screen and by email",
      ],
    },
    "axis-edge-miles": {
      label: "EDGE REWARDZ voucher",
      merchantId: "flipkart",
      steps: (v) => [
        "Log in to Axis Internet Banking → EDGE REWARDZ → Vouchers",
        `Redeem EDGE Miles for the ₹${v.toLocaleString("en-IN")} voucher`,
        "The voucher code is issued instantly on-screen",
      ],
    },
    "tata-neu": {
      label: "BigBasket voucher",
      merchantId: "bigbasket",
      steps: (v) => [
        "Open the Tata Neu app → NeuCoins section",
        `Choose the BigBasket ₹${v.toLocaleString("en-IN")} voucher — NeuCoins debit 1:1`,
        "The voucher credits instantly and applies at BigBasket checkout",
      ],
    },
  };
  const venue = venueByProgram[programId];
  if (!venue) return [];
  const merchant = getMerchant(venue.merchantId);
  return VOUCHER_FACES.map((face) => ({
    programId,
    title: `${venue.label} ₹${face.toLocaleString("en-IN")}`,
    example: `${merchant?.name ?? venue.label} instant voucher — usable on anything in the cart`,
    category: "voucher" as const,
    emoji: "🎁",
    pointsRequired: Math.ceil(face / pv),
    estValue: face,
    whereToClaim: ch.portal.replace(" → Travel", " → Vouchers"),
    claimSteps: venue.steps(face),
  }));
}

function statementOption(programId: string, points: number): RedemptionOption {
  return {
    programId,
    title: "Statement credit",
    example: `Your ₹${points.toLocaleString("en-IN")} cashback — spend it anywhere`,
    category: "statement",
    emoji: "🧾",
    pointsRequired: 0,
    estValue: points,
    whereToClaim: "Automatic — no action needed",
    claimSteps: [
      "Nothing to claim: cashback auto-credits to your card statement quarterly (₹1 = ₹1)",
    ],
  };
}

/**
 * The full award ladder for a balance: travel awards + voucher ladder ranked
 * by rupee value (all convert at the program's verified per-point rate, so
 * biggest-value-first is the best-utilization order). Cashback programs get
 * only the honest statement credit.
 */
export function redemptionOptionsForBalance(
  programId: string,
  points: number,
): RedemptionOption[] {
  const program = getProgram(programId);
  if (!program) return [];

  if (program.kind === "cashback") {
    return [statementOption(programId, points)];
  }

  const pv = program.demoPointValue;
  if (!pv) return [];

  return [
    ...travelAwards(programId, pv, program.kind),
    ...voucherAwards(programId, pv),
  ].sort((a, b) => b.estValue - a.estValue || a.pointsRequired - b.pointsRequired);
}

export interface RankedRedemptions {
  affordable: RedemptionOption[];
  nearlyThere: { option: RedemptionOption; pointsGap: number }[];
}

/**
 * Ranked "what your points can get": affordable awards first (biggest value —
 * they all convert at the same verified rate), then the closest unaffordable
 * awards with the exact points gap.
 */
export function rankedRedemptions(
  programId: string,
  points: number,
): RankedRedemptions {
  const options = redemptionOptionsForBalance(programId, points);
  const affordable = options.filter((o) => points >= o.pointsRequired);
  const nearlyThere = options
    .filter((o) => o.pointsRequired > points)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)
    .slice(0, 2)
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
