/**
 * Demo catalog data for Savvy.
 *
 * Cards, reward rules, offers, merchants and programs are DATA, not JSX.
 * This keeps the UI data-driven and the calculation engine separate from
 * presentation. Real-world issuers/banks are referenced by name for realism,
 * but every rule here is DEMO data — rates, caps and offers are illustrative,
 * not verified live promotions. The UI labels them accordingly.
 */

export type Network = "visa" | "mastercard" | "amex";
export type RewardKind = "cashback" | "points" | "miles";
export type SourceStatus = "verified" | "estimated" | "user_provided" | "needs_verification" | "expired";

export interface Provenance {
  source: string;
  last_verified: string; // ISO date
}

/** A deterministic reward rule. All evaluation happens in engine.ts. */
export interface RewardRule {
  id: string;
  kind: RewardKind;
  /** Percentage cashback, e.g. 0.05 = 5%. */
  percent?: number;
  /** Points/miles earned per INR 100 spent. */
  pointsPer100?: number;
  /** Value of one point in INR when redeemed for vouchers/travel (estimate). */
  pointValue?: number;
  category?: Category; // undefined = base rate on all eligible spends
  minAmount?: number; // minimum transaction to qualify
  maxAmount?: number; // transactions above this do NOT qualify
  /** Monthly cashback cap in INR for this rule. */
  monthlyCap?: number;
  /** One-time/transaction cap on benefit in INR. */
  transactionCap?: number;
  excludedCategories?: Category[];
  onlineOnly?: boolean;
  channelNote?: string;
  status: SourceStatus;
  note?: string;
  provenance: Provenance;
}

export type Category =
  | "groceries"
  | "ecommerce"
  | "dining"
  | "travel"
  | "flights"
  | "hotels"
  | "fuel"
  | "utilities"
  | "subscriptions"
  | "shopping"
  | "education"
  | "entertainment"
  | "other";

export interface DemoCard {
  slug: string;
  issuer: string;
  name: string;
  network: Network;
  annualFee: number;
  joiningFee: number;
  renewalFeeWaiver?: string;
  rewardType: RewardKind;
  art: {
    from: string; // gradient start (decorative artwork only)
    to: string;
    accent: string;
    ink: string;
  };
  highlight: string;
  categories: Category[];
  rules: RewardRule[];
  status: SourceStatus;
  provenance: Provenance;
}

export interface Merchant {
  id: string;
  name: string;
  category: Category;
  aliases: string[];
}

export interface RewardProgram {
  id: string;
  name: string;
  issuer: string;
  kind: RewardKind;
  /** Typical value per point when redeemed smartly (DEMO estimate). */
  demoPointValue?: number;
  redemptionNote: string;
  status: SourceStatus;
  provenance: Provenance;
}

export interface Offer {
  id: string;
  merchantId: string;
  title: string;
  kind: "discount" | "cashback" | "coupon";
  /** Percent discount/cashback. */
  percent?: number;
  /** Flat amount off. */
  flat?: number;
  minAmount: number;
  maxBenefit: number;
  startsAt: string; // ISO date
  endsAt: string; // ISO date
  /** Only stackable with these offer ids (undefined = stacks with everything). */
  stacksWith?: string[];
  source: string;
  lastVerified: string;
  status: SourceStatus;
}

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "groceries", label: "Groceries", emoji: "🛒" },
  { id: "ecommerce", label: "Amazon / E-commerce", emoji: "📦" },
  { id: "dining", label: "Dining", emoji: "🍽️" },
  { id: "travel", label: "Travel", emoji: "🧳" },
  { id: "flights", label: "Flights", emoji: "✈️" },
  { id: "hotels", label: "Hotels", emoji: "🏨" },
  { id: "fuel", label: "Fuel", emoji: "⛽" },
  { id: "utilities", label: "Utilities", emoji: "💡" },
  { id: "subscriptions", label: "Subscriptions", emoji: "🔁" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "education", label: "Education", emoji: "🎓" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "other", label: "Other", emoji: "🧾" },
];

export function categoryLabel(id: Category): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryEmoji(id: Category): string {
  return CATEGORIES.find((c) => c.id === id)?.emoji ?? "🧾";
}

