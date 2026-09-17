/**
 * Demo catalog data for Savvy.
 *
 * Cards, reward rules, offers, merchants and programs are DATA, not JSX.
 * This keeps the UI data-driven and the calculation engine separate from
 * presentation. Cards reference real, publicly-known products in the Indian
 * market for realism, but every rate/cap/fee here is DEMO data — illustrative,
 * not verified live terms. Status flags (estimated / needs_verification /
 * user_provided / expired) drive what the UI is allowed to claim.
 */

import { GENERATED_CARDS } from "./cardVariants";

export type Network = "visa" | "mastercard" | "amex" | "rupay" | "diners";
export type RewardKind = "cashback" | "points" | "miles";
export type SourceStatus =
  | "verified"
  | "estimated"
  | "user_provided"
  | "needs_verification"
  | "expired";

/** Who the card is realistically aimed at (demo eligibility). */
export type Role =
  | "any"
  | "student"
  | "employee"
  | "self_employed"
  | "business_owner";

export const ROLE_LABELS: Record<Exclude<Role, "any">, string> = {
  student: "Student",
  employee: "Salaried employee",
  self_employed: "Self-employed",
  business_owner: "Business owner",
};

export interface Eligibility {
  /** "any" = all roles including students. */
  roles: Role[];
  /** Minimum monthly income (demo). 0 = no income requirement (secured/FD). */
  minMonthlyIncome: number;
  /** FD-secured or starter card — student friendly. */
  securedOption?: boolean;
  note?: string;
}

export interface Perks {
  /** e.g. "8 domestic visits/year (milestone)" */
  domesticLounge?: string;
  intlLounge?: string;
  golf?: string;
  /** RuPay card usable on UPI apps */
  upi?: boolean;
  metal?: boolean;
  other?: string[];
}

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
  /** Value of one point in INR when redeemed smartly (estimate). */
  pointValue?: number;
  category?: Category; // undefined = base rate on all eligible spends
  minAmount?: number;
  maxAmount?: number;
  monthlyCap?: number;
  transactionCap?: number;
  excludedCategories?: Category[];
  onlineOnly?: boolean;
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
  | "telecom"
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
    from: string;
    to: string;
    accent: string;
    ink: string;
  };
  highlight: string;
  categories: Category[];
  rules: RewardRule[];
  perks?: Perks;
  eligibility: Eligibility;
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
  percent?: number;
  flat?: number;
  minAmount: number;
  maxBenefit: number;
  startsAt: string;
  endsAt: string;
  stacksWith?: string[];
  /** When set, only cards from these issuer substrings can avail (demo). */
  eligibleIssuers?: string[];
  /** When set, only cards on these networks can avail (demo). */
  eligibleNetworks?: Network[];
  /** Category fallback so unknown merchants can still match category offers. */
  merchantCategory?: Category;
  source: string;
  lastVerified: string;
  status: SourceStatus;
}

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "groceries", label: "Groceries", emoji: "🛒" },
  { id: "ecommerce", label: "Amazon / E-commerce", emoji: "📦" },
  { id: "dining", label: "Dining & Food delivery", emoji: "🍽️" },
  { id: "travel", label: "Travel", emoji: "🧳" },
  { id: "flights", label: "Flights", emoji: "✈️" },
  { id: "hotels", label: "Hotels", emoji: "🏨" },
  { id: "fuel", label: "Fuel", emoji: "⛽" },
  { id: "utilities", label: "Utilities", emoji: "💡" },
  { id: "telecom", label: "Mobile & Broadband", emoji: "📱" },
  { id: "subscriptions", label: "Subscriptions", emoji: "🔁" },
  { id: "shopping", label: "Shopping & Electronics", emoji: "🛍️" },
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

const DEMO_PROV = (date = "2026-09-15"): Provenance => ({
  source: "Demo catalog (illustrative — verify with issuer)",
  last_verified: date,
});

