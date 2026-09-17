import { useQuery } from "convex/react";
import { Link } from "react-router";
import {
  ArrowRight,
  BellRing,
  Brain,
  Calculator,
  ChartLine,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/AppShell";
import { getDemoCard, getProgram } from "@/lib/catalog";

export default function Insights() {
  const insights = useQuery(api.insights.walletInsights, {});
  const walletState = useQuery(api.wallets.getWalletState, {});

  if (insights === undefined || walletState === undefined) {
    return (
      <AppShell usage={null}>
        <Skeleton className="h-96" />
      </AppShell>
    );
  }

  if (insights === null || walletState === null) {
    return (
      <AppShell usage={null}>
        <div className="nb-card p-10 text-center">
          <h2 className="font-display text-xl font-bold">
            Unable to load insights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please sign in again to refresh your session.
          </p>
          <Button asChild className="mt-5">
            <Link to="/auth">Go to sign in</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { cardCount, activeCardCount, totalPoints, cashbackBalance, expiring, monthlySpend, topCategory } = insights;
  const inactive = cardCount - activeCardCount;

  // Deterministic annual-fee drag: fees of all owned cards
  const annualFees = walletState.cards.reduce(
    (sum, c) => sum + (getDemoCard(c.slug)?.annualFee ?? 0),
    0,
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Mode 7 — Wallet analyzer
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
            Analyze my wallet
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every number below is computed deterministically from your wallet
            and demo rules. Descriptions are plain language — the AI never
            invents figures.
          </p>
        </div>

        {cardCount === 0 ? (
          <div className="nb-card p-12 text-center">
            <h2 className="font-display text-xl font-bold">Nothing to analyze yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add cards to your wallet first.
            </p>
            <Button asChild className="mt-5">
              <Link to="/wallet">
                Go to wallet <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="nb-card nb-lift p-5">
                <ChartLine className="size-5" />
                <h2 className="font-display mt-2 text-lg font-bold">
                  Largest reward opportunity
                </h2>
                {topCategory ? (
                  <>
                    <p className="mt-2 text-sm leading-relaxed">
                      Based on the spending profile you entered
                      {monthlySpend > 0
                        ? ` (₹${monthlySpend.toLocaleString("en-IN")}/month)`
                        : ""}
                      , your largest reward opportunity appears to be{" "}
                      <strong>{topCategory.label}</strong>. At demo e-commerce
                      rates (5% up to caps), roughly ₹
                      {Math.round(monthlySpend * 0.3).toLocaleString("en-IN")} of
                      monthly spend in that category could earn an estimated{" "}
                      <strong>
                        ₹{topCategory.estMonthlyBenefit.toLocaleString("en-IN")}
                      </strong>{" "}
                      per month.
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Supporting math: ₹
                      {Math.round(monthlySpend * 0.3).toLocaleString("en-IN")} ×
                      5% = ₹{topCategory.estMonthlyBenefit.toLocaleString("en-IN")}
                      . Assumes monthly spend share of 30% and demo caps.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Unable to calculate accurately with the available
                    information — set a monthly spend in your wallet first.
                  </p>
                )}
              </div>

              <div className="nb-card nb-lift p-5">
                <BellRing className="size-5" />
                <h2 className="font-display mt-2 text-lg font-bold">
                  Expiring rewards
                </h2>
                {expiring.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {expiring.map((e) => (
                      <li
                        key={e.programId}
                        className="nb-flat flex items-center justify-between gap-2 bg-block-orange p-2.5 text-sm"
                      >
                        <span className="font-semibold">
                          {getProgram(e.programId)?.name ?? e.programId}
                        </span>
                        <span className="tnum font-bold">
                          {e.points.toLocaleString("en-IN")} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nothing expiring in the next 60 days that we know of.
                  </p>
                )}
              </div>

              <div className="nb-card nb-lift p-5">
                <Calculator className="size-5" />
                <h2 className="font-display mt-2 text-lg font-bold">
                  Annual fee drag
                </h2>
                <p className="tnum font-display mt-2 text-3xl font-bold">
                  ₹{annualFees.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Total annual fees across {cardCount} card
                  {cardCount === 1 ? "" : "s"} in your wallet. Your rewards need
                  to clear this before you're net positive — the optimizer's
                  per-purchase estimates are what compound against it.
                </p>
              </div>
            </div>

            <section className="nb-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display flex items-center gap-2 text-lg font-bold">
                    <Brain className="size-4" /> Wallet snapshot
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You currently have {cardCount} card{cardCount === 1 ? "" : "s"}
                    {inactive > 0 ? `, ${inactive} of them paused` : ""}. Total
                    known points: {totalPoints.toLocaleString("en-IN")} · cashback
                    balance ₹{cashbackBalance.toLocaleString("en-IN")}.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="blue" className="capitalize">
                    {activeCardCount} active
                  </Badge>
                  {inactive > 0 && <Badge variant="secondary">{inactive} paused</Badge>}
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                These are directional estimates from demo data — not financial
                advice. Verify rates with your issuer before making decisions.
              </p>
            </section>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/optimize">
                  <Sparkles className="size-4" /> Run an optimization
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/wallet">Edit spending profile</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