export const DEMO_CARDS: DemoCard[] = [
  {
    slug: "hdfc-millennia",
    issuer: "HDFC Bank",
    name: "Millennia",
    network: "visa",
    annualFee: 1000,
    joiningFee: 1000,
    renewalFeeWaiver: "Fee waived on ₹1L annual spend (demo)",
    rewardType: "cashback",
    art: { from: "#2f2a21", to: "#57503f", accent: "#c8f04e", ink: "#faf8f2" },
    highlight: "5% cashback on Amazon, Flipkart & more",
    categories: ["ecommerce", "shopping", "dining", "entertainment"],
    rules: [
      {
        id: "mil-ecomm",
        kind: "cashback",
        percent: 0.05,
        category: "ecommerce",
        monthlyCap: 1000,
        status: "estimated",
        note: "5% on Amazon & select partners, capped ₹1,000/month",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "mil-shopping",
        kind: "cashback",
        percent: 0.05,
        category: "shopping",
        monthlyCap: 1000,
        status: "estimated",
        note: "5% on select shopping merchants, shared cap with e-commerce",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "mil-base",
        kind: "cashback",
        percent: 0.01,
        minAmount: 400,
        status: "estimated",
        note: "1% on everything else (min spend ₹400)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    slug: "sbi-cashback",
    issuer: "SBI Card",
    name: "Cashback Card",
    network: "mastercard",
    annualFee: 999,
    joiningFee: 999,
    renewalFeeWaiver: "None (demo)",
    rewardType: "cashback",
    art: { from: "#1d2f6f", to: "#3d55a5", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "Flat 5% online spend cashback",
    categories: ["ecommerce", "shopping", "subscriptions"],
    rules: [
      {
        id: "sbi-online",
        kind: "cashback",
        percent: 0.05,
        minAmount: 500,
        monthlyCap: 5000,
        onlineOnly: true,
        status: "estimated",
        note: "5% on all online spends (min ₹500), capped ₹5,000/month",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "sbi-base",
        kind: "cashback",
        percent: 0.01,
        status: "estimated",
        note: "1% on offline spends",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    slug: "axis-flipkart",
    issuer: "Axis Bank",
    name: "Flipkart Axis",
    network: "visa",
    annualFee: 500,
    joiningFee: 500,
    rewardType: "cashback",
    art: { from: "#2874f0", to: "#7db4ff", accent: "#ffe500", ink: "#17140e" },
    highlight: "5% on Flipkart, 4% on partner merchants",
    categories: ["ecommerce", "shopping", "travel"],
    rules: [
      {
        id: "axisfk-fk",
        kind: "cashback",
        percent: 0.05,
        monthlyCap: 4000,
        status: "estimated",
        note: "5% cashback on Flipkart (cap ₹4,000/month)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "axisfk-partner",
        kind: "cashback",
        percent: 0.04,
        category: "shopping",
        monthlyCap: 4000,
        status: "estimated",
        note: "4% on preferred partners (shared monthly cap)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "axisfk-base",
        kind: "cashback",
        percent: 0.01,
        status: "estimated",
        note: "1% on everything else",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    slug: "amex-mr",
    issuer: "American Express",
    name: "Membership Rewards Gold",
    network: "amex",
    annualFee: 4500,
    joiningFee: 4500,
    rewardType: "points",
    art: { from: "#0f6f5c", to: "#37a08c", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "High-rate Membership Rewards points",
    categories: ["dining", "flights", "hotels", "shopping"],
    rules: [
      {
        id: "amex-dining",
        kind: "points",
        pointsPer100: 200,
        category: "dining",
        pointValue: 0.4,
        monthlyCap: 5000,
        status: "estimated",
        note: "10x MR points on dining (cap 5,000 bonus pts/month)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "amex-base",
        kind: "points",
        pointsPer100: 100,
        pointValue: 0.4,
        status: "estimated",
        note: "2 MR points per ₹100 on all other spends",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    slug: "axis-atlas",
    issuer: "Axis Bank",
    name: "Atlas",
    network: "visa",
    annualFee: 5000,
    joiningFee: 5000,
    rewardType: "miles",
    art: { from: "#33254e", to: "#5b4a86", accent: "#cdb4ff", ink: "#faf8f2" },
    highlight: "EDGE Miles for flights & hotels",
    categories: ["travel", "flights", "hotels"],
    rules: [
      {
        id: "atlas-travel",
        kind: "miles",
        pointsPer100: 10,
        category: "travel",
        pointValue: 1.0,
        status: "estimated",
        note: "10 EDGE Miles per ₹100 on travel spends",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "atlas-base",
        kind: "miles",
        pointsPer100: 5,
        pointValue: 1.0,
        status: "estimated",
        note: "5 EDGE Miles per ₹100 on other spends",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    slug: "icici-amazonpay",
    issuer: "ICICI Bank",
    name: "Amazon Pay ICICI",
    network: "visa",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "cashback",
    art: { from: "#232f3e", to: "#48576d", accent: "#ff9900", ink: "#faf8f2" },
    highlight: "Lifetime-free, 5% for Prime members",
    categories: ["ecommerce", "shopping", "utilities"],
    rules: [
      {
        id: "icici-amazon",
        kind: "cashback",
        percent: 0.05,
        monthlyCap: 2500,
        status: "estimated",
        note: "5% for Prime members on Amazon.in (demo assumes Prime)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "icici-base",
        kind: "cashback",
        percent: 0.02,
        status: "estimated",
        note: "2% on partner merchants, 1% elsewhere (simplified)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    slug: "idfc-first-select",
    issuer: "IDFC First Bank",
    name: "FIRST Select",
    network: "mastercard",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "points",
    art: { from: "#5e1914", to: "#9c4038", accent: "#ffb27a", ink: "#faf8f2" },
    highlight: "10x points on spends above ₹20,000/month",
    categories: ["dining", "groceries", "entertainment"],
    rules: [
      {
        id: "idfc-boosted",
        kind: "points",
        pointsPer100: 100,
        pointValue: 0.25,
        minAmount: 20000,
        status: "estimated",
        note: "10x points on monthly spends above ₹20k (up to ₹30k)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "idfc-base",
        kind: "points",
        pointsPer100: 30,
        pointValue: 0.25,
        status: "estimated",
        note: "3x points otherwise",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    slug: "hdfc-diners-black",
    issuer: "HDFC Bank",
    name: "Diners Club Black",
    network: "mastercard",
    annualFee: 10000,
    joiningFee: 10000,
    rewardType: "points",
    art: { from: "#14110b", to: "#3a3428", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "Premium: 5x rewards & lounge access",
    categories: ["flights", "hotels", "dining", "shopping"],
    rules: [
      {
        id: "dinb-travel",
        kind: "points",
        pointsPer100: 165,
        pointValue: 0.5,
        category: "travel",
        monthlyCap: 15000,
        status: "estimated",
        note: "5x Reward Points on travel (capped monthly)",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
      {
        id: "dinb-base",
        kind: "points",
        pointsPer100: 33,
        pointValue: 0.5,
        status: "estimated",
        note: "1x base Reward Points on everything else",
        provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
      },
    ],
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
];

export const DEMO_MERCHANTS: Merchant[] = [
  { id: "amazon", name: "Amazon", category: "ecommerce", aliases: ["amazon.in", "amzn"] },
  { id: "flipkart", name: "Flipkart", category: "ecommerce", aliases: ["flipkart.com"] },
  { id: "swiggy", name: "Swiggy", category: "dining", aliases: ["swiggy.in"] },
  { id: "zomato", name: "Zomato", category: "dining", aliases: ["zomato.com", "district"] },
  { id: "makemytrip", name: "MakeMyTrip", category: "travel", aliases: ["makemytrip.com", "mmt"] },
  { id: "uber", name: "Uber", category: "travel", aliases: ["uber.com"] },
  { id: "bookmyshow", name: "BookMyShow", category: "entertainment", aliases: ["bookmyshow.com", "bms"] },
  { id: "bigbasket", name: "BigBasket", category: "groceries", aliases: ["bigbasket.com"] },
  { id: "zepto", name: "Zepto", category: "groceries", aliases: ["zepto.in"] },
  { id: "reliance-digital", name: "Reliance Digital", category: "shopping", aliases: ["reliancedigital.in"] },
  { id: "croma", name: "Croma", category: "shopping", aliases: ["croma.com"] },
  { id: "indigo", name: "IndiGo Airlines", category: "flights", aliases: ["goindigo.in"] },
  { id: "air-india", name: "Air India", category: "flights", aliases: ["airindia.com"] },
  { id: "taj", name: "Taj Hotels", category: "hotels", aliases: ["tajhotels.com"] },
  { id: "iocl", name: "Indian Oil", category: "fuel", aliases: ["petrol pump", "fuel station"] },
];

/** Maps merchant ids to the category used by the merchant — distinct from
 *  card categories so Swiggy dining offers can still apply to card e-commerce
 *  rules through engine-level category resolution. */
export const OFFERS: Offer[] = [
  {
    id: "amz-fest",
    merchantId: "amazon",
    title: "Amazon Fest: 5% instant discount on HDFC cards",
    kind: "discount",
    percent: 0.05,
    minAmount: 5000,
    maxBenefit: 500,
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    stacksWith: ["swiggy-supersaver"],
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-01",
    status: "estimated",
  },
  {
    id: "amz-coupon",
    merchantId: "amazon",
    title: "₹300 off coupons on ₹8,000+ carts",
    kind: "coupon",
    flat: 300,
    minAmount: 8000,
    maxBenefit: 300,
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-01",
    status: "estimated",
  },
  {
    id: "fk-bigdays",
    merchantId: "flipkart",
    title: "Big Days: 10% instant discount on Axis cards",
    kind: "discount",
    percent: 0.1,
    minAmount: 6000,
    maxBenefit: 1500,
    startsAt: "2026-09-20",
    endsAt: "2026-09-27",
    stacksWith: [],
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-05",
    status: "estimated",
  },
  {
    id: "swiggy-supersaver",
    merchantId: "swiggy",
    title: "Supersaver: flat ₹125 off above ₹599",
    kind: "coupon",
    flat: 125,
    minAmount: 599,
    maxBenefit: 125,
    startsAt: "2026-09-01",
    endsAt: "2026-10-15",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-10",
    status: "estimated",
  },
  {
    id: "zomato-gold",
    merchantId: "zomato",
    title: "Gold member: 20% off up to ₹200 (stacks with bank offers)",
    kind: "discount",
    percent: 0.2,
    minAmount: 400,
    maxBenefit: 200,
    startsAt: "2026-08-15",
    endsAt: "2026-11-15",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-10",
    status: "estimated",
  },
  {
    id: "mmt-sale",
    merchantId: "makemytrip",
    title: "MMT Sale: up to ₹1,800 off domestic hotels (min ₹12,000)",
    kind: "discount",
    percent: 0.15,
    minAmount: 12000,
    maxBenefit: 1800,
    startsAt: "2026-09-18",
    endsAt: "2026-09-24",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-12",
    status: "estimated",
  },
  {
    id: "mmt-flight",
    merchantId: "makemytrip",
    title: "Flight deal: 12% off up to ₹1,200 with selected cards",
    kind: "discount",
    percent: 0.12,
    minAmount: 7000,
    maxBenefit: 1200,
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-12",
    status: "estimated",
  },
  {
    id: "uber-rides",
    merchantId: "uber",
    title: "Ride pass: 10% cashback up to ₹75 per ride",
    kind: "cashback",
    percent: 0.1,
    minAmount: 150,
    maxBenefit: 75,
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-08",
    status: "estimated",
  },
  {
    id: "bms-tuesday",
    merchantId: "bookmyshow",
    title: "Movie night: 50% off second ticket, up to ₹150",
    kind: "discount",
    percent: 0.25,
    minAmount: 400,
    maxBenefit: 150,
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-09",
    status: "estimated",
  },
  {
    id: "fuel-iocl",
    merchantId: "iocl",
    title: "Fuel surcharge waiver equivalent: 1.5% up to ₹250/month",
    kind: "cashback",
    percent: 0.015,
    minAmount: 250,
    maxBenefit: 250,
    startsAt: "2026-09-01",
    endsAt: "2026-12-31",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-02",
    status: "estimated",
  },
];

export const DEMO_PROGRAMS: RewardProgram[] = [
  {
    id: "hdfc-cashback",
    name: "HDFC Cashback Wallet",
    issuer: "HDFC Bank",
    kind: "cashback",
    redemptionNote: "Auto-credits to statement every quarter. 1 point = ₹1.",
    status: "user_provided",
    provenance: { source: "User-provided balance", last_verified: "2026-09-01" },
  },
  {
    id: "amex-mr",
    name: "Amex Membership Rewards",
    issuer: "American Express",
    kind: "points",
    demoPointValue: 0.4,
    redemptionNote:
      "Demo scenarios: vouchers at ~₹0.40/pt, statement credit at ~₹0.25/pt, 18+ partner transfers (verification needed).",
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    id: "axis-edge-miles",
    name: "Axis EDGE Miles",
    issuer: "Axis Bank",
    kind: "miles",
    demoPointValue: 1.0,
    redemptionNote:
      "Demo scenarios: EDGE Miles travel portal at ~₹1/mile; partner airline transfers at variable ratios — needs verification.",
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
  {
    id: "hdfc-reward-points",
    name: "HDFC Reward Points",
    issuer: "HDFC Bank",
    kind: "points",
    demoPointValue: 0.5,
    redemptionNote:
      "Demo scenarios: SmartBuy vouchers at ~₹0.50/pt (cap applies), catalog at lower value — needs verification.",
    status: "estimated",
    provenance: { source: "Demo catalog (illustrative)", last_verified: "2026-08-30" },
  },
];

export function getDemoCard(slug: string): DemoCard | undefined {
  return DEMO_CARDS.find((c) => c.slug === slug);
}

export function getOffer(id: string): Offer | undefined {
  return OFFERS.find((o) => o.id === id);
}

export function getMerchant(id: string): Merchant | undefined {
  return DEMO_MERCHANTS.find((m) => m.id === id);
}

export function getProgram(id: string): RewardProgram | undefined {
  return DEMO_PROGRAMS.find((p) => p.id === id);
}
