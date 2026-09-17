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
