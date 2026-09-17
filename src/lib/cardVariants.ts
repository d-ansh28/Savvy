/**
 * Catalog expansion for Savvy.
 *
 * Turns a compact spec bank of real, publicly-known Indian card products into
 * full DemoCard entries with the same shape as the curated catalog. Every
 * generated rate/cap/fee is DEMO data (status "estimated" or
 * "needs_verification" — never presented as verified live terms).
 *
 * Type-only import from catalog keeps this module cycle-free at runtime.
 */
import type {
  Category,
  DemoCard,
  Eligibility,
  Network,
  Perks,
  RewardRule,
} from "./catalog";

const PROV = {
  source: "Demo catalog (illustrative — verify with issuer)",
  last_verified: "2026-09-15",
} as const;

type ProfileId =
  | "premium"
  | "miles"
  | "online"
  | "everyday"
  | "fuel"
  | "dining"
  | "cobrand"
  | "secured"
  | "upi"
  | "business";

interface ProfileDef {
  categories: Category[];
  headline: string;
  block: { from: string; to: string; accent: string; ink: string };
}

const PROFILES: Record<ProfileId, ProfileDef> = {
  premium: {
    categories: ["travel", "flights", "hotels", "dining", "shopping"],
    headline: "Premium travel & lifestyle card with lounge and golf perks",
    block: { from: "#17140f", to: "#3a3226", accent: "#e6c25a", ink: "#faf8f2" },
  },
  miles: {
    categories: ["flights", "hotels", "travel", "shopping"],
    headline: "Earn miles on flights & hotels, redeem across partners",
    block: { from: "#0e1c33", to: "#1d3a63", accent: "#7cc4ff", ink: "#f4f8fd" },
  },
  online: {
    categories: ["ecommerce", "shopping", "subscriptions", "entertainment"],
    headline: "Elevated cashback on online spends",
    block: { from: "#231a3d", to: "#453572", accent: "#c8f04e", ink: "#f7f5ff" },
  },
  everyday: {
    categories: ["groceries", "shopping", "dining", "utilities", "telecom"],
    headline: "Simple everyday rewards on groceries, bills & shopping",
    block: { from: "#2f2a21", to: "#57503f", accent: "#c8f04e", ink: "#faf8f2" },
  },
  fuel: {
    categories: ["fuel", "groceries", "utilities"],
    headline: "Fuel savings with surcharge cover and bill rewards",
    block: { from: "#12291c", to: "#235238", accent: "#ffb347", ink: "#f2fbf5" },
  },
  dining: {
    categories: ["dining", "entertainment", "shopping"],
    headline: "Dining, food delivery & entertainment rewards",
    block: { from: "#33141f", to: "#64203a", accent: "#ff8fb3", ink: "#fdf3f6" },
  },
  cobrand: {
    categories: ["ecommerce", "shopping", "entertainment"],
    headline: "Partner-locked cashback on the co-brand platform",
    block: { from: "#12233d", to: "#2b4a7a", accent: "#ffe08a", ink: "#f4f8fd" },
  },
  secured: {
    categories: ["shopping", "groceries", "utilities"],
    headline: "FD-backed starter card — build credit safely",
    block: { from: "#22262c", to: "#3d444e", accent: "#7ad8f0", ink: "#f4f7fa" },
  },
  upi: {
    categories: ["ecommerce", "shopping", "dining", "entertainment"],
    headline: "RuPay card — earn rewards on UPI spends too",
    block: { from: "#2a1544", to: "#4d2a7d", accent: "#8ef0c8", ink: "#f8f4ff" },
  },
  business: {
    categories: ["utilities", "telecom", "travel", "shopping", "fuel"],
    headline: "Business spend rewards with GST-friendly categories",
    block: { from: "#1d1d1d", to: "#3c3c3c", accent: "#ffb347", ink: "#faf8f2" },
  },
};

/** [issuer, name, profile, annualFee, network?] */
type Spec = [string, string, ProfileId, number, Network?];

