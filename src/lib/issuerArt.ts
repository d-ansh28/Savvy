/**
 * Issuer brand kit for card visuals.
 *
 * Every Indian issuer gets a brand-accurate colorway (navy HDFC, orange Scapia,
 * teal Amazon, burgundy Axis, Amex blue box, etc.) so generated card faces look
 * like the real product instead of generic blocks. Art remains a stylized
 * visual, NOT official bank artwork — official images can be attached per card
 * via `DemoCard.imageUrl` where licensing permits.
 */

import type { DemoCard, Network } from "./catalog";

export interface CardArt {
  /** Gradient start (top-left). */
  from: string;
  /** Gradient end (bottom-right). */
  to: string;
  /** Accent color for slashes/highlights. */
  accent: string;
  /** Text/ink color. */
  ink: string;
  /** Optional dark top band (Scapia-style) with the issuer wordmark. */
  band?: string;
  /** Subtle brand pattern strength 0–1 (diagonal texture). */
  texture?: number;
}

interface IssuerBrand {
  match: string[]; // substrings, lowercase, matched against issuer name
  art: CardArt;
}

const BRANDS: IssuerBrand[] = [
  {
    match: ["hdfc"],
    art: {
      from: "#0a2a4d",
      to: "#134a77",
      accent: "#e63946",
      ink: "#f4f8fc",
      texture: 0.14,
    },
  },
  {
    match: ["scapia"],
    art: {
      from: "#f4502a",
      to: "#dd3d18",
      accent: "#12261c",
      ink: "#ffffff",
      band: "#181818",
      texture: 0.1,
    },
  },
  {
    match: ["sbi"],
    art: {
      from: "#1b2050",
      to: "#333a9e",
      accent: "#9ecdf7",
      ink: "#f5f7ff",
      texture: 0.12,
    },
  },
  {
    match: ["icici", "amazon"],
    art: {
      from: "#6a2537",
      to: "#b0432c",
      accent: "#f6a21e",
      ink: "#fdf6ef",
      texture: 0.12,
    },
  },
  {
    match: ["axis"],
    art: {
      from: "#7a1140",
      to: "#a81b58",
      accent: "#f2c1cf",
      ink: "#fdf2f6",
      texture: 0.12,
    },
  },
  {
    match: ["airtel"],
    art: {
      from: "#c8101a",
      to: "#8e0a12",
      accent: "#ffd8d8",
      ink: "#fff5f5",
      texture: 0.1,
    },
  },
  {
    match: ["flipkart"],
    art: {
      from: "#1a54c4",
      to: "#2874f0",
      accent: "#ffe11b",
      ink: "#f2f7ff",
      texture: 0.12,
    },
  },
  {
    match: ["swiggy"],
    art: {
      from: "#e05e00",
      to: "#fc8019",
      accent: "#ffffff",
      ink: "#fffaf4",
      texture: 0.1,
    },
  },
  {
    match: ["zomato"],
    art: {
      from: "#b02836",
      to: "#e23744",
      accent: "#ffd5d9",
      ink: "#fff5f6",
      texture: 0.1,
    },
  },
  {
    match: ["makemytrip", "indigo", "6e "],
    art: {
      from: "#c21f30",
      to: "#8f1626",
      accent: "#ffd23f",
      ink: "#fff6f2",
      texture: 0.1,
    },
  },
  {
    match: ["tata neu"],
    art: {
      from: "#16213e",
      to: "#1f2f57",
      accent: "#f0b90b",
      ink: "#f4f7ff",
      texture: 0.12,
    },
  },
  {
    match: ["idfc"],
    art: {
      from: "#2e1a49",
      to: "#4c2c72",
      accent: "#ff6d38",
      ink: "#f8f4ff",
      texture: 0.12,
    },
  },
  {
    match: ["kotak"],
    art: {
      from: "#8e1620",
      to: "#d5232f",
      accent: "#00aeef",
      ink: "#fff5f5",
      texture: 0.12,
    },
  },
  {
    match: ["indusind"],
    art: {
      from: "#1c2b4a",
      to: "#35507e",
      accent: "#f2a03d",
      ink: "#f4f7fc",
      texture: 0.12,
    },
  },
  {
    match: ["yes bank", "kiwi"],
    art: {
      from: "#0b2660",
      to: "#143c8c",
      accent: "#e63329",
      ink: "#f2f6ff",
      texture: 0.12,
    },
  },
  {
    match: ["au small"],
    art: {
      from: "#3c1144",
      to: "#6d2077",
      accent: "#ffc857",
      ink: "#faf3ff",
      texture: 0.12,
    },
  },
  {
    match: ["rbl"],
    art: {
      from: "#0f2f5c",
      to: "#123f7a",
      accent: "#ffd23f",
      ink: "#f2f7ff",
      texture: 0.12,
    },
  },
  {
    match: ["standard chartered"],
    art: {
      from: "#00325e",
      to: "#0056a3",
      accent: "#00b74f",
      ink: "#f0f8ff",
      texture: 0.12,
    },
  },
  {
    match: ["hsbc"],
    art: {
      from: "#a00010",
      to: "#db0011",
      accent: "#ffffff",
      ink: "#fff5f5",
      texture: 0.1,
    },
  },
  {
    match: ["bank of baroda"],
    art: {
      from: "#0b2b55",
      to: "#123f7a",
      accent: "#f2a03d",
      ink: "#f4f7fc",
      texture: 0.12,
    },
  },
  {
    match: ["american express", "amex"],
    art: {
      from: "#004c8f",
      to: "#016fd0",
      accent: "#ffffff",
      ink: "#f2f8ff",
      texture: 0.08,
    },
  },
  {
    match: ["federal"],
    art: {
      from: "#0d3b12",
      to: "#1b5e20",
      accent: "#f5b31e",
      ink: "#f2faf2",
      texture: 0.12,
    },
  },
  {
    match: ["uni cards", " uni "],
    art: {
      from: "#4834d4",
      to: "#6c5ce7",
      accent: "#ffeaa7",
      ink: "#f6f5ff",
      texture: 0.12,
    },
  },
  {
    match: ["super.money"],
    art: {
      from: "#0e6655",
      to: "#16a085",
      accent: "#d4ff00",
      ink: "#f0fff9",
      texture: 0.1,
    },
  },
  {
    match: ["onecard", "csb"],
    art: {
      from: "#111111",
      to: "#2d3436",
      accent: "#fdcb6e",
      ink: "#f7f7f7",
      texture: 0.1,
    },
  },
  {
    match: ["jupiter"],
    art: {
      from: "#00856a",
      to: "#00b894",
      accent: "#ffffff",
      ink: "#f0fffa",
      texture: 0.1,
    },
  },
  {
    match: ["dbs"],
    art: {
      from: "#7e0a1c",
      to: "#c4122f",
      accent: "#ffd5d9",
      ink: "#fff5f6",
      texture: 0.1,
    },
  },
  {
    match: ["formerly citi", "citi"],
    art: {
      from: "#052c4c",
      to: "#003b70",
      accent: "#e60a2e",
      ink: "#f2f8ff",
      texture: 0.1,
    },
  },
  {
    match: ["fi federal", "fi "],
    art: {
      from: "#0f3d3a",
      to: "#16655f",
      accent: "#9df3e4",
      ink: "#f0fffd",
      texture: 0.1,
    },
  },
  {
    match: ["paytm"],
    art: {
      from: "#042e6f",
      to: "#0a4cab",
      accent: "#00f2d6",
      ink: "#f0fbff",
      texture: 0.1,
    },
  },
  {
    match: ["idbi", "karnataka", "city union", "saraswat", "j&k", "uco", "central bank", "punjab", "canara", "union bank", "bank of india", "indian bank", "bank of maharashtra", "south indian"],
    art: {
      from: "#152b47",
      to: "#1e3a5f",
      accent: "#f26522",
      ink: "#f2f6fc",
      texture: 0.12,
    },
  },
];

