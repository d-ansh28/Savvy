/**
 * Plan configuration — single source of truth for pricing & limits.
 *
 * AI optimization runs are limited PER PLAN, tracked server-side per month.
 * Payment links are Razorpay Payment Links; the app never holds secrets.
 */

export interface Plan {
  id: "free" | "starter" | "pro" | "studio";
  name: string;
  priceMonthly: number;
  block: string;
  highlight?: boolean;
  /** AI optimization runs per month (server-enforced). */
  runsPerMonth: number;
  features: string[];
  paymentLink: string | null;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    block: "bg-secondary",
    runsPerMonth: 3,
    features: [
      "3 AI optimizations / month",
      "Wallet & card management (200+ card catalog)",
      "Offers browser with expiry tracking",
      "Expiring-reward alerts",
      "Rewards vault snapshots",
    ],
    paymentLink: null,
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 199,
    block: "bg-block-blue",
    runsPerMonth: 30,
    features: [
      "30 AI optimizations / month",
      "Everything in Free",
      "Unlimited wallet & cards",
      "Purchase optimizer with full math breakdown",
      "AI assistant (grounded, wallet-aware)",
      "Rewards vault with redemption scenarios",
      "Basic wallet insights",
    ],
    paymentLink: "https://rzp.io/rzp/MpuNbgY",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 499,
    block: "bg-block-lime",
    highlight: true,
    runsPerMonth: 100,
    features: [
      "100 AI optimizations / month",
      "Everything in Starter",
      "Advanced wallet analytics & fee-drag analysis",
      "What-if simulations (add card, shift spend)",
      "Reward optimization suggestions",
      "Expiry insights with value-at-risk math",
      "Card-fit discovery across 200+ card catalog",
      "Priority AI explanations",
    ],
    paymentLink: "https://rzp.io/rzp/T5rPvDQF",
  },
  {
    id: "studio",
    name: "Studio",
    priceMonthly: 999,
    block: "bg-block-yellow",
    runsPerMonth: 300,
    features: [
      "300 AI optimizations / month",
      "Everything in Pro",
      "Advanced travel reward analysis",
      "Advanced redemption scenarios across programs",
      "Multiple reward ecosystems",
      "Advanced optimization tools & assumptions engine",
      "Card upgrade tracking across the catalog",
      "Premium support",
    ],
    paymentLink: "https://rzp.io/rzp/crthiD01",
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** Server-side limit lookup. Mirrors the plans above. */
export function runsLimitForPlan(planId: string): number {
  return getPlan(planId)?.runsPerMonth ?? 3;
}

export const FREE_RUNS_LIMIT_DISPLAY = 3;