const SPECS: Spec[] = [
  // ————— HDFC Bank —————
  ["HDFC Bank", "MoneyBack+", "everyday", 500],
  ["HDFC Bank", "MoneyBack", "everyday", 500],
  ["HDFC Bank", "Solitaire", "premium", 10000, "mastercard"],
  ["HDFC Bank", "Regalia", "premium", 2500],
  ["HDFC Bank", "Regalia First", "miles", 1000],
  ["HDFC Bank", "Freedom", "everyday", 500],
  ["HDFC Bank", "Titanium Edge", "everyday", 500],
  ["HDFC Bank", "Platinum Edge", "everyday", 500],
  ["HDFC Bank", "Platinum Times", "dining", 500],
  ["HDFC Bank", "Visa Signature", "miles", 2500],
  ["HDFC Bank", "Diners Club Privilege", "miles", 1000, "diners"],
  ["HDFC Bank", "Diners Club Premium", "premium", 2500, "diners"],
  ["HDFC Bank", "Diners Club Black MLT", "premium", 10000, "diners"],
  ["HDFC Bank", "Diners Club Metal Edition", "premium", 12500, "diners"],
  ["HDFC Bank", "Diners Clubmint", "online", 2500, "diners"],
  ["HDFC Bank", "Pixel Play", "online", 500],
  ["HDFC Bank", "Pixel Go", "online", 500],
  ["HDFC Bank", "Upar", "everyday", 0, "rupay"],
  ["HDFC Bank", "UPI RuPay", "upi", 0, "rupay"],
  ["HDFC Bank", "IndianOil", "fuel", 500],
  ["HDFC Bank", "IRCTC", "miles", 500],
  ["HDFC Bank", "Marriott Bonvoy", "miles", 3000],
  ["HDFC Bank", "Shoppers Stop", "cobrand", 0],
  ["HDFC Bank", "6E Rewards", "miles", 1500],
  ["HDFC Bank", "6E Rewards XL", "miles", 3000],
  ["HDFC Bank", "Paytm", "cobrand", 0],
  ["HDFC Bank", "InterMiles", "miles", 500],
  ["HDFC Bank", "Business MoneyBack", "business", 500],
  ["HDFC Bank", "Business Regalia", "business", 1000],

  // ————— SBI Card —————
  ["SBI Card", "SimplyCLICK", "online", 499],
  ["SBI Card", "SimplySAVE", "everyday", 499],
  ["SBI Card", "Prime", "premium", 2999],
  ["SBI Card", "ELITE", "premium", 4999],
  ["SBI Card", "Miles Elite", "miles", 4999],
  ["SBI Card", "Miles Ahead", "miles", 499],
  ["SBI Card", "IRCTC Premier", "miles", 500],
  ["SBI Card", "StyleUP", "dining", 499],
  ["SBI Card", "Unnati", "everyday", 0],
  ["SBI Card", "Shaurya", "everyday", 0],
  ["SBI Card", "Student Plus", "secured", 0],
  ["SBI Card", "FBB", "cobrand", 499],
  ["SBI Card", "Nykaa", "cobrand", 499],

  // ————— ICICI Bank —————
  ["ICICI Bank", "Rubyx", "everyday", 500],
  ["ICICI Bank", "Sapphiro", "premium", 2500, "mastercard"],
  ["ICICI Bank", "Sapphiro Amex", "miles", 2500, "amex"],
  ["ICICI Bank", "Emeralde", "premium", 12000],
  ["ICICI Bank", "Emeralde Private Metal", "premium", 12500, "rupay"],
  ["ICICI Bank", "HPCL Super Saver", "fuel", 500],
  ["ICICI Bank", "MakeMyTrip", "miles", 2500],
  ["ICICI Bank", "Platinum Chip", "everyday", 0],
  ["ICICI Bank", "Platinum Identity", "everyday", 0],
  ["ICICI Bank", "Unifare Metro", "everyday", 0, "rupay"],
  ["ICICI Bank", "NRI Coral", "everyday", 500],

  // ————— Axis Bank —————
  ["Axis Bank", "ACE", "online", 499],
  ["Axis Bank", "MyZone", "dining", 500],
  ["Axis Bank", "Neo", "everyday", 0],
  ["Axis Bank", "Privilege", "miles", 1500],
  ["Axis Bank", "Reserve", "premium", 5000],
  ["Axis Bank", "Select", "miles", 1000],
  ["Axis Bank", "Rewards", "everyday", 500],
  ["Axis Bank", "Horizon", "miles", 3000],
  ["Axis Bank", "My Wings", "miles", 1500],
  ["Axis Bank", "Insta Easy", "secured", 500],

  // ————— IDFC First Bank —————
  ["IDFC First Bank", "Classic", "everyday", 0],
  ["IDFC First Bank", "Scarlet", "everyday", 0],
  ["IDFC First Bank", "Ashva", "premium", 2999, "rupay"],
  ["IDFC First Bank", "Mayura", "miles", 2999, "rupay"],
  ["IDFC First Bank", "Power+", "fuel", 199],
  ["IDFC First Bank", "WOW", "secured", 0],
  ["IDFC First Bank", "Private", "premium", 0],

  // ————— Kotak Mahindra Bank —————
  ["Kotak Mahindra Bank", "811 #DreamDifferent", "everyday", 0],
  ["Kotak Mahindra Bank", "League Platinum", "everyday", 500],
  ["Kotak Mahindra Bank", "Royale Signature", "miles", 999],
  ["Kotak Mahindra Bank", "PVR", "dining", 0],
  ["Kotak Mahindra Bank", "Zen+", "premium", 500],
  ["Kotak Mahindra Bank", "White Reserve", "premium", 2500],
  ["Kotak Mahindra Bank", "IndiGo Ka-ching", "miles", 1500],
  ["Kotak Mahindra Bank", "IndianOil", "fuel", 0],
  ["Kotak Mahindra Bank", "Mojo+", "everyday", 0],
  ["Kotak Mahindra Bank", "Delight", "everyday", 500],
  ["Kotak Mahindra Bank", "Silk Inspire", "everyday", 0],
  ["Kotak Mahindra Bank", "Myntra", "cobrand", 0],
  ["Kotak Mahindra Bank", "UPI RuPay", "upi", 0, "rupay"],

  // ————— IndusInd Bank —————
  ["IndusInd Bank", "Platinum RuPay", "upi", 0, "rupay"],
  ["IndusInd Bank", "Legend", "premium", 1999],
  ["IndusInd Bank", "Nexxt", "everyday", 0],
  ["IndusInd Bank", "Aura Edge", "miles", 1899],
  ["IndusInd Bank", "Pinnacle", "premium", 4999],
  ["IndusInd Bank", "EazyDiner", "dining", 0],
  ["IndusInd Bank", "Samman RuPay", "upi", 0, "rupay"],

  // ————— Yes Bank —————
  ["Yes Bank", "YES Prosperity Cashback", "everyday", 999],
  ["Yes Bank", "YES Premier", "miles", 1999],
  ["Yes Bank", "YES First Exclusive", "premium", 9999],
  ["Yes Bank", "Kiwi Young", "upi", 0, "rupay"],

  // ————— AU Small Finance Bank —————
  ["AU Small Finance Bank", "Altura", "everyday", 499],
  ["AU Small Finance Bank", "Altura Plus", "everyday", 999],
  ["AU Small Finance Bank", "Vetta", "premium", 2999],
  ["AU Small Finance Bank", "Zenith+", "premium", 4999],
  ["AU Small Finance Bank", "LIT", "online", 499],
  ["AU Small Finance Bank", "Nomad", "miles", 2999],
  ["AU Small Finance Bank", "Nexo", "upi", 0, "rupay"],

  // ————— RBL Bank —————
  ["RBL Bank", "World Safari", "miles", 3000],
  ["RBL Bank", "World Safari FX", "miles", 3000],
  ["RBL Bank", "Icon", "premium", 3000],
  ["RBL Bank", "Platinum Maxima", "everyday", 2000],
  ["RBL Bank", "Fun+", "dining", 0],
  ["RBL Bank", "ShopRite", "everyday", 0],
  ["RBL Bank", "Bajaj Finserv World Plus", "everyday", 750],

  // ————— Standard Chartered —————
  ["Standard Chartered", "Ultimate", "premium", 5000],
  ["Standard Chartered", "Platinum Rewards", "everyday", 750],
  ["Standard Chartered", "Super Value Titanium", "fuel", 750],
  ["Standard Chartered", "EaseMyTrip", "miles", 350],
  ["Standard Chartered", "Manhattan", "everyday", 999, "mastercard"],

  // ————— HSBC India —————
  ["HSBC India", "Live+", "online", 999],
  ["HSBC India", "Premier", "premium", 3000],
  ["HSBC India", "TravelOne", "miles", 4999],

  // ————— Bank of Baroda —————
  ["Bank of Baroda", "Prime", "everyday", 500],
  ["Bank of Baroda", "Select", "miles", 1500],
  ["Bank of Baroda", "Varunah", "miles", 500],
  ["Bank of Baroda", "Easy", "secured", 0],

  // ————— Axis Bank (formerly Citi) —————
  ["Axis Bank (formerly Citi)", "Cash Back+", "everyday", 500],
  ["Axis Bank (formerly Citi)", "Rewards", "everyday", 1000],

  // ————— American Express —————
  ["American Express", "Platinum Travel", "miles", 5000, "amex"],
  ["American Express", "MRCC", "everyday", 1500, "amex"],
  ["American Express", "Platinum Reserve", "premium", 5000, "amex"],
  ["American Express", "Business Gold", "business", 4500, "amex"],

  // ————— Co-brands & fintech —————
  ["HDFC Bank × Tata Neu", "Tata Neu Plus", "miles", 499, "rupay"],
  ["Jupiter (CSB Bank)", "Edge+ RuPay", "upi", 0, "rupay"],
  ["Jupiter (CSB Bank)", "Edge RuPay", "upi", 0, "rupay"],
  ["Federal Bank × Fi", "Fi Federal", "everyday", 0],
  ["Uni Cards", "Gateway", "upi", 0, "rupay"],
  ["Uni Cards", "Unity", "online", 29],

  // ————— PSU / regional banks (RuPay UPI-ready) —————
  ["Punjab National Bank", "RuPay Select", "everyday", 0, "rupay"],
  ["Punjab National Bank", "RuPay Platinum", "everyday", 0, "rupay"],
  ["Canara Bank", "RuPay Select", "everyday", 0, "rupay"],
  ["Union Bank of India", "RuPay Select", "everyday", 0, "rupay"],
  ["Bank of India", "RuPay Platinum", "everyday", 0, "rupay"],
  ["Indian Bank", "RuPay Select", "everyday", 0, "rupay"],
  ["UCO Bank", "RuPay Select", "everyday", 0, "rupay"],
  ["Central Bank of India", "RuPay Select", "everyday", 0, "rupay"],
  ["Punjab & Sind Bank", "RuPay Platinum", "everyday", 0, "rupay"],
  ["Bank of Maharashtra", "RuPay Platinum", "everyday", 0, "rupay"],
  ["J&K Bank", "RuPay Platinum", "everyday", 0, "rupay"],
  ["City Union Bank", "RuPay Select", "everyday", 0, "rupay"],
  ["Saraswat Bank", "RuPay Platinum", "everyday", 0, "rupay"],
  ["IDBI Bank", "Euphoria+", "everyday", 0],
  ["IDBI Bank", "Win", "everyday", 0],
  ["Federal Bank", "Signet", "upi", 0, "rupay"],
  ["Federal Bank", "Celesta", "premium", 2500],
  ["Federal Bank", "Delights", "everyday", 0],
  ["South Indian Bank", "SIB ONE", "upi", 0, "rupay"],
  ["DBS Bank India", "Vantage", "miles", 5999],

  // ————— Final batch —————
  ["American Express", "SmartEarn", "online", 1500, "amex"],
  ["American Express", "Business Platinum", "business", 15000, "amex"],
  ["Axis Bank", "Burgundy Private", "premium", 50000],
  ["ICICI Bank", "Meridian", "premium", 12500, "amex"],
  ["Yes Bank", "YES Premia", "everyday", 999],
  ["Yes Bank", "Klick", "upi", 0, "rupay"],
  ["IDFC First Bank", "SWYP", "upi", 0, "rupay"],
  ["Kotak Mahindra Bank", "Uru", "upi", 0, "rupay"],
  ["Federal Bank", "Imperio", "everyday", 0, "rupay"],
  ["Canara Bank", "RuPay Platinum", "everyday", 0, "rupay"],
  ["Union Bank of India", "RuPay Platinum", "everyday", 0, "rupay"],
  ["Bank of India", "RuPay Select", "everyday", 0, "rupay"],
  ["Indian Bank", "RuPay Platinum", "everyday", 0, "rupay"],
  ["Karur Vysya Bank", "RuPay Platinum", "everyday", 0, "rupay"],
  ["HDFC Bank", "Business Platinum", "business", 1000],
  ["ICICI Bank", "Business Black Metal", "business", 25000, "amex"],
  ["Standard Chartered", "Rewards", "everyday", 750],
  ["HSBC India", "Cashback", "online", 999],
  ["Bank of Baroda", "Premier", "miles", 750],
  ["HDFC Bank", "Freedom RuPay", "upi", 500, "rupay"],
  ["HDFC Bank", "Bharat Cashback", "fuel", 0, "rupay"],
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ruleProv = () => ({ source: PROV.source, last_verified: PROV.last_verified });

function rulesFor(slug: string, profile: ProfileId): RewardRule[] {
  const R = (r: Omit<RewardRule, "provenance">): RewardRule => ({
    ...r,
    provenance: ruleProv(),
  });
  switch (profile) {
    case "premium":
      return [
        R({ id: `${slug}-base`, kind: "points", pointsPer100: 3, pointValue: 0.6, status: "estimated", note: "Base: 3 points per ₹100 (demo)" }),
        R({ id: `${slug}-trav`, kind: "points", pointsPer100: 12, pointValue: 0.6, category: "travel", monthlyCap: 2500, status: "estimated", note: "12X on travel, capped (demo)" }),
        R({ id: `${slug}-fl`, kind: "points", pointsPer100: 12, pointValue: 0.6, category: "flights", monthlyCap: 2500, status: "estimated" }),
        R({ id: `${slug}-hot`, kind: "points", pointsPer100: 12, pointValue: 0.6, category: "hotels", monthlyCap: 2500, status: "estimated" }),
      ];
    case "miles":
      return [
        R({ id: `${slug}-base`, kind: "miles", pointsPer100: 4, pointValue: 1, status: "estimated", note: "Base: 4 miles per ₹100 (demo)" }),
        R({ id: `${slug}-fl`, kind: "miles", pointsPer100: 16, pointValue: 1, category: "flights", monthlyCap: 3000, status: "estimated", note: "16X on flights, capped (demo)" }),
        R({ id: `${slug}-hot`, kind: "miles", pointsPer100: 16, pointValue: 1, category: "hotels", monthlyCap: 3000, status: "estimated" }),
      ];
    case "online":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.01, status: "estimated", note: "Base 1% on all spends (demo)" }),
        R({ id: `${slug}-ec`, kind: "cashback", percent: 0.05, category: "ecommerce", monthlyCap: 1000, onlineOnly: true, status: "estimated", note: "5% online, capped ₹1,000/month (demo)" }),
        R({ id: `${slug}-sh`, kind: "cashback", percent: 0.05, category: "shopping", monthlyCap: 1000, onlineOnly: true, status: "estimated" }),
      ];
    case "everyday":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.01, status: "estimated", note: "Base 1% on all spends (demo)" }),
        R({ id: `${slug}-gr`, kind: "cashback", percent: 0.02, category: "groceries", monthlyCap: 750, status: "estimated", note: "2% groceries, capped (demo)" }),
        R({ id: `${slug}-sh`, kind: "cashback", percent: 0.02, category: "shopping", monthlyCap: 750, status: "estimated" }),
        R({ id: `${slug}-di`, kind: "cashback", percent: 0.02, category: "dining", monthlyCap: 750, status: "estimated" }),
      ];
    case "fuel":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.01, status: "estimated", note: "Base 1% on all spends (demo)" }),
        R({ id: `${slug}-fu`, kind: "cashback", percent: 0.04, category: "fuel", transactionCap: 250, status: "estimated", note: "4% fuel, ₹250 cap per transaction (demo)" }),
      ];
    case "dining":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.01, status: "estimated", note: "Base 1% on all spends (demo)" }),
        R({ id: `${slug}-di`, kind: "cashback", percent: 0.05, category: "dining", monthlyCap: 1000, status: "estimated", note: "5% dining, capped ₹1,000/month (demo)" }),
        R({ id: `${slug}-en`, kind: "cashback", percent: 0.02, category: "entertainment", monthlyCap: 500, status: "estimated" }),
      ];
    case "cobrand":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.01, status: "estimated", note: "Base 1% on all spends (demo)" }),
        R({ id: `${slug}-ec`, kind: "cashback", percent: 0.05, category: "ecommerce", monthlyCap: 1000, onlineOnly: true, status: "estimated", note: "5% on partner platform, capped (demo)" }),
      ];
    case "secured":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.01, status: "estimated", note: "Flat 1% cashback (demo)" }),
      ];
    case "upi":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.01, status: "estimated", note: "Base 1% on all spends incl. UPI (demo)" }),
        R({ id: `${slug}-ec`, kind: "cashback", percent: 0.02, category: "ecommerce", monthlyCap: 500, status: "estimated", note: "2% online, capped ₹500/month (demo)" }),
      ];
    case "business":
      return [
        R({ id: `${slug}-base`, kind: "cashback", percent: 0.015, status: "estimated", note: "Base 1.5% on business spends (demo)" }),
        R({ id: `${slug}-ut`, kind: "cashback", percent: 0.03, category: "utilities", monthlyCap: 1500, status: "estimated", note: "3% utilities, capped (demo)" }),
        R({ id: `${slug}-te`, kind: "cashback", percent: 0.03, category: "telecom", monthlyCap: 1500, status: "estimated" }),
      ];
  }
}

