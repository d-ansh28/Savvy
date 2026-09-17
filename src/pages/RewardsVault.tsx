import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  Calculator,
  Check,
  Gift,
  Info,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/AppShell";
import { CardVisual } from "@/components/CardVisual";
import { bestEarnersForRewardKind } from "@/lib/engine";
import { DEMO_CARDS, DEMO_PROGRAMS, getProgram } from "@/lib/catalog";

interface Scenario {
  label: string;
  emoji: string;
  /** Multiplier of the program's per-point value (deterministic catalog math). */
  multiplier: number;
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
      intro:
        "Cashback balances auto-credit to your statement — no redemption needed.",
      scenarios: [
        {
          label: "Statement credit",
          emoji: "🧾",
          multiplier: 1,
          estValue: points,
          valuePerPoint: 1,
          conditions: "Auto-applied quarterly. ₹1 cashback = ₹1.",
          status: "estimated",
        },
      ],
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
        multiplier: 1,
        estValue: Math.round(points * pv),
        valuePerPoint: pv,
        conditions: "Partner voucher catalog via rewards portal (catalog rate).",
        status: "estimated",
      },
      {
        label: "Statement credit",
        emoji: "🧾",
        multiplier: 0.6,
        estValue: Math.round(points * pv * 0.6),
        valuePerPoint: Math.round(pv * 0.6 * 100) / 100,
        conditions:
          "Cash-out routes typically value points lower (catalog: 60% of voucher rate).",
        status: "estimated",
      },
      {
        label: "Travel booking",
        emoji: "✈️",
        multiplier: 1.1,
        estValue: Math.round(points * pv * 1.1),
        valuePerPoint: Math.round(pv * 1.1 * 100) / 100,
        conditions:
          "Travel portal bookings can exceed voucher value on select routes (catalog estimate).",
        status: "estimated",
      },
      {
        label: "Transfer to partners",
        emoji: "🤝",
        multiplier: 0,
        estValue: null,
        valuePerPoint: null,
        conditions:
          "Transfer ratios and partner award values vary — needs verification against live partner charts.",
        status: "needs_verification",
      },
    ],
  };
}

