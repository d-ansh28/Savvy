/**
 * Plan configuration — single source of truth for pricing.
 * Payment links come from env (Razorpay payment links); the app never
 * hardcodes secrets. In this Freebuff environment, env vars are provided
 * via the platform; missing links fall back to null and the UI shows a
 * "payment link not configured" note instead of a broken button.
 */

export interface Plan {
  id: "starter" | "pro" | "max";
  name: string;
  priceMonthly: number;
  block: string;
  highlight?: boolean;
  features: string[];
  paymentLink: string | null;
}

function envLink(key: string): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const raw = env[key] ?? env[`VITE_${key}`];
  return raw && raw.startsWith("http") ? raw : null;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 200,
    block: "bg-block-blue",
    features: [
      "Unlimited purchase optimization",
      "Wallet management",
      "Basic reward insights",
      "AI assistant",
    ],
    paymentLink: envLink("RAZORPAY_STARTER_PAYMENT_LINK"),
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 499,
    block: "bg-block-lime",
    highlight: true,
    features: [
      "Everything in Starter",
      "Advanced wallet analytics",
      "What-if simulations",
      "Reward optimization",
      "Expiry insights",
      "Advanced AI analysis",
    ],
    paymentLink: envLink("RAZORPAY_PRO_PAYMENT_LINK"),
  },
  {
    id: "max",
    name: "Max",
    priceMonthly: 999,
    block: "bg-block-yellow",
    features: [
      "Everything in Pro",
      "Advanced travel reward analysis",
      "Advanced redemption scenarios",
      "Multiple reward ecosystems",
      "Advanced optimization tools",
    ],
    paymentLink: envLink("RAZORPAY_MAX_PAYMENT_LINK"),
  },
];

export const FREE_RUNS_LIMIT_DISPLAY = 3;