function eligibilityFor(profile: ProfileId, fee: number): Eligibility {
  if (profile === "secured") {
    return {
      roles: ["any"],
      minMonthlyIncome: 0,
      securedOption: true,
      note: "FD-secured — no income proof needed (demo)",
    };
  }
  if (profile === "upi") {
    return {
      roles: ["any"],
      minMonthlyIncome: 0,
      securedOption: true,
      note: "Entry-level RuPay card, student friendly (demo)",
    };
  }
  if (profile === "business") {
    return {
      roles: ["self_employed", "business_owner"],
      minMonthlyIncome: Math.max(50000, incomeBand(fee)),
      note: "For self-employed & business owners (demo)",
    };
  }
  if (fee >= 5000) {
    return { roles: ["employee", "self_employed", "business_owner"], minMonthlyIncome: incomeBand(fee) };
  }
  return { roles: ["any"], minMonthlyIncome: incomeBand(fee) };
}

function incomeBand(fee: number): number {
  if (fee <= 0) return 15000;
  if (fee <= 500) return 20000;
  if (fee <= 1000) return 30000;
  if (fee <= 2000) return 45000;
  if (fee <= 3000) return 60000;
  if (fee <= 5000) return 90000;
  return 125000;
}

function perksFor(profile: ProfileId, fee: number, network: Network): Perks | undefined {
  const p: Perks = {};
  if (network === "rupay") p.upi = true;
  if (profile === "premium") {
    p.domesticLounge = fee >= 10000 ? "Unlimited domestic lounge visits (demo)" : "12 domestic visits/year (demo)";
    p.intlLounge = fee >= 10000 ? "Unlimited international via Priority Pass (demo)" : "8 international visits/year (demo)";
    if (fee >= 5000) p.golf = "4 complimentary golf games/quarter (demo)";
    if (fee >= 10000) p.metal = true;
  } else if (profile === "miles") {
    p.domesticLounge = fee >= 2000 ? "12 domestic visits/year (demo)" : "4 domestic visits/year (demo)";
    if (fee >= 3000) p.intlLounge = "6 international visits/year (demo)";
    if (fee >= 5000) p.metal = true;
  } else if (fee >= 5000) {
    p.domesticLounge = "8 domestic visits/year (demo)";
    p.intlLounge = "4 international visits/year (demo)";
    p.metal = true;
  } else if (fee >= 2000) {
    p.domesticLounge = "8 domestic visits/year (milestone spend, demo)";
  } else if (fee >= 1000) {
    p.domesticLounge = "4 domestic visits/year (milestone spend, demo)";
  }
  return Object.keys(p).length > 0 ? p : undefined;
}