const CURATED_CARDS: DemoCard[] = [
  // ————— HDFC Bank —————
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
    highlight: "5% cashback on Amazon, Flipkart & 10+ partners",
    categories: ["ecommerce", "shopping", "dining", "entertainment"],
    perks: {
      domesticLounge: "8 visits/year on quarterly ₹1L spend (demo)",
      other: ["1% milestone cashback"],
    },
    eligibility: { roles: ["any"], minMonthlyIncome: 18000 },
    rules: [
      {
        id: "mil-ecomm",
        kind: "cashback",
        percent: 0.05,
        category: "ecommerce",
        monthlyCap: 1000,
        status: "estimated",
        note: "5% on Amazon & select partners, capped ₹1,000/month",
        provenance: DEMO_PROV(),
      },
      {
        id: "mil-shopping",
        kind: "cashback",
        percent: 0.05,
        category: "shopping",
        monthlyCap: 1000,
        status: "estimated",
        note: "5% on select partners, shared cap",
        provenance: DEMO_PROV(),
      },
      {
        id: "mil-base",
        kind: "cashback",
        percent: 0.01,
        minAmount: 400,
        status: "estimated",
        note: "1% on everything else (min spend ₹400)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "hdfc-regalia-gold",
    issuer: "HDFC Bank",
    name: "Regalia Gold",
    network: "visa",
    annualFee: 2500,
    joiningFee: 2500,
    rewardType: "points",
    art: { from: "#3b2f1a", to: "#8a6d3b", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "Premium travel card with milestone lounges",
    categories: ["travel", "flights", "hotels", "dining", "shopping"],
    perks: {
      domesticLounge: "12 visits/year (demo)",
      intlLounge: "Priority Pass on milestone spends (demo)",
      other: ["Complimentary MMT/Club Marriott vouchers (demo)"],
    },
    eligibility: {
      roles: ["any"],
      minMonthlyIncome: 100000,
      note: "Premium card — strong credit profile expected",
    },
    rules: [
      {
        id: "rg-travel",
        kind: "points",
        pointsPer100: 4,
        pointValue: 0.5,
        category: "travel",
        status: "estimated",
        note: "4 RPs per ₹100 on travel (demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "rg-base",
        kind: "points",
        pointsPer100: 2,
        pointValue: 0.5,
        status: "estimated",
        note: "2 RPs per ₹100 base (demo)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "hdfc-infinia-metal",
    issuer: "HDFC Bank",
    name: "Infinia (Metal)",
    network: "visa",
    annualFee: 12500,
    joiningFee: 12500,
    rewardType: "points",
    art: { from: "#101010", to: "#3d3d3d", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "Flagship metal card — 5x rewards & uncapped travel",
    categories: ["flights", "hotels", "dining", "shopping", "travel"],
    perks: {
      domesticLounge: "Unlimited (demo)",
      intlLounge: "Unlimited Priority Pass (demo)",
      golf: "Complimentary golf rounds (demo)",
      metal: true,
      other: ["Concierge", "BookMyShow buy-1-get-1 (demo)"],
    },
    eligibility: {
      roles: ["employee", "self_employed", "business_owner"],
      minMonthlyIncome: 200000,
      note: "Invitation/high-income segment (demo)",
    },
    rules: [
      {
        id: "inf-base",
        kind: "points",
        pointsPer100: 3.3,
        pointValue: 1.0,
        status: "estimated",
        note: "~3.3% equivalent on SmartBuy redemptions (demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "inf-smartbuy",
        kind: "points",
        pointsPer100: 16.5,
        pointValue: 1.0,
        category: "travel",
        monthlyCap: 15000,
        status: "estimated",
        note: "5x on SmartBuy travel, capped monthly (demo)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "hdfc-diners-black",
    issuer: "HDFC Bank",
    name: "Diners Club Black",
    network: "diners",
    annualFee: 10000,
    joiningFee: 10000,
    rewardType: "points",
    art: { from: "#14110b", to: "#3a3428", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "5x rewards, unlimited lounges, golf",
    categories: ["flights", "hotels", "dining", "shopping"],
    perks: {
      domesticLounge: "Unlimited (demo)",
      intlLounge: "Unlimited via Diners (demo)",
      golf: "Complimentary games (demo)",
      metal: true,
    },
    eligibility: {
      roles: ["employee", "self_employed", "business_owner"],
      minMonthlyIncome: 175000,
    },
    rules: [
      {
        id: "dinb-travel",
        kind: "points",
        pointsPer100: 16.5,
        pointValue: 0.5,
        category: "travel",
        monthlyCap: 15000,
        status: "estimated",
        note: "5x RP on travel (capped monthly)",
        provenance: DEMO_PROV(),
      },
      {
        id: "dinb-base",
        kind: "points",
        pointsPer100: 3.3,
        pointValue: 0.5,
        status: "estimated",
        note: "1x base RP",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "swiggy-hdfc",
    issuer: "HDFC Bank",
    name: "Swiggy HDFC",
    network: "visa",
    annualFee: 500,
    joiningFee: 500,
    rewardType: "cashback",
    art: { from: "#5f2c0d", to: "#b3541e", accent: "#ffb27a", ink: "#faf8f2" },
    highlight: "10% cashback on Swiggy, 5% online",
    categories: ["dining", "ecommerce", "shopping"],
    perks: { other: ["Swiggy One benefits (demo)"] },
    eligibility: { roles: ["any"], minMonthlyIncome: 15000 },
    rules: [
      {
        id: "sh-swiggy",
        kind: "cashback",
        percent: 0.1,
        monthlyCap: 1500,
        status: "estimated",
        note: "10% on Swiggy (food, Instamart, dining) capped ₹1,500/mo",
        provenance: DEMO_PROV(),
      },
      {
        id: "sh-online",
        kind: "cashback",
        percent: 0.05,
        category: "ecommerce",
        monthlyCap: 1000,
        status: "estimated",
        note: "5% on other online spends",
        provenance: DEMO_PROV(),
      },
      {
        id: "sh-base",
        kind: "cashback",
        percent: 0.01,
        status: "estimated",
        note: "1% elsewhere",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },

  // ————— SBI Card —————
  {
    slug: "sbi-cashback",
    issuer: "SBI Card",
    name: "Cashback Card",
    network: "mastercard",
    annualFee: 999,
    joiningFee: 999,
    rewardType: "cashback",
    art: { from: "#1d2f6f", to: "#3d55a5", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "Flat 5% online spend cashback",
    categories: ["ecommerce", "shopping", "subscriptions"],
    eligibility: { roles: ["any"], minMonthlyIncome: 20000 },
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
        provenance: DEMO_PROV(),
      },
      {
        id: "sbi-base",
        kind: "cashback",
        percent: 0.01,
        status: "estimated",
        note: "1% offline",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "sbi-bpcl-octane",
    issuer: "SBI Card",
    name: "BPCL Octane",
    network: "visa",
    annualFee: 499,
    joiningFee: 499,
    rewardType: "points",
    art: { from: "#0d3320", to: "#2f7d4f", accent: "#6ee7a0", ink: "#faf8f2" },
    highlight: "Fuel-focused: 4% back on BPCL fuels",
    categories: ["fuel", "utilities"],
    eligibility: { roles: ["any"], minMonthlyIncome: 20000 },
    rules: [
      {
        id: "oct-fuel",
        kind: "points",
        pointsPer100: 40,
        pointValue: 0.1,
        category: "fuel",
        monthlyCap: 1000,
        status: "estimated",
        note: "4% equivalent on BPCL fuel via points (cap ₹1,000/mo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "oct-base",
        kind: "points",
        pointsPer100: 10,
        pointValue: 0.1,
        status: "estimated",
        note: "1% equivalent elsewhere",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "phonepe-sbi-select",
    issuer: "SBI Card × PhonePe",
    name: "PhonePe SBI SELECT",
    network: "rupay",
    annualFee: 499,
    joiningFee: 499,
    rewardType: "cashback",
    art: { from: "#3a1d6e", to: "#6f46c1", accent: "#cdb4ff", ink: "#faf8f2" },
    highlight: "UPI-first RuPay card — pay from any UPI app",
    categories: ["utilities", "shopping", "groceries"],
    perks: {
      upi: true,
      domesticLounge: "1 visit/quarter (demo)",
    },
    eligibility: { roles: ["any"], minMonthlyIncome: 15000 },
    rules: [
      {
        id: "pp-upi",
        kind: "cashback",
        percent: 0.02,
        monthlyCap: 500,
        status: "estimated",
        note: "2% on UPI spends via PhonePe (cap ₹500/mo, demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "pp-base",
        kind: "cashback",
        percent: 0.005,
        status: "estimated",
        note: "0.5% on card swipes",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },

  // ————— Axis Bank —————
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
    eligibility: { roles: ["any"], minMonthlyIncome: 20000 },
    rules: [
      {
        id: "axisfk-fk",
        kind: "cashback",
        percent: 0.05,
        monthlyCap: 4000,
        status: "estimated",
        note: "5% on Flipkart (cap ₹4,000/month)",
        provenance: DEMO_PROV(),
      },
      {
        id: "axisfk-partner",
        kind: "cashback",
        percent: 0.04,
        category: "shopping",
        monthlyCap: 4000,
        status: "estimated",
        note: "4% on preferred partners (shared cap)",
        provenance: DEMO_PROV(),
      },
      {
        id: "axisfk-base",
        kind: "cashback",
        percent: 0.01,
        status: "estimated",
        note: "1% elsewhere",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "airtel-axis",
    issuer: "Axis Bank × Airtel",
    name: "Airtel Axis",
    network: "visa",
    annualFee: 500,
    joiningFee: 500,
    rewardType: "cashback",
    art: { from: "#7a0c0c", to: "#d93a3a", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "25% off Airtel bills + 10% on Airtel Thanks",
    categories: ["telecom", "utilities", "shopping"],
    perks: { domesticLounge: "4 visits/year (demo)" },
    eligibility: { roles: ["any"], minMonthlyIncome: 25000 },
    rules: [
      {
        id: "aa-airtel",
        kind: "cashback",
        percent: 0.25,
        monthlyCap: 300,
        status: "estimated",
        note: "25% off Airtel postpaid/broadband/DTH bills (cap ₹300/mo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "aa-thanks",
        kind: "cashback",
        percent: 0.1,
        monthlyCap: 500,
        status: "estimated",
        note: "10% on Airtel Thanks app purchases (cap ₹500/mo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "aa-base",
        kind: "cashback",
        percent: 0.015,
        status: "estimated",
        note: "1.5% unlimited on other spends",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
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
    highlight: "EDGE Miles for flights & hotels, milestone lounges",
    categories: ["travel", "flights", "hotels"],
    perks: {
      domesticLounge: "4 visits/quarter on milestones (demo)",
      intlLounge: "8 international visits/year on milestones (demo)",
      metal: true,
    },
    eligibility: {
      roles: ["employee", "self_employed", "business_owner"],
      minMonthlyIncome: 60000,
    },
    rules: [
      {
        id: "atlas-travel",
        kind: "miles",
        pointsPer100: 5,
        pointValue: 1.0,
        category: "travel",
        status: "estimated",
        note: "10 EDGE Miles per ₹100 on travel",
        provenance: DEMO_PROV(),
      },
      {
        id: "atlas-base",
        kind: "miles",
        pointsPer100: 5,
        pointValue: 1.0,
        status: "estimated",
        note: "5 EDGE Miles per ₹100 base",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "axis-magnus",
    issuer: "Axis Bank",
    name: "Magnus",
    network: "visa",
    annualFee: 10499,
    joiningFee: 10499,
    rewardType: "points",
    art: { from: "#1c1633", to: "#453a72", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "24,999 bonus miles + premium travel perks",
    categories: ["flights", "hotels", "travel", "dining"],
    perks: {
      domesticLounge: "Unlimited (demo)",
      intlLounge: "Unlimited Priority Pass (demo)",
      golf: "Complimentary golf (demo)",
      metal: true,
    },
    eligibility: {
      roles: ["employee", "self_employed", "business_owner"],
      minMonthlyIncome: 200000,
    },
    rules: [
      {
        id: "mag-base",
        kind: "points",
        pointsPer100: 6,
        pointValue: 1.0,
        status: "estimated",
        note: "6 EDGE points per ₹100 (demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "mag-gateway",
        kind: "points",
        pointsPer100: 12,
        pointValue: 1.0,
        category: "flights",
        monthlyCap: 20000,
        status: "estimated",
        note: "2x on travel partner portal (capped, demo)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },

  // ————— ICICI Bank —————
  {
    slug: "icici-amazonpay",
    issuer: "ICICI Bank × Amazon",
    name: "Amazon Pay ICICI",
    network: "visa",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "cashback",
    art: { from: "#232f3e", to: "#48576d", accent: "#ff9900", ink: "#faf8f2" },
    highlight: "Lifetime-free, 5% for Prime members",
    categories: ["ecommerce", "shopping", "utilities"],
    eligibility: { roles: ["any"], minMonthlyIncome: 10000 },
    rules: [
      {
        id: "icici-amazon",
        kind: "cashback",
        percent: 0.05,
        monthlyCap: 2500,
        status: "estimated",
        note: "5% for Prime members on Amazon.in (demo assumes Prime)",
        provenance: DEMO_PROV(),
      },
      {
        id: "icici-base",
        kind: "cashback",
        percent: 0.02,
        status: "estimated",
        note: "2% partners, 1% elsewhere (simplified)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "icici-coral-rupay",
    issuer: "ICICI Bank",
    name: "Coral RuPay",
    network: "rupay",
    annualFee: 500,
    joiningFee: 500,
    rewardType: "points",
    art: { from: "#0e2a3f", to: "#2f6f8f", accent: "#8ecbff", ink: "#faf8f2" },
    highlight: "RuPay UPI card with railway lounges",
    categories: ["dining", "groceries", "entertainment"],
    perks: {
      upi: true,
      domesticLounge: "2 railway lounge visits/quarter (demo)",
    },
    eligibility: { roles: ["any"], minMonthlyIncome: 25000 },
    rules: [
      {
        id: "coral-base",
        kind: "points",
        pointsPer100: 2,
        pointValue: 0.25,
        status: "estimated",
        note: "2 points per ₹100 (demo)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },

  // ————— IndusInd Bank —————
  {
    slug: "indusind-tiger",
    issuer: "IndusInd Bank",
    name: "Tiger Credit Card",
    network: "visa",
    annualFee: 499,
    joiningFee: 499,
    rewardType: "points",
    art: { from: "#402a10", to: "#8f5b1e", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "4x rewards on online spends",
    categories: ["shopping", "ecommerce", "entertainment"],
    eligibility: { roles: ["any"], minMonthlyIncome: 25000 },
    rules: [
      {
        id: "tiger-online",
        kind: "points",
        pointsPer100: 4,
        pointValue: 0.2,
        status: "estimated",
        note: "4x points on online spends (demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "tiger-base",
        kind: "points",
        pointsPer100: 1,
        pointValue: 0.2,
        status: "estimated",
        note: "1x base points",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },

  // ————— Fintech / non-bank —————
  {
    slug: "scapia-federal",
    issuer: "Federal Bank × Scapia",
    name: "Scapia Co-branded",
    network: "rupay",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "points",
    art: { from: "#0b3d2e", to: "#1e7a5a", accent: "#c8f04e", ink: "#faf8f2" },
    highlight: "Lifetime-free travel card — coins + lounge on UPI spends",
    categories: ["travel", "flights", "hotels", "other"],
    perks: {
      upi: true,
      domesticLounge: "Unlimited domestic on ₹10k monthly spend (demo)",
      other: ["Coins redeemable only for in-app travel bookings"],
    },
    eligibility: {
      roles: ["any"],
      minMonthlyIncome: 10000,
      securedOption: true,
      note: "Easy approval, great first travel card (demo)",
    },
    rules: [
      {
        id: "scapia-travel",
        kind: "points",
        pointsPer100: 100,
        pointValue: 0.1,
        category: "travel",
        monthlyCap: 1000,
        status: "estimated",
        note: "10% back in Scapia coins on travel (reward value capped ₹1,000/mo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "scapia-base",
        kind: "points",
        pointsPer100: 20,
        pointValue: 0.1,
        status: "estimated",
        note: "2% back in coins on everything else",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "kiwi-yes",
    issuer: "Yes Bank × Kiwi",
    name: "Kiwi (Neon)",
    network: "rupay",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "cashback",
    art: { from: "#2b6e1f", to: "#4caf50", accent: "#c8f04e", ink: "#17140e" },
    highlight: "UPI credit card — cashback on every scan & pay",
    categories: ["other", "groceries", "dining", "shopping"],
    perks: {
      upi: true,
      other: ["RuPay credit on any UPI app, virtual card instantly"],
    },
    eligibility: { roles: ["any"], minMonthlyIncome: 15000 },
    rules: [
      {
        id: "kiwi-upi",
        kind: "cashback",
        percent: 0.015,
        monthlyCap: 750,
        status: "estimated",
        note: "1.5% on UPI spends (cap ₹750/mo, demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "kiwi-card",
        kind: "cashback",
        percent: 0.01,
        status: "estimated",
        note: "1% on card swipes",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "uni-urban",
    issuer: "Uni Cards (non-bank)",
    name: "Uni Urban",
    network: "visa",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "cashback",
    art: { from: "#111827", to: "#374151", accent: "#8ecbff", ink: "#faf8f2" },
    highlight: "Pay-in-3/EMI flexibility with flat cashback",
    categories: ["shopping", "ecommerce", "dining"],
    perks: { other: ["Split bills into 3 months at no cost (demo)"] },
    eligibility: { roles: ["any"], minMonthlyIncome: 15000 },
    rules: [
      {
        id: "uni-base",
        kind: "cashback",
        percent: 0.01,
        minAmount: 100,
        status: "estimated",
        note: "1% unlimited cashback (min ₹100 transaction)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "supermoney",
    issuer: "super.money (non-bank, secured)",
    name: "super.money Card",
    network: "rupay",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "cashback",
    art: { from: "#5b0f8a", to: "#9333ea", accent: "#ffb3d9", ink: "#faf8f2" },
    highlight: "FD-secured UPI card — up to 5% via partner brands",
    categories: ["other", "groceries", "shopping", "dining"],
    perks: {
      upi: true,
      other: ["Secured against an FD — no income proof needed (demo)"],
    },
    eligibility: {
      roles: ["any"],
      minMonthlyIncome: 0,
      securedOption: true,
      note: "Great for students & first-card users (FD-backed)",
    },
    rules: [
      {
        id: "sm-partner",
        kind: "cashback",
        percent: 0.05,
        monthlyCap: 500,
        status: "estimated",
        note: "5% at partner brands via super.money app (cap ₹500/mo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "sm-upi",
        kind: "cashback",
        percent: 0.01,
        status: "estimated",
        note: "1% on other UPI spends",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "onecard",
    issuer: "OneCard (non-bank)",
    name: "OneCard Metal",
    network: "visa",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "points",
    art: { from: "#0f172a", to: "#334155", accent: "#ffb3d9", ink: "#faf8f2" },
    highlight: "Lifetime-free metal card, app-first experience",
    categories: ["shopping", "dining", "travel"],
    perks: {
      metal: true,
      other: ["FD-secured option for students / no-credit users (demo)"],
    },
    eligibility: {
      roles: ["any"],
      minMonthlyIncome: 0,
      securedOption: true,
      note: "Student-friendly via FD route (demo)",
    },
    rules: [
      {
        id: "one-base",
        kind: "points",
        pointsPer100: 1,
        pointValue: 0.25,
        status: "estimated",
        note: "1 point per ₹100 (5x on top 2 categories, demo simplified)",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },

  // ————— IDFC First Bank —————
  {
    slug: "idfc-first-millennia",
    issuer: "IDFC First Bank",
    name: "FIRST Millennia",
    network: "mastercard",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "points",
    art: { from: "#5e1914", to: "#9c4038", accent: "#ffb27a", ink: "#faf8f2" },
    highlight: "Lifetime-free, 10x points above ₹20k monthly spend",
    categories: ["dining", "groceries", "entertainment"],
    eligibility: { roles: ["any"], minMonthlyIncome: 20000 },
    rules: [
      {
        id: "idfm-boosted",
        kind: "points",
        pointsPer100: 10,
        pointValue: 0.25,
        minAmount: 20000,
        status: "estimated",
        note: "10x points on monthly spends above ₹20k (up to ₹30k)",
        provenance: DEMO_PROV(),
      },
      {
        id: "idfm-base",
        kind: "points",
        pointsPer100: 3,
        pointValue: 0.25,
        status: "estimated",
        note: "3x points otherwise",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "idfc-first-select",
    issuer: "IDFC First Bank",
    name: "FIRST Select",
    network: "mastercard",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "points",
    art: { from: "#1a2f14", to: "#3d5c2f", accent: "#6ee7a0", ink: "#faf8f2" },
    highlight: "Lifetime-free with 4 lounge visits/quarter",
    categories: ["dining", "groceries", "entertainment", "travel"],
    perks: { domesticLounge: "4 visits/quarter (demo)" },
    eligibility: { roles: ["any"], minMonthlyIncome: 25000 },
    rules: [
      {
        id: "idfs-boosted",
        kind: "points",
        pointsPer100: 10,
        pointValue: 0.25,
        minAmount: 20000,
        status: "estimated",
        note: "10x points above ₹20k monthly spend (demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "idfs-base",
        kind: "points",
        pointsPer100: 3,
        pointValue: 0.25,
        status: "estimated",
        note: "3x points otherwise",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "idfc-first-wealth",
    issuer: "IDFC First Bank",
    name: "FIRST Wealth",
    network: "mastercard",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "points",
    art: { from: "#0c1f2e", to: "#274b66", accent: "#8ecbff", ink: "#faf8f2" },
    highlight: "Lifetime-free premium — lounges + higher reward rates",
    categories: ["travel", "dining", "shopping", "flights"],
    perks: {
      domesticLounge: "4 visits/quarter (demo)",
      intlLounge: "1 visit/quarter (demo)",
      other: ["Complimentary personal accident cover (demo)"],
    },
    eligibility: { roles: ["any"], minMonthlyIncome: 100000 },
    rules: [
      {
        id: "idfw-boosted",
        kind: "points",
        pointsPer100: 10,
        pointValue: 0.25,
        minAmount: 20000,
        status: "estimated",
        note: "10x points above ₹20k monthly spend",
        provenance: DEMO_PROV(),
      },
      {
        id: "idfw-base",
        kind: "points",
        pointsPer100: 3,
        pointValue: 0.25,
        status: "estimated",
        note: "3x points otherwise",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },

  // ————— Kotak / HSBC / BoB / others —————
  {
    slug: "kotak-fortune-gold",
    issuer: "Kotak Mahindra Bank",
    name: "Fortune Gold",
    network: "visa",
    annualFee: 999,
    joiningFee: 999,
    rewardType: "points",
    art: { from: "#6b4b0a", to: "#c99a2e", accent: "#ffd84d", ink: "#17140e" },
    highlight: "4x points on 6 everyday categories",
    categories: ["shopping", "dining", "groceries", "fuel"],
    perks: { domesticLounge: "2 visits/quarter (demo)" },
    eligibility: { roles: ["any"], minMonthlyIncome: 20000 },
    rules: [
      {
        id: "kfg-boosted",
        kind: "points",
        pointsPer100: 4,
        pointValue: 0.2,
        monthlyCap: 1000,
        status: "estimated",
        note: "4x points on select categories (cap ₹1,000/mo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "kfg-base",
        kind: "points",
        pointsPer100: 1,
        pointValue: 0.2,
        status: "estimated",
        note: "1x base points",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "hsbc-visa-platinum",
    issuer: "HSBC India",
    name: "Visa Platinum",
    network: "visa",
    annualFee: 0,
    joiningFee: 0,
    rewardType: "points",
    art: { from: "#7a0c0c", to: "#b91c1c", accent: "#faf8f2", ink: "#faf8f2" },
    highlight: "Lifetime-free with strong dining/food rewards",
    categories: ["dining", "hotels", "groceries"],
    eligibility: { roles: ["any"], minMonthlyIncome: 30000 },
    rules: [
      {
        id: "hsbc-dining",
        kind: "points",
        pointsPer100: 2.67,
        pointValue: 0.15,
        category: "dining",
        status: "estimated",
        note: "4 points per ₹150 on dining & hotels (demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "hsbc-base",
        kind: "points",
        pointsPer100: 1.33,
        pointValue: 0.15,
        status: "estimated",
        note: "2 points per ₹150 base",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "bob-eterna",
    issuer: "Bank of Baroda",
    name: "Eterna",
    network: "visa",
    annualFee: 2499,
    joiningFee: 2499,
    rewardType: "points",
    art: { from: "#0d2440", to: "#2f5c8f", accent: "#ffd84d", ink: "#faf8f2" },
    highlight: "Premium BoB card — lounges, golf, higher limits",
    categories: ["travel", "dining", "shopping", "flights"],
    perks: {
      domesticLounge: "4 visits/quarter (demo)",
      intlLounge: "1 visit/year (demo)",
      golf: "Golf round benefits (demo)",
    },
    eligibility: {
      roles: ["employee", "self_employed", "business_owner"],
      minMonthlyIncome: 40000,
    },
    rules: [
      {
        id: "ete-travel",
        kind: "points",
        pointsPer100: 3,
        pointValue: 0.25,
        category: "travel",
        status: "estimated",
        note: "3x points on travel (demo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "ete-base",
        kind: "points",
        pointsPer100: 1,
        pointValue: 0.25,
        status: "estimated",
        note: "1x base points",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
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
    highlight: "High-rate MR points with transfer partners",
    categories: ["dining", "flights", "hotels", "shopping"],
    perks: {
      domesticLounge: "Via Amex offers (demo)",
      other: ["Transfer partners: Marriott, Hilton, British Airways (demo)"],
    },
    eligibility: {
      roles: ["employee", "self_employed", "business_owner"],
      minMonthlyIncome: 50000,
    },
    rules: [
      {
        id: "amex-dining",
        kind: "points",
        pointsPer100: 10,
        pointValue: 0.4,
        category: "dining",
        monthlyCap: 5000,
        status: "estimated",
        note: "10x MR points on dining (cap 5,000 bonus pts/month)",
        provenance: DEMO_PROV(),
      },
      {
        id: "amex-base",
        kind: "points",
        pointsPer100: 2,
        pointValue: 0.4,
        status: "estimated",
        note: "2 MR points per ₹100 base",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    slug: "tata-neu-hdfc",
    issuer: "HDFC Bank × Tata Neu",
    name: "Tata Neu Infinity HDFC",
    network: "rupay",
    annualFee: 1499,
    joiningFee: 1499,
    rewardType: "points",
    art: { from: "#3b0d5e", to: "#7a2fbf", accent: "#cdb4ff", ink: "#faf8f2" },
    highlight: "5% NeuCoins on Tata apps + UPI support",
    categories: ["groceries", "shopping", "travel", "dining"],
    perks: {
      upi: true,
      domesticLounge: "4 domestic + 4 railway visits/quarter (demo)",
      intlLounge: "Visa/Mastercard variant lounge via milestone (demo)",
    },
    eligibility: { roles: ["any"], minMonthlyIncome: 25000 },
    rules: [
      {
        id: "neu-tata",
        kind: "points",
        pointsPer100: 5,
        pointValue: 1.0,
        monthlyCap: 2000,
        status: "estimated",
        note: "5% NeuCoins on BigBasket, 1mg, Tata CLiQ, Croma (cap ₹2,000/mo)",
        provenance: DEMO_PROV(),
      },
      {
        id: "neu-base",
        kind: "points",
        pointsPer100: 1.5,
        pointValue: 1.0,
        status: "estimated",
        note: "1.5% NeuCoins elsewhere",
        provenance: DEMO_PROV(),
      },
    ],
    status: "estimated",
    provenance: DEMO_PROV(),
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
  { id: "bigbasket", name: "BigBasket", category: "groceries", aliases: ["bigbasket.com", "tata neu"] },
  { id: "zepto", name: "Zepto", category: "groceries", aliases: ["zepto.in"] },
  { id: "reliance-digital", name: "Reliance Digital", category: "shopping", aliases: ["reliancedigital.in"] },
  { id: "croma", name: "Croma", category: "shopping", aliases: ["croma.com"] },
  { id: "indigo", name: "IndiGo Airlines", category: "flights", aliases: ["goindigo.in"] },
  { id: "air-india", name: "Air India", category: "flights", aliases: ["airindia.com"] },
  { id: "taj", name: "Taj Hotels", category: "hotels", aliases: ["tajhotels.com"] },
  { id: "iocl", name: "Indian Oil", category: "fuel", aliases: ["petrol pump", "fuel station"] },
  { id: "airtel", name: "Airtel", category: "telecom", aliases: ["airtel.in", "airtel thanks"] },
  { id: "jio", name: "Jio", category: "telecom", aliases: ["jio.com"] },
];

/**
 * Offers with real-world-style date windows. The UI/engine only surfaces
 * offers whose window contains the purchase date — expired and future offers
 * are excluded automatically. (Demo data — not live promotions.)
 */
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
    source: "Demo data — starts Sep 20 (future)",
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
    id: "swiggy-hdfc-bank",
    merchantId: "swiggy",
    title: "Extra 10% off with HDFC credit cards (up to ₹150)",
    kind: "discount",
    percent: 0.1,
    minAmount: 400,
    maxBenefit: 150,
    startsAt: "2026-09-05",
    endsAt: "2026-09-30",
    stacksWith: ["swiggy-supersaver"],
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-12",
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
    source: "Demo data — starts Sep 18 (future)",
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
    id: "indigo-early",
    merchantId: "indigo",
    title: "Early bird: 8% off base fare on direct flights",
    kind: "discount",
    percent: 0.08,
    minAmount: 3000,
    maxBenefit: 900,
    startsAt: "2026-09-05",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-06",
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
    title: "Movie night: 25% off tickets, up to ₹150",
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
    id: "airtel-bills",
    merchantId: "airtel",
    title: "Airtel Thanks: ₹75 cashback on postpaid/broadband recharges",
    kind: "cashback",
    flat: 75,
    minAmount: 499,
    maxBenefit: 75,
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-03",
    status: "estimated",
  },
  {
    id: "bb-save",
    merchantId: "bigbasket",
    title: "BigBasket: 10% off above ₹1,500 carts",
    kind: "discount",
    percent: 0.1,
    minAmount: 1500,
    maxBenefit: 250,
    startsAt: "2026-09-12",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-13",
    status: "estimated",
  },
  {
    id: "zepto-fast",
    merchantId: "zepto",
    title: "Zepto: ₹60 off above ₹399 (all payment methods)",
    kind: "coupon",
    flat: 60,
    minAmount: 399,
    maxBenefit: 60,
    startsAt: "2026-09-10",
    endsAt: "2026-09-30",
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-11",
    status: "estimated",
  },
  {
    id: "croma-tech",
    merchantId: "croma",
    title: "Tech days: 5% instant discount above ₹15,000",
    kind: "discount",
    percent: 0.05,
    minAmount: 15000,
    maxBenefit: 1500,
    startsAt: "2026-09-15",
    endsAt: "2026-09-30",
    stacksWith: [],
    source: "Demo data — not a live promotion",
    lastVerified: "2026-09-15",
    status: "estimated",
  },
  {
    id: "fuel-iocl",
    merchantId: "iocl",
    title: "Fuel saver: 1.5% up to ₹250/month on fuel spends",
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
  // Recently expired — demonstrates expiry handling in UI/engine.
  {
    id: "mmt-independence",
    merchantId: "makemytrip",
    title: "Freedom Sale: 20% off hotels (EXPIRED Sep 15)",
    kind: "discount",
    percent: 0.2,
    minAmount: 10000,
    maxBenefit: 2000,
    startsAt: "2026-08-01",
    endsAt: "2026-09-15",
    source: "Demo data — expired offer, excluded from calculations",
    lastVerified: "2026-08-01",
    status: "expired",
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
    provenance: DEMO_PROV(),
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
    provenance: DEMO_PROV(),
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
    provenance: DEMO_PROV(),
  },
  {
    id: "scapia-coins",
    name: "Scapia Coins",
    issuer: "Scapia / Federal Bank",
    kind: "points",
    demoPointValue: 0.1,
    redemptionNote:
      "Coins redeem ONLY for travel bookings inside the Scapia app (demo). No vouchers or cash-out.",
    status: "estimated",
    provenance: DEMO_PROV(),
  },
  {
    id: "tata-neu",
    name: "NeuCoins",
    issuer: "Tata Neu / HDFC Bank",
    kind: "points",
    demoPointValue: 1.0,
    redemptionNote:
      "1 NeuCoin = ₹1 across Tata ecosystem (demo): BigBasket, Croma, Westside, Air India, Tata CLiQ.",
    status: "estimated",
    provenance: DEMO_PROV(),
  },
];

/**
 * The full browsable catalog: hand-curated cards first, then the expanded
 * generated set of real Indian card products (demo terms).
 */
export const DEMO_CARDS: DemoCard[] = [...CURATED_CARDS, ...GENERATED_CARDS];

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

/** Demo eligibility check used by the UI to badge catalog cards. */
export function checkEligibility(
  card: DemoCard,
  role: string | undefined,
  monthlyIncome: number | undefined,
): { eligible: boolean; reason: string } {
  const rolesOk =
    card.eligibility.roles.includes("any") ||
    (role && card.eligibility.roles.includes(role as Role));
  const incomeOk =
    card.eligibility.minMonthlyIncome === 0 ||
    (monthlyIncome ?? 0) >= card.eligibility.minMonthlyIncome;
  if (rolesOk && incomeOk) {
    return { eligible: true, reason: "Matches your profile" };
  }
  if (!rolesOk) {
    return {
      eligible: false,
      reason: "Typically issued to different employment profiles",
    };
  }
  return {
    eligible: false,
    reason: `Income ₹${card.eligibility.minMonthlyIncome.toLocaleString("en-IN")}+/month typically required`,
  };
}
