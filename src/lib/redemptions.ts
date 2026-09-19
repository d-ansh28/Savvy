import { getProgram, type RewardKind } from "./catalog";

/**
 * DETERMINISTIC REDEMPTION CATALOG
 * --------------------------------
 * Concrete things a tracked reward balance can actually get, per program,
 * with a fixed demo points-required and an estimated rupee value derived
 * ONLY from the program's verified demoPointValue (estValue =
 * pointsRequired × demoPointValue). No invented per-point prices, no live
 * partner charts. Each entry answers: what, how many points, where to claim,
 * and HOW to claim — step by step.
 */

export type RedemptionCategory = "flight" | "hotel" | "trip" | "voucher" | "statement";

export interface RedemptionOption {
  /** Program this option belongs to (DEMO_PROGRAMS.id). */
  programId: string;
  /** What you actually get, e.g. "Domestic economy flight". */
  title: string;
  /** Specific demo example so the advice feels real, e.g. "e.g. Delhi → Goa (INDIGO)". */
  example: string;
  category: RedemptionCategory;
  emoji: string;
  /** Points/miles/coins needed from this program for the reward. */
  pointsRequired: number;
  /** Deterministic est. value: pointsRequired × program.demoPointValue. */
  estValue: number;
  /** Where the redemption physically happens (portal/app). */
  whereToClaim: string;
  /** Ordered, actionable claim steps. */
  claimSteps: string[];
  /** Extra conditions (blackout dates, caps, availability). */
  caveat?: string;
}

/** Points threshold where each option class becomes realistically bookable (demo math). */
const FLIGHT_MIN = 12_000;
const HOTEL_MIN = 8_000;
const TRIP_MIN = 35_000;

function makeFlight(
  programId: string,
  pv: number,
  title: string,
  example: string,
  where: string,
  steps: string[],
  caveat?: string,
): RedemptionOption {
  return {
    programId,
    title,
    example,
    category: "flight",
    emoji: "✈️",
    pointsRequired: FLIGHT_MIN,
    estValue: Math.round(FLIGHT_MIN * pv),
    whereToClaim: where,
    claimSteps: steps,
    caveat,
  };
}

function makeHotel(
  programId: string,
  pv: number,
  title: string,
  example: string,
  where: string,
  steps: string[],
  caveat?: string,
): RedemptionOption {
  return {
    programId,
    title,
    example,
    category: "hotel",
    emoji: "🏨",
    pointsRequired: HOTEL_MIN,
    estValue: Math.round(HOTEL_MIN * pv),
    whereToClaim: where,
    claimSteps: steps,
    caveat,
  };
}

function makeTrip(
  programId: string,
  pv: number,
  title: string,
  example: string,
  where: string,
  steps: string[],
  caveat?: string,
): RedemptionOption {
  return {
    programId,
    title,
    example,
    category: "trip",
    emoji: "🏝️",
    pointsRequired: TRIP_MIN,
    estValue: Math.round(TRIP_MIN * pv),
    whereToClaim: where,
    claimSteps: steps,
    caveat,
  };
}

function makeVoucher(
  programId: string,
  pv: number,
  value: number,
  merchant: string,
  where: string,
  steps: string[],
  caveat?: string,
): RedemptionOption {
  return {
    programId,
    title: `${merchant} voucher`,
    example: `${merchant} instant voucher — usable on anything in cart`,
    category: "voucher",
    emoji: "🎁",
    pointsRequired: Math.ceil(value / pv),
    estValue: value,
    whereToClaim: where,
    claimSteps: steps,
    caveat,
  };
}

function makeStatement(programId: string, pv: number, where: string, steps: string[]): RedemptionOption {
  return {
    programId,
    title: "Statement credit",
    example: "Credit lands on your card account — spend anywhere",
    category: "statement",
    emoji: "🧾",
    pointsRequired: 100,
    estValue: Math.round(100 * pv),
    whereToClaim: where,
    claimSteps: steps,
  };
}

/**
 * All concrete redemption options for a program, computed deterministically
 * from its demoPointValue. Cashback programs only get a statement credit.
 * Programs without a per-point value return [] — Savvy never invents prices.
 */
