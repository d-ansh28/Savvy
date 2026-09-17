import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { Brain, Loader2, Send, Sparkles, User } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { bestCardsForPurchase, categoryGapAnalysis } from "@/lib/engine";
import {
  DEMO_CARDS,
  DEMO_MERCHANTS,
  OFFERS,
  type Category,
} from "@/lib/catalog";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const QUICK_PROMPTS = [
  "Which of my cards is best for dining?",
  "Am I wasting any rewards?",
  "How can I use my points?",
  "What benefits haven't I used?",
];

export default function Assistant() {
  const walletState = useQuery(api.wallets.getWalletState, {});
  const insights = useQuery(api.insights.walletInsights, {});
  const explain = useAction(api.optimizations.explainRecommendation);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi! I'm Savvy. I can explain your wallet, cards and rewards using your actual data. I never invent rates or do hidden math — numbers come from the deterministic engine. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);

    // Deterministic wallet + full-catalog context — always attached, never hallucinated.
    const ws = walletState ?? null;
    const ins = insights ?? null;
    const snapshot = ws && ins ? buildSnapshot(ws, ins) : null;

    try {
      const res = await explain({
        result: {
          context: "freeform wallet question",
          walletSnapshot: snapshot,
          guidelines:
            "Answer ONLY from walletSnapshot (which includes a `catalog` section ranking the best card per category across the full demo catalog). Use catalog.bestPerCategory when the user asks which card is best for a category even if they don't own it. If the answer needs data that is not in the snapshot (live offers, partner transfers, real issuer terms), say: Unable to calculate accurately with the available information.",
        },
        question,
      });
      setMessages((m) => [...m, { role: "assistant", text: res.explanation }]);
    } catch {
      // Grounded fallback: deterministic local answer, no AI needed.
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: ws && ins
            ? `${groundedFallback(question, ws, ins)}\n\n(AI service was unavailable — this answer came from your deterministic wallet data.)`
            : "Your wallet is still loading. Please try again in a moment.",
        },
      ]);
      toast.error("AI unavailable — answered from your wallet data instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-14rem)] min-h-[480px] max-w-3xl flex-col">
        <div className="flex items-center gap-2">
          <span className="nb-flat flex size-9 items-center justify-center bg-block-purple">
            <Brain className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              AI Wallet Assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              Grounded in your wallet · never fabricates rates
            </p>
          </div>
        </div>

        <div className="nb-card mt-4 flex flex-1 flex-col overflow-hidden">
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex items-start gap-2.5", m.role === "user" && "flex-row-reverse")}
              >
                <span
                  className={cn(
                    "nb-flat flex size-8 shrink-0 items-center justify-center",
                    m.role === "assistant" ? "bg-block-lime" : "bg-block-blue",
                  )}
                >
                  {m.role === "assistant" ? <Sparkles className="size-4" /> : <User className="size-4" />}
                </span>
                <div
                  className={cn(
                    "max-w-[80%] border-2 border-line px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                    m.role === "assistant" ? "bg-secondary" : "bg-block-blue",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <p className="flex items-center gap-2 pl-11 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Thinking with your wallet data…
              </p>
            )}
          </div>

          <div className="border-t-2 border-line p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void send(p)}
                  disabled={busy}
                  className="nb-flat cursor-pointer bg-card px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Try: "Which card for Amazon ₹12,000?"'
                disabled={busy}
              />
              <Button type="submit" disabled={busy || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

type WalletStateData = NonNullable<
  ReturnType<typeof useQuery<typeof api.wallets.getWalletState>>
>;
type InsightsData = {
  monthlySpend: number;
  topCategory: { label: string } | null;
  cashbackBalance: number;
  totalPoints: number;
  expiring: { programId: string; points: number }[];
};

function buildSnapshot(ws: WalletStateData, ins: InsightsData) {
  // Full-catalog deterministic context so the AI can answer "which card is
  // best for X" across ALL cards — not just the wallet.
  const ownedSlugs = ws.cards.map((c) => c.slug);
  const gaps = categoryGapAnalysis(DEMO_CARDS, OFFERS, DEMO_MERCHANTS, ownedSlugs);
  const catalog = {
    totalCards: DEMO_CARDS.length,
    bestPerCategory: gaps.map((g) => ({
      category: g.categoryLabel,
      bestCard: g.catalogBest.name,
      issuer: g.catalogBest.issuer,
      estBenefit: Math.round(g.catalogBest.totalBenefit),
      sampleAmount: g.sampleAmount,
      ownedAlternative: g.ownedBest?.name ?? null,
      monthlyGapIfUpgraded: Math.round(g.monthlyGap),
    })),
    topUpgrades: [...gaps]
      .sort((a, b) => b.monthlyGap - a.monthlyGap)
      .slice(0, 3)
      .map((g) => `${g.categoryLabel}: ${g.catalogBest.name} (+₹${Math.round(g.monthlyGap)}/mo vs your best)`),
  };
  return {
    cards: ws.cards.map((c) => c.slug),
    activeCards: ws.cards.filter((c) => c.active).map((c) => c.slug),
    balances: ws.balances.map((b) => ({
      program: b.programId,
      points: b.points,
      expiresAt: b.expiresAt,
      expiringPoints: b.expiringPoints,
    })),
    monthlySpend: ins.monthlySpend,
    topCategory: ins.topCategory?.label ?? null,
    cashbackBalance: ins.cashbackBalance,
    totalPoints: ins.totalPoints,
    freeRunsUsed: ws.wallet.freeRunsUsed,
    runLimit: ws.runLimit,
    plan: ws.wallet.plan,
    catalog,
  };
}

function groundedFallback(
  question: string,
  ws: { cards: { slug: string; active: boolean }[]; balances: { programId: string; points: number }[] },
  ins: { totalPoints: number; cashbackBalance: number; expiring: { programId: string; points: number }[] },
): string {
  const q = question.toLowerCase();
  const lines: string[] = [];

  // Catalog-wide category matching for "best card for X" questions.
  const CATEGORY_HINTS: [keywords: string[], category: Category][] = [
    [["dining", "food", "restaurant", "swiggy", "zomato"], "dining"],
    [["grocer", "bigbasket", "blinkit", "zepto", "instamart"], "groceries"],
    [["amazon", "flipkart", "ecommerce", "online shop"], "ecommerce"],
    [["flight", "air", "indigo", "vistara"], "flights"],
    [["hotel", "stay", "oyo", "airbnb"], "hotels"],
    [["fuel", "petrol", "diesel", "hp", "bpcl", "iocl"], "fuel"],
    [["movie", "netflix", "subscription", "ott"], "subscriptions"],
    [["shop", "myntra", "ajio", "tata cliq"], "shopping"],
  ];
  const hinted = CATEGORY_HINTS.find(([kws]) => kws.some((k) => q.includes(k)));

  if (q.includes("wasting") || q.includes("expir")) {
    if (ins.expiring.length > 0) {
      lines.push(
        `You have ${ins.expiring
          .map((e) => `${e.points.toLocaleString("en-IN")} points in ${e.programId}`)
          .join(", ")} expiring soon — that's the value at risk.`,
      );
    } else {
      lines.push("Nothing in your wallet is flagged as expiring in the next 60 days.");
    }
  }

  if (hinted) {
    const category = hinted[1];
    const rows = bestCardsForPurchase(
      {
        merchantName: "",
        amount: 10000,
        category,
        dateISO: new Date().toISOString().slice(0, 10),
        channel: "online",
      },
      DEMO_CARDS,
      OFFERS,
      DEMO_MERCHANTS,
      ws.cards.map((c) => c.slug),
      3,
    );
    if (rows.length > 0) {
      const owned = rows.find((r) => r.owned);
      lines.push(
        `Across all ${DEMO_CARDS.length} catalog cards, the top picks for ${category} spend are: ${rows
          .map(
            (r, i) =>
              `${i + 1}. ${r.name} (${r.issuer})${r.owned ? " — in your wallet" : ""} — est. ₹${Math.round(r.totalBenefit).toLocaleString("en-IN")} on ₹10,000`,
          )
          .join(" ")}.${owned ? "" : " None of these are in your wallet yet — adding the top one could lift your returns."}`,
      );
      lines.push(
        "Run a Purchase Optimization on a specific amount to get the exact math with caps and offers applied.",
      );
    }
  } else if (q.includes("points") || q.includes("redeem")) {
    lines.push(
      `You're tracking ${ins.totalPoints.toLocaleString("en-IN")} total points across ${ws.balances.length} program(s), including ₹${ins.cashbackBalance.toLocaleString("en-IN")} cashback. Open the Rewards Vault for per-program redemption scenarios.`,
    );
  } else if (lines.length === 0) {
    lines.push(
      `You currently have ${ws.cards.length} card(s) and ${ins.totalPoints.toLocaleString("en-IN")} points tracked. For a specific purchase, use the Purchase Optimizer — it evaluates every card's rates, caps and eligible offers deterministically.`,
    );
  }
  return lines.join("\n\n");
}