const usedSlugs = new Set<string>();
function uniqueSlug(base: string): string {
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);
  return slug;
}

/**
 * Expanded catalog. Same DemoCard shape as the curated list; all rates are
 * demo-estimated and clearly labeled — never presented as verified terms.
 */
export const GENERATED_CARDS: DemoCard[] = SPECS.map(
  ([issuer, name, profile, fee, network]) => {
    const slug = uniqueSlug(`${norm(issuer)}-${norm(name)}`);
    const h = hash(slug);
    const net: Network =
      network ??
      (profile === "secured" || profile === "upi" ? "rupay" : h % 2 === 0 ? "visa" : "mastercard");
    const prof = PROFILES[profile];
    return {
      slug,
      issuer,
      name,
      network: net,
      annualFee: fee,
      joiningFee: fee,
      renewalFeeWaiver: fee > 0 ? "Fee waived above typical annual spend milestone (demo)" : undefined,
      rewardType: profile === "miles" ? "miles" : profile === "premium" ? "points" : "cashback",
      art: prof.block,
      highlight: prof.headline,
      categories: prof.categories,
      rules: rulesFor(slug, profile),
      perks: perksFor(profile, fee, net),
      eligibility: eligibilityFor(profile, fee),
      status: "estimated",
      provenance: ruleProv(),
    };
  },
);