const DEFAULT_ART: CardArt = {
  from: "#1d1d21",
  to: "#3a3a42",
  accent: "#c8f04e",
  ink: "#fafafa",
  texture: 0.1,
};

/** Brand art for an issuer (case-insensitive substring match). */
export function issuerArt(issuer: string): CardArt {
  const q = issuer.toLowerCase();
  for (const b of BRANDS) {
    if (b.match.some((m) => q.includes(m))) return b.art;
  }
  return DEFAULT_ART;
}

/**
 * Official-look card faces for the most recognizable India cards.
 * Each entry is a hand-tuned stylization that mirrors the REAL card design
 * (colors, bands, partner wordmarks, pattern direction) so users instantly
 * recognize which physical card they're looking at. This is still generated
 * art — not scraped bank artwork — so it's safe to ship and stays crisp at
 * every size. Cards not in this map keep their issuer brand art.
 */
export interface OfficialArt {
  /** Card face background (CSS gradient stops). */
  bg: string;
  /** Top band color or undefined for full-bleed faces. */
  band?: string;
  /** Partner wordmark rendered on the face, e.g. "scapia", "swiggy", "amazon". */
  wordmark?: string;
  wordmarkColor?: string;
  /** Secondary partner rendered left, e.g. "Federal Bank". */
  coBrand?: string;
  coBrandColor?: string;
  /** Optional face motif: diagonal / rings / diamond / plane etc. */
  motif?: "diagonal" | "rings" | "diamond" | "wave" | "dots" | "none";
  motifColor?: string;
  /** Text color on the face. */
  ink: string;
  /** Reward currency label shown bottom-right, e.g. "SCAPIA COINS". */
  rewardLabel?: string;
}

