import { useQuery } from "convex/react";
import { Link } from "react-router";
import { ArrowRight, Gift, Info, Sparkles, TriangleAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/AppShell";
import { getProgram } from "@/lib/catalog";

interface Scenario {
  label: string;
  emoji: string;
  pointsRequired: number;
  estValue: number | null;
  valuePerPoint: number | null;
  conditions: string;
  status: "estimated" | "needs_verification";
}

function buildScenarios(
  programId: string,
  points: number,
): { intro: string; scenarios: Scenario[] } | null {
  const program = getProgram(programId);
  if (!program) return null;

  if (program.kind === "cashback") {
    return {
      intro: "Cashback balances auto-credit to your statement — no redemption needed.",
      scenarios: [
        {
          label: "Statement credit",
          emoji: "🧾",
          pointsRequired: points,
          estValue: points,
          valuePerPoint: 1,
          conditions: "Auto-applied quarterly (demo). 1 point = ₹1.",
          status: "user_provided" as const,
        },
      ].map((s) => ({ ...s, status: "estimated" as const })),
    };
  }

  const pv = program.demoPointValue;
  if (!pv) {
    return {
      intro:
        "Redemption value unavailable — add or verify the reward program details.",
      scenarios: [],
    };
  }

  return {
    intro: `Demo scenarios for ${program.name} based on an estimated value of ₹${pv}/point. Verify current rates before redeeming.`,
    scenarios: [
      {
        label: "Vouchers",
        emoji: "🎁",
        pointsRequired: points,
        estValue: Math.round(points * pv),
        valuePerPoint: pv,
        conditions: "Partner voucher catalog via rewards portal (demo rate).",
        status: "estimated" as const,
      },
      {
        label: "Statement credit",
        emoji: "🧾",
        pointsRequired: points,
        estValue: Math.round(points * pv * 0.6),
        valuePerPoint: Math.round(pv * 0.6 * 100) / 100,
        conditions: "Cash-out routes typically value points lower (demo: 60% of voucher rate).",
        status: "estimated" as const,
      },
      {
        label: "Travel booking",
        emoji: "✈️",
        pointsRequired: points,
        estValue: Math.round(points * pv * 1.1),
        valuePerPoint: Math.round(pv * 1.1 * 100) / 100,
        conditions: "Travel portal bookings can exceed voucher value on select routes (demo estimate).",
        status: "estimated" as const,
      },
      {
        label: "Transfer to partners",
        emoji: "🤝",
        pointsRequired: points,
        estValue: null,
        valuePerPoint: null,
        conditions:
          "Transfer ratios and partner award values vary — needs verification against live partner charts.",
        status: "needs_verification" as const,
      },
    ],
  };
}

export default function RewardsVault() {
  const walletState = useQuery(api.wallets.getWalletState, {});

  if (walletState === undefined) {
    return (
      <AppShell usage={null}>
        <Skeleton className="h-96" />
      </AppShell>
    );
  }

  if (walletState === null) {
    return (
      <AppShell usage={null}>
        <div className="nb-card p-10 text-center">
          <h2 className="font-display text-xl font-bold">
            Unable to load rewards
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

  const { balances } = walletState;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Mode 4 — Rewards vault
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
              Your rewards
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Not just balances — what you can actually do with them. Every
              scenario shows the math, conditions and source status. Nothing is
              invented; missing data says so.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/wallet">Manage balances</Link>
          </Button>
        </div>

        {balances.length === 0 ? (
          <div className="nb-card p-12 text-center">
            <Gift className="mx-auto size-10 text-muted-foreground" />
            <h2 className="font-display mt-3 text-xl font-bold">
              No rewards added yet
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Add your reward programs in the wallet to see redemption
              scenarios, value-per-point math and expiry alerts.
            </p>
            <Button asChild className="mt-5">
              <Link to="/wallet">
                Add reward program <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {balances.map((b) => {
              const program = getProgram(b.programId);
              const built = buildScenarios(b.programId, b.points);
              const kindLabel =
                program?.kind === "cashback"
                  ? "₹"
                  : program?.kind === "miles"
                    ? "miles"
                    : "pts";
              return (
                <section key={b._id} className="nb-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {program?.issuer}
                      </p>
                      <h2 className="font-display text-2xl font-bold tracking-tight">
                        {program?.name ?? b.programId}
                      </h2>
                      <p className="tnum font-display mt-1 text-3xl font-bold">
                        {b.points.toLocaleString("en-IN")}{" "}
                        <span className="text-base font-semibold text-muted-foreground">
                          {kindLabel}
                        </span>
                      </p>
                      {b.expiresAt && (
                        <Badge variant="destructive" className="mt-2">
                          <TriangleAlert className="size-3" />
                          {b.expiringPoints?.toLocaleString("en-IN") ?? "—"} pts exp{" "}
                          {new Date(b.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant={program?.status === "user_provided" ? "blue" : "yellow"}
                    >
                      {program?.status === "user_provided"
                        ? "User provided"
                        : "Estimated value"}
                    </Badge>
                  </div>

                  {built && (
                    <>
                      <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        {built.intro}
                      </p>
                      {built.scenarios.length > 0 && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {built.scenarios.map((s) => (
                            <div
                              key={s.label}
                              className="nb-flat flex flex-col bg-secondary p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-display text-sm font-bold">
                                  {s.emoji} {s.label}
                                </span>
                                <Badge
                                  variant={s.status === "estimated" ? "green" : "orange"}
                                >
                                  {s.status === "estimated"
                                    ? "Estimated"
                                    : "Needs verification"}
                                </Badge>
                              </div>
                              <p className="tnum mt-2 text-sm">
                                <strong>{s.pointsRequired.toLocaleString("en-IN")}</strong>{" "}
                                {kindLabel} required
                              </p>
                              <p className="tnum text-sm">
                                {s.estValue === null ? (
                                  <span className="text-muted-foreground">
                                    Redemption value unavailable — add or verify
                                    the reward program details.
                                  </span>
                                ) : (
                                  <>
                                    Est. value{" "}
                                    <strong>
                                      ₹{s.estValue.toLocaleString("en-IN")}
                                    </strong>{" "}
                                    <span className="text-xs text-muted-foreground">
                                      (₹{s.valuePerPoint}/{kindLabel.replace("pts", "pt")})
                                    </span>
                                  </>
                                )}
                              </p>
                              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                                {s.conditions}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })}

            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" />
              Redemption values are demo estimates computed deterministically
              from the program's stated per-point value — never from live
              partner data. Savvy will not guess where data is missing.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
