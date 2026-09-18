import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeIndianRupee,
  Brain,
  Info,
  Loader2,
  RotateCcw,
  Store,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardVisual } from "@/components/CardVisual";
import { AppShell } from "@/components/AppShell";
import { FreeLimitDialog } from "@/components/FreeLimitDialog";
import {
  CATEGORIES,
  DEMO_MERCHANTS,
  categoryEmoji,
  getDemoCard,
} from "@/lib/catalog";
import type { MethodEvaluation, OptimizeResult } from "@/lib/engine";
import { cn } from "@/lib/utils";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const LOADING_STAGES = [
  "Checking your wallet…",
  "Evaluating card rewards…",
  "Checking offer eligibility…",
  "Calculating reward caps…",
  "Comparing payment methods…",
];

function Rupee({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("tnum", className)}>
      ₹{value.toLocaleString("en-IN")}
    </span>
  );
}

function BenefitRow({
  label,
  value,
  bold = false,
  accent = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span
        className={cn(
          "text-sm",
          bold ? "font-display font-bold uppercase tracking-wide" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tnum text-sm font-bold",
          accent && "font-display text-lg",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MethodRow({
  method,
  rank,
}: {
  method: MethodEvaluation;
  rank?: number;
}) {
  return (
    <div className="nb-card nb-lift flex items-center gap-4 p-4">
      <div className="w-44 shrink-0 sm:w-52">
        <CardVisual card={getDemoCard(method.slug)!} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display font-bold">
            {method.issuer} {method.name}
          </p>
          {rank === 1 && <Badge variant="green">Best</Badge>}
          {method.offer && (
            <Badge variant="purple" title={method.offer.title}>
              + offer
            </Badge>
          )}
        </div>
        <div className="tnum mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            Cashback <Rupee value={method.cashback} className="font-bold text-foreground" />
          </span>
          <span>
            Points <span className="font-bold text-foreground">{method.points.toLocaleString("en-IN")}</span>
          </span>
          <span>
            Offer{" "}
            <Rupee value={method.offer?.benefit ?? 0} className="font-bold text-foreground" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total est. benefit
          </span>
          <span className="tnum font-display text-lg font-bold">
            <Rupee value={method.totalBenefit} />
          </span>
          <span className="text-xs text-muted-foreground">
            → effective <Rupee value={method.effectiveCost} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Optimize() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const walletState = useQuery(api.wallets.getWalletState, {});
  const runOptimize = useAction(api.optimizations.purchaseOptimize);
  const explain = useAction(api.optimizations.explainRecommendation);

  const [merchant, setMerchant] = useState(params.get("merchant") ?? "Amazon");
  const [amount, setAmount] = useState(params.get("amount") ?? "12000");
  const [category, setCategory] = useState(params.get("category") ?? "ecommerce");
  const [channel, setChannel] = useState(params.get("channel") ?? "online");
  const [date, setDate] = useState(params.get("date") ?? todayISO());

  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [usage, setUsage] = useState<{ freeRunsUsed: number; limit: number; plan: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const autoRan = useRef(false);

  // autorun support from dashboard
  useEffect(() => {
    if (autoRan.current) return;
    if (params.get("autorun") === "1" && walletState !== undefined && walletState !== null) {
      if (walletState.cards.length === 0) {
        toast.error("Add a card to your wallet first");
        navigate("/wallet");
        return;
      }
      autoRan.current = true;
      void handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletState]);

  // staged loading messages — reset the timer (not state) when the run starts
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1)), 700);
    return () => clearInterval(t);
  }, [running]);

  async function handleRun() {
    const amt = Number(amount);
    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a merchant and a valid amount.");
      return;
    }
    setRunning(true);
    setStage(0);
    setShowWhy(false);
    setAiText(null);
    setAiError(null);
    try {
      const res = await runOptimize({
        merchantName: merchant.trim(),
        amount: amt,
        category,
        dateISO: date,
        channel,
      });
      setResult(res.result);
      setUsage(res.usage);
      toast.success(
        `Best option: ${res.result.best ? `${res.result.best.issuer} ${res.result.best.name}` : "none"} — estimated benefit ₹${(res.result.best?.totalBenefit ?? 0).toLocaleString("en-IN")}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("FREE_LIMIT_REACHED")) {
        setLimitOpen(true);
      } else if (msg.includes("NO_ACTIVE_CARDS")) {
        toast.error("Add an active card to your wallet first.");
        navigate("/wallet");
      } else {
        // Client-friendly copy — raw Convex error dumps never reach the user.
        const clean = /Enter a valid amount|Merchant name is required|Not signed in/.test(msg)
          ? msg
          : "Couldn't run the optimization right now. Please try again.";
        toast.error(clean);
      }
    } finally {
      setRunning(false);
    }
  }

  async function handleWhy() {
    if (!result) return;
    setShowWhy((v) => !v);
    if (aiText || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await explain({ result });
      setAiText(res.explanation);
    } catch {
      setAiError(
        "AI explanation is unavailable right now — the deterministic breakdown below is always exact.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  const used = usage?.freeRunsUsed ?? walletState?.wallet.freeRunsUsed ?? 0;
  const limit = usage?.limit ?? walletState?.runLimit ?? 3;
  const remaining = Math.max(0, limit - used);

  return (
    <AppShell usage={usage}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Purchase optimizer
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
            Find the best way to pay
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Deterministic rules engine evaluates every card and offer in your
            wallet. The AI explains results — it never does the math.
          </p>
        </div>

        {/* usage strip */}
        <div className="nb-flat flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-2.5 text-sm">
          <span>
            <span className="tnum font-bold">{remaining}</span> of {limit} AI
            optimizations remaining this month
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link to="/pricing">
              Upgrade <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {/* INPUT */}
        <section className="nb-card p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Store className="size-3" /> Merchant
              </span>
              <Input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                list="merchant-suggestions-opt"
                placeholder="Amazon"
              />
              <datalist id="merchant-suggestions-opt">
                {DEMO_MERCHANTS.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <BadgeIndianRupee className="size-3" /> Amount (₹)
              </span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="tnum"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full cursor-pointer border-2 border-line bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Date
                </span>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="tnum"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Channel
                </span>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="h-10 w-full cursor-pointer border-2 border-line bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="online">Online</option>
                  <option value="offline">In-store</option>
                </select>
              </label>
            </div>
          </div>
          <Button
            size="lg"
            className="mt-5 w-full sm:w-auto"
            onClick={handleRun}
            disabled={running || !merchant.trim() || !Number(amount)}
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Optimizing…
              </>
            ) : (
              <>
                <Zap className="size-4" /> Find Best Way To Pay
              </>
            )}
          </Button>
        </section>

        {/* LOADING */}
        {running && (
          <section className="nb-card p-6">
            <ul className="space-y-2.5">
              {LOADING_STAGES.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-2.5 text-sm transition-opacity",
                    i < stage ? "text-foreground" : i === stage ? "font-semibold" : "opacity-40",
                  )}
                >
                  {i < stage ? (
                    <span className="nb-flat flex size-5 items-center justify-center bg-block-green text-[10px] font-bold">✓</span>
                  ) : i === stage ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* RESULT */}
        {result && !running && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5"
          >
            {result.best ? (
              <section className="nb-card nb-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-1.5 bg-block-lime" />
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="nb-flat bg-block-lime px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                        Best available option
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {categoryEmoji(result.purchase.category)} {result.merchant.name} ·{" "}
                        <Rupee value={result.purchase.amount} />
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleWhy}>
                      <Brain className="size-3.5" />
                      {showWhy ? "Hide AI why" : "Why? (AI)"}
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
                    <CardVisual
                      card={getDemoCard(result.best.slug)!}
                      className="w-full"
                    />
                    <div>
                      <h2 className="font-display text-2xl font-bold tracking-tight">
                        {result.best.issuer} {result.best.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                        Highest calculated benefit among the payment methods
                        currently available in your wallet.
                      </p>
                      <div className="mt-4 divide-y divide-dashed divide-line/40">
                        <BenefitRow
                          label="Purchase"
                          value={`₹${result.purchase.amount.toLocaleString("en-IN")}`}
                        />
                        <BenefitRow
                          label="Estimated cashback"
                          value={`₹${result.best.cashback.toLocaleString("en-IN")}`}
                        />
                        <BenefitRow
                          label="Eligible offer"
                          value={`₹${(result.best.offer?.benefit ?? 0).toLocaleString("en-IN")}`}
                        />
                        <BenefitRow
                          label="Points"
                          value={
                            result.best.points > 0
                              ? `${result.best.points.toLocaleString("en-IN")}${result.best.pointsValue > 0 ? ` (₹${result.best.pointsValue.toLocaleString("en-IN")} value)` : ""}`
                              : "0"
                          }
                        />
                        <BenefitRow
                          label="Total estimated benefit"
                          value={`₹${result.best.totalBenefit.toLocaleString("en-IN")}`}
                          bold
                        />
                        <BenefitRow
                          label="Effective cost"
                          value={`₹${result.best.effectiveCost.toLocaleString("en-IN")}`}
                          bold
                          accent
                        />
                      </div>
                    </div>
                  </div>

                  {/* WHY */}
                  {showWhy && (
                    <div className="mt-6 border-t-2 border-dashed border-line/50 pt-5">
                      {aiLoading && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" /> Savvy
                          is grounding the explanation in your numbers…
                        </p>
                      )}
                      {aiError && (
                        <p className="flex items-start gap-2 text-sm text-destructive">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {aiError}
                        </p>
                      )}
                      {aiText && (
                        <div className="nb-flat bg-secondary p-4 text-sm leading-relaxed whitespace-pre-line">
                          {aiText}
                        </div>
                      )}

                      <h3 className="font-display mt-4 text-sm font-bold uppercase tracking-wider">
                        Exact calculation steps
                      </h3>
                      <ul className="tnum mt-2 space-y-1.5 text-sm">
                        {result.best.steps.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="nb-flat mt-0.5 flex size-5 shrink-0 items-center justify-center bg-block-blue text-[10px] font-bold">
                              {i + 1}
                            </span>
                            {s}
                          </li>
                        ))}
                      </ul>

                      <h3 className="font-display mt-4 text-sm font-bold uppercase tracking-wider">
                        Assumptions
                      </h3>
                      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
                        {[...result.best.assumptions, ...result.assumptions].map((a, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Info className="mt-0.5 size-3 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>

                      {result.warnings.length > 0 && (
                        <>
                          <h3 className="font-display mt-4 text-sm font-bold uppercase tracking-wider">
                            Warnings
                          </h3>
                          <ul className="mt-2 space-y-1 text-xs text-destructive">
                            {result.warnings.map((w, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <TriangleAlert className="mt-0.5 size-3 shrink-0" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className="nb-card p-6">
                <h2 className="font-display text-xl font-bold">No eligible option found</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  None of your active cards matched this purchase. Try another
                  category or amount, or add more cards.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/wallet">
                    Go to wallet <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </section>
            )}

            {/* ALTERNATIVES */}
            {result.alternatives.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Other cards in your wallet, compared
                </h2>
                <div className="mt-3 space-y-3">
                  {result.alternatives.map((m) => (
                    <MethodRow key={m.slug} method={m} />
                  ))}
                </div>
              </section>
            )}

            {/* OUTSIDE-WALLET DISCOVERY */}
            {result.catalogSuggestions.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Not in your wallet yet — could earn more here
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deterministic catalog estimates for cards you don't own. Demo
                  terms — verify with the issuer before applying.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {result.catalogSuggestions.map((s) => (
                    <div key={s.slug} className="nb-flat bg-card p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {s.issuer}
                      </p>
                      <p className="font-display text-sm font-bold">{s.name}</p>
                      <p className="tnum font-display mt-1 text-lg font-bold text-primary">
                        ₹{s.estimatedBenefit.toLocaleString("en-IN")}
                      </p>
                      <p className="tnum text-[10px] text-muted-foreground">
                        est. benefit · fee ₹{s.annualFee.toLocaleString("en-IN")}/yr
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {s.why}
                      </p>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/wallet">
                    Browse the 200+ card catalog <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </section>
            )}

            {/* source status */}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Source status: {result.sourceStatus.cards} · {result.sourceStatus.offers} ·{" "}
              {result.sourceStatus.rates}. Estimated values are not guarantees.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setAiText(null);
                }}
              >
                <RotateCcw className="size-4" /> New search
              </Button>
            </div>
          </motion.section>
        )}
      </div>
      <FreeLimitDialog open={limitOpen} onOpenChange={setLimitOpen} />
    </AppShell>
  );
}