export function redemptionOptionsForProgram(programId: string): RedemptionOption[] {
  const program = getProgram(programId);
  if (!program) return [];
  if (program.kind === "cashback") {
    return [
      makeStatement(
        programId,
        1,
        "HDFC card portal → Cashback section",
        [
          "Nothing to do — cashback auto-credits to your statement every quarter",
          "Check 'Cashback' in the HDFC MyCards app to confirm the credit",
        ],
      ),
    ];
  }
  const pv = program.demoPointValue;
  if (!pv) return [];

  switch (programId) {
    case "amex-mr": {
      return [
        makeVoucher(
          "amex-mr",
          pv,
          2_000,
          "Amazon Pay",
          "Amex India offers page → Membership Rewards → Vouchers",
          [
            "Log in at americanexpress.com/en-in → 'Offers' → 'Membership Rewards'",
            "Pick Amazon Pay ₹2,000 voucher → confirm with your MR points",
            "Voucher code lands in your registered email within minutes",
          ],
        ),
        makeHotel(
          "amex-mr",
          pv,
          "Hotel stay via Amex travel",
          "e.g. 1 night at a 4★ city hotel (demo value)",
          "Amex Travel portal (travel.americanexpress.co.in)",
          [
            "Open Amex Travel India from your MR dashboard",
            "Search hotel + dates, filter 'Pay with Points'",
            "Redeem points at checkout — balance pays the rest",
          ],
        ),
        makeFlight(
          "amex-mr",
          pv,
          "Flight via Amex travel (points+cash)",
          "e.g. Delhi → Mumbai economy on partner airline",
          "Amex Travel portal — 'Pay with Points' at checkout",
          [
            "Book the flight in Amex Travel like a normal booking",
            "At payment, slide 'Pay with Points' to cover part of the fare",
            "Points debit instantly; remaining fare goes to your Amex card",
          ],
          "Points+cash redemptions usually value MR lower than vouchers — the portal shows the exact rate at checkout.",
        ),
        makeTrip(
          "amex-mr",
          pv,
          "Weekend trip package",
          "e.g. 2N Goa: flight + hotel combo via Amex Travel",
          "Amex Travel portal — Flights + Hotels bundle",
          [
            "Book flight and hotel in one Amex Travel itinerary",
            "Pay with Points at checkout for the full or partial amount",
            "e-coupons/travel credits post to your account instantly",
          ],
        ),
      ];
    }
    case "axis-edge-miles": {
      return [
        makeFlight(
          "axis-edge-miles",
          pv,
          "Domestic economy flight",
          "e.g. Bengaluru → Delhi on partner airline",
          "Axis EDGE Travel portal (GrabAxis portal) — or transfer to partner airline",
          [
            "Log in to Axis Internet Banking → EDGE REWARDZ → 'Travel'",
            "Search flights, pick one, choose 'Redeem EDGE Miles' at payment",
            "Miles debit instantly; ticket emails directly from the airline",
          ],
          "Airline transfer ratios vary — verify the live chart before transferring; the travel portal rate is the deterministic baseline.",
        ),
        makeHotel(
          "axis-edge-miles",
          pv,
          "Hotel night via travel portal",
          "e.g. 1 night in a business hotel (demo value)",
          "EDGE REWARDZ → Travel → Hotels",
          [
            "Open EDGE REWARDZ → Travel → Hotels",
            "Search city + dates, filter redeemable properties",
            "Pay fully with EDGE Miles at checkout",
          ],
        ),
        makeTrip(
          "axis-edge-miles",
          pv,
          "Full weekend trip",
          "e.g. 2N Goa: flights + 2 hotel nights combo",
          "EDGE REWARDZ Travel — flight + hotel bundle",
          [
            "Build the bundle in the EDGE REWARDZ travel portal",
            "Redeem miles against the total; pay the gap if any",
            "E-tickets and hotel vouchers arrive by email",
          ],
        ),
      ];
    }
    case "hdfc-reward-points": {
      return [
        makeVoucher(
          "hdfc-reward-points",
          pv,
          2_500,
          "SmartBuy partner",
          "HDFC SmartBuy → Redeem → Vouchers",
          [
            "Log in to SmartBuy (offers.smartbuy.hdfcbank.com) with your card",
            "Choose a partner voucher, pay with Reward Points",
            "Voucher code is issued instantly on-screen + email",
          ],
          "SmartBuy redemption caps apply — check the cap for your card variant before redeeming.",
        ),
        makeFlight(
          "hdfc-reward-points",
          pv,
          "Flight via SmartBuy travel",
          "e.g. Mumbai → Goa economy",
          "HDFC SmartBuy → Travel (flights)",
          [
            "Open SmartBuy → Travel → Flights",
            "Book the ticket, select 'Redeem points' at payment",
            "Points debit at the SmartBuy rate; fare balance goes to your card",
          ],
          "SmartBuy flight redemption caps apply monthly — the portal shows your remaining cap.",
        ),
        makeHotel(
          "hdfc-reward-points",
          pv,
          "Hotel via SmartBuy travel",
          "e.g. 1 night city hotel (demo value)",
          "HDFC SmartBuy → Travel (hotels)",
          [
            "SmartBuy → Travel → Hotels, pick dates",
            "Choose 'Pay with points' — points debit instantly",
            "Booking confirmation comes from the hotel partner",
          ],
        ),
      ];
    }
    case "scapia-coins": {
      return [
        makeFlight(
          "scapia-coins",
          pv,
          "Flight discount in Scapia app",
          "e.g. ₹1,200 off any domestic booking",
          "Scapia app → Travel → Book flight → apply Coins",
          [
            "Open the Scapia app → Travel section",
            "Search and pick your flight, then apply Coins at payment",
            "Coins slash the fare instantly; pay the rest in-app",
          ],
          "Coins redeem ONLY inside Scapia's travel section — no vouchers, no cash-out.",
        ),
        makeHotel(
          "scapia-coins",
          pv,
          "Hotel discount in Scapia app",
          "e.g. ₹800 off a domestic stay",
          "Scapia app → Travel → Hotels",
          [
            "Scapia app → Travel → Hotels, pick your stay",
            "Apply Coins on the payment screen",
            "Discount reflects before you confirm the booking",
          ],
        ),
      ];
    }
    case "tata-neu": {
      return [
        makeVoucher(
          "tata-neu",
          pv,
          1_000,
          "BigBasket",
          "Tata Neu app / neucoins pass → BigBasket",
          [
            "Open Tata Neu app → NeuCoins section",
            "Choose BigBasket, pick the ₹1,000 voucher",
            "Redeem NeuCoins 1:1 — voucher credits instantly",
          ],
        ),
        makeVoucher(
          "tata-neu",
          pv,
          2_000,
          "Croma",
          "Tata Neu app → Vouchers → Croma",
          [
            "Tata Neu app → Redeem → Croma voucher",
            "Pay with NeuCoins at the 1:1 rate",
            "Use the code at croma.com or in-store checkout",
          ],
        ),
        makeHotel(
          "tata-neu",
          pv,
          "Air India / hotel stay via Tata Neu",
          "e.g. Taj holiday night or Air India booking credit",
          "Tata Neu app → Travel (Air India / Taj hotels)",
          [
            "Book Air India flight or Taj hotel inside Tata Neu",
            "Toggle 'Use NeuCoins' at checkout — 1 NeuCoin = ₹1",
            "NeuCoins debit instantly against the booking",
          ],
        ),
        makeTrip(
          "tata-neu",
          pv,
          "Tata ecosystem weekend",
          "e.g. flights + Taj hotel within one NeuCoins pot",
          "Tata Neu app → Travel + Hotels combined",
          [
            "Plan the itinerary across Air India + Taj in the Neu app",
            "Pay each leg with NeuCoins — they work 1:1 everywhere in the ecosystem",
            "Unused NeuCoins stay in your pot for next time",
          ],
        ),
      ];
    }
    default: {
      // Generic fallback for future programs with a demoPointValue.
      return [
        makeVoucher(
          programId,
          pv,
          Math.max(500, Math.round(5_000 * pv)),
          "Rewards portal partner",
          `${program.issuer} rewards portal → Vouchers`,
          [
            `Log in to the ${program.issuer} rewards portal`,
            "Pick a partner voucher, pay with your points",
            "Voucher code is issued instantly on-screen + email",
          ],
        ),
        makeFlight(
          programId,
          pv,
          "Flight via issuer travel portal",
          "e.g. domestic economy sector",
          `${program.issuer} rewards portal → Travel`,
          [
            `Open the ${program.issuer} travel portal`,
            "Book the flight, choose 'Redeem points' at payment",
            "Points debit at the portal rate; balance goes to your card",
          ],
        ),
        makeHotel(
          programId,
          pv,
          "Hotel night via issuer portal",
          "e.g. 1 night domestic stay",
          `${program.issuer} rewards portal → Hotels`,
          [
            `Open the ${program.issuer} hotel booking section`,
            "Pick dates, filter redeemable hotels",
            "Pay with points at checkout",
          ],
        ),
      ];
    }
  }
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
 * Ranked "what your points can get RIGHT NOW" list: affordable options first
 * (best value-to-points first), then the closest unaffordable options with the
 * gap — deterministic, from the catalog above.
 */
export function rankedRedemptions(
  programId: string,
  points: number,
): {
  affordable: RedemptionOption[];
  nearlyThere: { option: RedemptionOption; pointsGap: number }[];
} {
  const options = redemptionOptionsForProgram(programId);
  const affordable = options
    .filter((o) => points >= o.pointsRequired)
    .sort(
      (a, b) =>
        b.estValue / b.pointsRequired - a.estValue / a.pointsRequired ||
        b.estValue - a.estValue,
    );
  const nearlyThere = options
    .filter((o) => points < o.pointsRequired)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)
    .slice(0, 3)
    .map((o) => ({ option: o, pointsGap: o.pointsRequired - points }));
  return { affordable, nearlyThere };
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