export const OFFICIAL_FACES: Record<string, OfficialArt> = {
  "scapia-federal": {
    bg: "linear-gradient(160deg, #1a1a1a 0%, #1a1a1a 26%, #ff4d24 26%, #f0411b 100%)",
    band: undefined,
    coBrand: "Federal Bank",
    coBrandColor: "#ffb400",
    wordmark: "scapia",
    wordmarkColor: "#ffffff",
    motif: "wave",
    motifColor: "#ffd6c9",
    ink: "#ffffff",
    rewardLabel: "SCAPIA COINS",
  },
  "swiggy-hdfc": {
    bg: "linear-gradient(150deg, #fc8019 0%, #e05e00 100%)",
    wordmark: "swiggy",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "dots",
    motifColor: "rgba(255,255,255,0.25)",
    rewardLabel: "CASHBACK",
  },
  "icici-amazonpay": {
    bg: "linear-gradient(150deg, #232f3e 0%, #37475a 55%, #ff9900 55%, #f08804 100%)",
    coBrand: "amazon pay",
    coBrandColor: "#ffffff",
    wordmark: "ICICI",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "diagonal",
    motifColor: "rgba(255,153,0,0.35)",
    rewardLabel: "AMAZON PAY BALANCE",
  },
  "axis-flipkart": {
    bg: "linear-gradient(155deg, #2874f0 0%, #1a54c4 100%)",
    coBrand: "flipkart",
    coBrandColor: "#ffe11b",
    wordmark: "MASTERCARD",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "diagonal",
    motifColor: "rgba(255,225,27,0.25)",
    rewardLabel: "CASHBACK",
  },
  "airtel-axis": {
    bg: "linear-gradient(150deg, #e40000 0%, #a80f0f 100%)",
    coBrand: "airtel",
    coBrandColor: "#ffffff",
    wordmark: "axis",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "rings",
    motifColor: "rgba(255,255,255,0.3)",
    rewardLabel: "Airtel Thanks REWARDS",
  },
  "phonepe-sbi-select": {
    bg: "linear-gradient(150deg, #5f259f 0%, #3d1a6b 100%)",
    coBrand: "phonepe",
    coBrandColor: "#ffffff",
    wordmark: "SBI Card SELECT",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "diamond",
    motifColor: "rgba(255,255,255,0.2)",
    rewardLabel: "CASHBACK",
  },
  "axis-atlas": {
    bg: "linear-gradient(160deg, #101418 0%, #2b3440 100%)",
    wordmark: "ATLAS",
    wordmarkColor: "#d5dee9",
    ink: "#ffffff",
    motif: "wave",
    motifColor: "rgba(120,180,255,0.35)",
    rewardLabel: "EDGE MILES",
  },
  "hdfc-millennia": {
    bg: "linear-gradient(150deg, #0a2a4d 0%, #134a77 60%, #1d6aa8 100%)",
    wordmark: "MILLENNIA",
    wordmarkColor: "#cfe4ff",
    ink: "#ffffff",
    motif: "diagonal",
    motifColor: "rgba(200,240,78,0.22)",
    rewardLabel: "CASHBACK",
  },
  "hdfc-infinia-metal": {
    bg: "linear-gradient(155deg, #0b0b0d 0%, #26262b 60%, #3d3d42 100%)",
    wordmark: "INFINIA",
    wordmarkColor: "#ffd84d",
    ink: "#ffffff",
    motif: "rings",
    motifColor: "rgba(255,216,77,0.25)",
    rewardLabel: "SMARTBUY POINTS",
  },
  "hdfc-regalia-gold": {
    bg: "linear-gradient(150deg, #3b2f1a 0%, #8a6d3b 100%)",
    wordmark: "REGALIA GOLD",
    wordmarkColor: "#ffd84d",
    ink: "#ffffff",
    motif: "diamond",
    motifColor: "rgba(255,216,77,0.3)",
    rewardLabel: "REWARD POINTS",
  },
  "hdfc-diners-black": {
    bg: "linear-gradient(160deg, #14110b 0%, #3a3428 100%)",
    wordmark: "DINERS CLUB BLACK",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "wave",
    motifColor: "rgba(255,255,255,0.15)",
    rewardLabel: "5X POINTS",
  },
  "tata-neu-hdfc": {
    bg: "linear-gradient(155deg, #16213e 0%, #1f2f57 100%)",
    coBrand: "tata neu",
    coBrandColor: "#f0b90b",
    wordmark: "HDFC BANK",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "dots",
    motifColor: "rgba(240,185,11,0.25)",
    rewardLabel: "NEUCOINS",
  },
  "sbi-cashback": {
    bg: "linear-gradient(150deg, #1b2050 0%, #333a9e 100%)",
    wordmark: "SBI CASHBACK",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "diagonal",
    motifColor: "rgba(158,205,247,0.25)",
    rewardLabel: "5% CASHBACK",
  },
  "sbi-bpcl-octane": {
    bg: "linear-gradient(150deg, #cc0000 0%, #7a0a0a 100%)",
    coBrand: "BPCL",
    coBrandColor: "#ffd23f",
    wordmark: "SBI Card OCTANE",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "rings",
    motifColor: "rgba(255,210,63,0.3)",
    rewardLabel: "FUEL POINTS",
  },
  "indusind-tiger": {
    bg: "linear-gradient(155deg, #f57c1f 0%, #c2570a 100%)",
    wordmark: "TIGER",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "diagonal",
    motifColor: "rgba(255,255,255,0.25)",
    rewardLabel: "CLUB REWARDS",
  },
  "kiwi-yes": {
    bg: "linear-gradient(150deg, #00c46a 0%, #01794a 100%)",
    coBrand: "kiwi",
    coBrandColor: "#ffffff",
    wordmark: "YES BANK",
    wordmarkColor: "#d7ffef",
    ink: "#ffffff",
    motif: "rings",
    motifColor: "rgba(255,255,255,0.3)",
    rewardLabel: "NEON CASHBACK",
  },
  "idfc-first-wealth": {
    bg: "linear-gradient(160deg, #101820 0%, #2a3a4a 100%)",
    wordmark: "FIRST WEALTH",
    wordmarkColor: "#8ef0c8",
    ink: "#ffffff",
    motif: "wave",
    motifColor: "rgba(142,240,200,0.3)",
    rewardLabel: "10X POINTS",
  },
  "idfc-first-select": {
    bg: "linear-gradient(150deg, #2e1a49 0%, #4c2c72 100%)",
    wordmark: "FIRST SELECT",
    wordmarkColor: "#ff8a5c",
    ink: "#ffffff",
    motif: "diamond",
    motifColor: "rgba(255,138,92,0.25)",
    rewardLabel: "10X POINTS",
  },
  "idfc-first-millennia": {
    bg: "linear-gradient(150deg, #1a2f4d 0%, #2c5a8a 100%)",
    wordmark: "FIRST MILLENNIA",
    wordmarkColor: "#9cc8ff",
    ink: "#ffffff",
    motif: "diagonal",
    motifColor: "rgba(156,200,255,0.22)",
    rewardLabel: "4X UPI POINTS",
  },
  "kotak-fortune-gold": {
    bg: "linear-gradient(150deg, #b8860b 0%, #d4af37 100%)",
    wordmark: "FORTUNE GOLD",
    wordmarkColor: "#fff8dc",
    ink: "#3a2c00",
    motif: "rings",
    motifColor: "rgba(255,255,255,0.35)",
    rewardLabel: "REWARD POINTS",
  },
  "hsbc-visa-platinum": {
    bg: "linear-gradient(150deg, #db0011 0%, #a00010 100%)",
    wordmark: "HSBC",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "none",
    rewardLabel: "REWARDS",
  },
  "amex-mr": {
    bg: "linear-gradient(150deg, #016fd0 0%, #004c8f 100%)",
    wordmark: "AMERICAN EXPRESS",
    wordmarkColor: "#ffffff",
    ink: "#ffffff",
    motif: "diamond",
    motifColor: "rgba(255,255,255,0.2)",
    rewardLabel: "MR POINTS",
  },
  "uni-urban": {
    bg: "linear-gradient(150deg, #4834d4 0%, #6c5ce7 100%)",
    wordmark: "uni",
    wordmarkColor: "#ffeaa7",
    ink: "#ffffff",
    motif: "rings",
    motifColor: "rgba(255,234,167,0.3)",
    rewardLabel: "COINS",
  },
  "supermoney": {
    bg: "linear-gradient(150deg, #0e6655 0%, #16a085 100%)",
    wordmark: "super.money",
    wordmarkColor: "#d4ff00",
    ink: "#ffffff",
    motif: "dots",
    motifColor: "rgba(212,255,0,0.3)",
    rewardLabel: "CASHBACK",
  },
  "onecard": {
    bg: "linear-gradient(160deg, #111111 0%, #2d3436 100%)",
    wordmark: "one card",
    wordmarkColor: "#fdcb6e",
    ink: "#ffffff",
    motif: "rings",
    motifColor: "rgba(253,203,110,0.3)",
    rewardLabel: "ONE CASHBACK",
  },
  "icici-coral-rupay": {
    bg: "linear-gradient(150deg, #6a2537 0%, #b0432c 100%)",
    wordmark: "CORAL",
    wordmarkColor: "#ffd5d9",
    ink: "#ffffff",
    motif: "diagonal",
    motifColor: "rgba(255,213,217,0.25)",
    rewardLabel: "PAYBACK POINTS",
  },
  "axis-magnus": {
    bg: "linear-gradient(160deg, #1c1c22 0%, #3a3a46 100%)",
    wordmark: "MAGNUS",
    wordmarkColor: "#c0c8ff",
    ink: "#ffffff",
    motif: "wave",
    motifColor: "rgba(160,180,255,0.3)",
    rewardLabel: "EDGE MILES",
  },
  "bob-eterna": {
    bg: "linear-gradient(155deg, #0b2b55 0%, #1d4f8a 100%)",
    wordmark: "ETERNAL",
    wordmarkColor: "#ffd27a",
    ink: "#ffffff",
    motif: "diamond",
    motifColor: "rgba(255,210,122,0.25)",
    rewardLabel: "EDGE REWARDS",
  },
};

/**
 * Merge brand art with a card's own curated art: brand gradient + texture win,
 * curated accent/ink are preserved when present.
 */
export function artFor(card: DemoCard): CardArt {
  const brand = issuerArt(card.issuer);
  return {
    from: brand.from,
    to: brand.to,
    accent: card.art?.accent ?? brand.accent,
    ink: card.art?.ink ?? brand.ink,
    band: brand.band,
    texture: brand.texture ?? 0.1,
  };
}

/** Render data for network marks (true logo geometry/colors). */
export const NETWORK_MARK: Record<
  Network,
  { kind: "wordmark" | "circles" | "box" | "rupay"; text: string; color: string; second?: string }
> = {
  visa: { kind: "wordmark", text: "VISA", color: "#ffffff" },
  mastercard: {
    kind: "circles",
    text: "mastercard",
    color: "#eb001b",
    second: "#f79e1b",
  },
  amex: { kind: "box", text: "AMEX", color: "#ffffff" },
  rupay: { kind: "rupay", text: "RuPay", color: "#f26522", second: "#0a8a3a" },
  diners: { kind: "wordmark", text: "DINERS CLUB", color: "#ffffff" },
};