export default function RewardsVault() {
  const walletState = useQuery(api.wallets.getWalletState, {});
  const addBalance = useMutation(api.wallets.addRewardBalance);
  const removeBalance = useMutation(api.wallets.removeRewardBalance);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [calcProgram, setCalcProgram] = useState<string | null>(null);
  const [calcPoints, setCalcPoints] = useState("");

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
  const missingPrograms = DEMO_PROGRAMS.filter(
    (p) => !balances.some((b) => b.programId === p.id),
  );

  const saveEdit = async (programId: string) => {
    const value = Math.round(Number(editDraft));
    if (!Number.isFinite(value) || value < 0 || value > 100_000_000) {
      toast.error("Enter a valid balance (0 – 10,00,00,000)");
      return;
    }
    try {
      await addBalance({
        programId,
        points: value,
        note: "User-provided (editable)",
      });
      toast.success("Balance updated");
      setEditing(null);
    } catch {
      toast.error("Couldn't update the balance. Try again.");
    }
  };

  const handleRemove = async (programId: string, name: string) => {
    try {
      await removeBalance({ programId });
      toast.success(`${name} removed`);
    } catch {
      toast.error("Couldn't remove the program. Try again.");
    }
  };

  const handleAddProgram = async (programId: string, name: string) => {
    try {
      await addBalance({
        programId,
        points: 10000,
        note: "User-provided (edit anytime)",
      });
      toast.success(`${name} added with 10,000 pts — edit anytime`);
    } catch {
      toast.error("Couldn't add the program. Try again.");
    }
  };

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
              Not just balances — what you can actually do with them. Edit
              balances, simulate redemptions and see the exact math for every
              scenario. Nothing is invented; missing data says so.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/wallet">Manage in wallet</Link>
          </Button>
        </div>

        {balances.length === 0 ? (
          <div className="nb-card p-12 text-center">
            <Gift className="mx-auto size-10 text-muted-foreground" />
            <h2 className="font-display mt-3 text-xl font-bold">
              No rewards added yet
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Add a reward program below to see redemption scenarios,
              value-per-point math and expiry alerts.
            </p>
          </div>
        ) : null}

        {/* ADD PROGRAM CHIPS */}
        {missingPrograms.length > 0 && (
          <section className="nb-card p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">
              Add a reward program
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Balances are user-provided (status: user provided) — edit them
              anytime to match your actual balance.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingPrograms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void handleAddProgram(p.id, p.name)}
                  className="nb-flat nb-lift cursor-pointer bg-card px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-secondary"
                >
                  <Plus className="mr-1 inline size-3" /> {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

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
            /** Which catalog cards earn this reward currency fastest? */
            const earners = program
              ? bestEarnersForRewardKind(program.kind, DEMO_CARDS, 4)
              : [];
            const calcOpen = calcProgram === b.programId;
            const calcValue = Math.round(Number(calcPoints));
            const calcValid =
              Number.isFinite(calcValue) && calcValue >= 0 && calcValue <= b.points;
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
                    {editing === b.programId ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={editDraft}
                          autoFocus
                          onChange={(e) =>
                            setEditDraft(e.target.value.replace(/[^\d]/g, ""))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEdit(b.programId);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="tnum h-9 w-40"
                          inputMode="numeric"
                          aria-label="New balance"
                        />
                        <Button
                          size="sm"
                          className="h-9"
                          onClick={() => void saveEdit(b.programId)}
                        >
                          <Check className="size-3.5" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="tnum font-display text-3xl font-bold">
                          {b.points.toLocaleString("en-IN")}{" "}
                          <span className="text-base font-semibold text-muted-foreground">
                            {kindLabel}
                          </span>
                        </p>
                        <button
                          onClick={() => {
                            setEditing(b.programId);
                            setEditDraft(String(b.points));
                          }}
                          className="nb-flat nb-lift flex cursor-pointer items-center gap-1 bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                          title="Edit balance"
                        >
                          <Pencil className="size-3" /> Edit
                        </button>
                      </div>
                    )}
                    {b.expiresAt && (
                      <Badge variant="destructive" className="mt-2">
                        <TriangleAlert className="size-3" />
                        {b.expiringPoints?.toLocaleString("en-IN") ?? "—"} pts
                        exp{" "}
                        {new Date(b.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        program?.status === "user_provided" ? "blue" : "yellow"
                      }
                    >
                      {program?.status === "user_provided"
                        ? "User provided"
                        : "Estimated value"}
                    </Badge>
                    <button
                      onClick={() => {
                        setCalcProgram(calcOpen ? null : b.programId);
                        setCalcPoints("");
                      }}
                      className="nb-flat nb-lift flex cursor-pointer items-center gap-1.5 bg-card px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-secondary"
                    >
                      <Calculator className="size-3.5" />
                      {calcOpen ? "Hide calculator" : "Redemption calculator"}
                    </button>
                    <button
                      onClick={() =>
                        void handleRemove(b.programId, program?.name ?? b.programId)
                      }
                      className="flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-destructive hover:underline"
                    >
                      <Trash2 className="size-3" /> Remove
                    </button>
                  </div>
                </div>

                {/* REDEMPTION CALCULATOR */}
                {calcOpen && (
                  <div className="nb-flat mt-4 bg-secondary p-4">
                    <p className="font-display text-xs font-bold uppercase tracking-wider">
                      Simulate a redemption (deterministic)
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        value={calcPoints}
                        onChange={(e) =>
                          setCalcPoints(e.target.value.replace(/[^\d]/g, ""))
                        }
                        placeholder={`Points to redeem (max ${b.points.toLocaleString("en-IN")})`}
                        className="tnum h-9 max-w-64 flex-1"
                        inputMode="numeric"
                      />
                      <span className="text-xs text-muted-foreground">
                        {calcPoints === ""
                          ? "Enter an amount"
                          : calcValid
                            ? `Redeeming ${calcValue.toLocaleString("en-IN")} ${kindLabel}`
                            : `Max ${b.points.toLocaleString("en-IN")} ${kindLabel}`}
                      </span>
                    </div>
                    {calcValid && calcPoints !== "" && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {(built?.scenarios ?? [])
                          .filter(
                            (s): s is Scenario & { estValue: number } =>
                              s.estValue !== null,
                          )
                          .map((s) => {
                            const value = Math.round(
                              (s.estValue / Math.max(1, b.points)) * calcValue,
                            );
                            return (
                              <div
                                key={s.label}
                                className="nb-flat bg-card p-3"
                              >
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                  {s.emoji} {s.label}
                                </p>
                                <p className="tnum font-display text-lg font-bold">
                                  ₹{value.toLocaleString("en-IN")}
                                </p>
                                <p className="tnum text-[10px] text-muted-foreground">
                                  ₹
                                  {(
                                    Math.round(
                                      (s.valuePerPoint ?? 0) * 100,
                                    ) / 100
                                  ).toFixed(2)}
                                  /{kindLabel.replace("pts", "pt")}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Earn this currency fastest — full catalog comparison */}
                {earners.length > 0 && (
                  <div className="mt-5 border-t pt-4">
                    <p className="font-display text-sm font-bold">
                      Earn {program?.kind === "cashback" ? "cashback" : program?.kind === "miles" ? "miles" : "points"} fastest — across all{" "}
                      {DEMO_CARDS.length} catalog cards
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Best base earn rate per ₹10,000 spend at each card's verified
                      catalog rate. Owned cards are marked.
                    </p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {earners.map((e, i) => (
                        <li
                          key={e.slug}
                          className="nb-flat bg-secondary/60 flex items-center gap-3 p-3"
                        >
                          <span className="tnum w-4 text-center text-xs font-black text-muted-foreground">
                            {i + 1}
                          </span>
                          <div className="w-44 shrink-0">
                            <CardVisual card={e.card} compact />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">
                              {e.name}
                              {e.upi ? " · UPI" : ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {e.issuer} · {e.rateLabel}
                              {e.annualFee === 0 ? " · LTF" : ` · ₹${e.annualFee}/yr`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="tnum text-sm font-black">
                              ₹{e.valuePer10k.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              per ₹10k
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                                variant={
                                  s.status === "estimated" ? "green" : "orange"
                                }
                              >
                                {s.status === "estimated"
                                  ? "Estimated"
                                  : "Needs verification"}
                              </Badge>
                            </div>
                            <p className="tnum mt-2 text-sm">
                              <strong>
                                {b.points.toLocaleString("en-IN")}
                              </strong>{" "}
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
                                    (₹{s.valuePerPoint}/
                                    {kindLabel.replace("pts", "pt")})
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
        </div>

        {balances.length === 0 && missingPrograms.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            All catalog programs added.
          </p>
        )}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          Redemption values are catalog estimates computed deterministically from
          the program's stated per-point value — never from live partner data.
          Savvy will not guess where data is missing.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/optimize">
              Optimize a purchase <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
