import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  CreditCard,
  Plane,
  Plus,
  Search,
  Smile,
  Sparkles,
  Trash2,
  UserRound,
  WalletCards,
  Waves,
  Wifi,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/AppShell";
import { CardVisual } from "@/components/CardVisual";
import {
  CATEGORIES,
  DEMO_CARDS,
  DEMO_PROGRAMS,
  ROLE_LABELS,
  categoryEmoji,
  checkEligibility,
  getDemoCard,
  getProgram,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "cashback", label: "Cashback" },
  { id: "travel", label: "Travel" },
  { id: "dining", label: "Dining" },
  { id: "fuel", label: "Fuel" },
  { id: "upi", label: "UPI cards" },
  { id: "lounge", label: "Lounge access" },
  { id: "golf", label: "Golf" },
  { id: "ltf", label: "Lifetime free" },
  { id: "student", label: "Student friendly" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const ROLES = ["student", "employee", "self_employed", "business_owner"] as const;

export default function Wallet() {
  const walletState = useQuery(api.wallets.getWalletState, {});
  const seedDemo = useMutation(api.wallets.seedDemoWallet);
  const addCard = useMutation(api.wallets.addCard);
  const removeCard = useMutation(api.wallets.removeCard);
  const setCardActive = useMutation(api.wallets.setCardActive);
  const addBalance = useMutation(api.wallets.addRewardBalance);
  const removeBalance = useMutation(api.wallets.removeRewardBalance);
  const setUserProfile = useMutation(api.wallets.setUserProfile);

  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [last4, setLast4] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [spendDraft, setSpendDraft] = useState<string | null>(null);
  const [incomeDraft, setIncomeDraft] = useState<string | null>(null);

  const ownedSlugs = useMemo(
    () => new Set(walletState?.cards.map((c) => c.slug) ?? []),
    [walletState],
  );

  if (walletState === undefined) {
    return (
      <AppShell usage={null}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-52" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (walletState === null) {
    return (
      <AppShell usage={null}>
        <div className="nb-card p-10 text-center">
          <h2 className="font-display text-xl font-bold">
            Unable to load your wallet
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

  const { cards, balances, profile } = walletState;

  const filteredCatalog = DEMO_CARDS.filter((c) => {
    if (
      query &&
      !`${c.issuer} ${c.name}`.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    switch (filter) {
      case "all":
        return true;
      case "cashback":
        return c.rewardType === "cashback";
      case "travel":
        return c.categories.includes("travel") || c.categories.includes("flights");
      case "dining":
        return c.categories.includes("dining");
      case "fuel":
        return c.categories.includes("fuel");
      case "upi":
        return c.perks?.upi === true;
      case "lounge":
        return !!c.perks?.domesticLounge || !!c.perks?.intlLounge;
      case "golf":
        return !!c.perks?.golf;
      case "ltf":
        return c.annualFee === 0;
      case "student":
        return (
          c.eligibility.minMonthlyIncome === 0 ||
          c.eligibility.minMonthlyIncome <= 20000 ||
          c.eligibility.roles.includes("any")
        );
      default:
        return true;
    }
  });

  const handleAdd = async (slug: string) => {
    try {
      const res = await addCard({ slug, last4: last4 || undefined });
      if (res.added) {
        toast.success("Card added to your wallet");
        setLast4("");
      } else {
        toast.info("That card is already in your wallet");
      }
    } catch {
      toast.error("Couldn't add the card. Please try again.");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo({});
      toast.success("Demo wallet loaded");
    } catch {
      toast.error("Couldn't load the demo wallet.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Mode 2 — Card optimizer
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
              Your wallet
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Browse {DEMO_CARDS.length} real Indian cards (demo terms), add
              the ones you own, and toggle them in and out of optimization.
            </p>
          </div>
          <div className="flex gap-2">
            {cards.length === 0 && (
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                <Sparkles className="size-4" />
                {seeding ? "Loading…" : "Load demo wallet"}
              </Button>
            )}
            <Button onClick={() => setAddOpen((v) => !v)}>
              <Plus className="size-4" /> Add card
            </Button>
          </div>
        </div>

        {/* PROFILE — role & income drive card-fit matching */}
        <section className="nb-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="nb-flat flex size-9 items-center justify-center bg-block-purple">
                <UserRound className="size-4" />
              </span>
              <div>
                <p className="font-display font-bold">Your profile</p>
                <p className="text-xs text-muted-foreground">
                  Optional — powers eligibility badges & card-fit matching.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={profile?.role ?? ""}
                onChange={(e) =>
                  void setUserProfile({
                    role: e.target.value || undefined,
                  })
                }
                className="h-10 cursor-pointer border-2 border-line bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <Input
                value={incomeDraft ?? (profile?.monthlyIncome ? String(profile.monthlyIncome) : "")}
                onChange={(e) => setIncomeDraft(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Monthly income ₹"
                className="tnum w-40"
                inputMode="numeric"
                onBlur={() => {
                  const v = Number(incomeDraft ?? 0);
                  if (incomeDraft !== null && v >= 0) {
                    void setUserProfile({ monthlyIncome: v });
                    toast.success("Income updated");
                    setIncomeDraft(null);
                  }
                }}
              />
              <Input
                value={spendDraft ?? (profile?.monthlySpend ? String(profile.monthlySpend) : "")}
                onChange={(e) => setSpendDraft(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Monthly spend ₹"
                className="tnum w-40"
                inputMode="numeric"
                onBlur={() => {
                  const v = Number(spendDraft ?? 0);
                  if (spendDraft !== null && v >= 0) {
                    void setUserProfile({ monthlySpend: v });
                    toast.success("Monthly spend updated");
                    setSpendDraft(null);
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* ADD PANEL — full catalog */}
        {addOpen && (
          <section className="nb-card p-5">
            <h2 className="font-display text-lg font-bold">
              Card catalog — {filteredCatalog.length} of {DEMO_CARDS.length} cards
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="relative min-w-56 flex-1">
                <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search issuer or card name…"
                  className="pl-9"
                />
              </div>
              <Input
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Last 4 (optional)"
                className="tnum w-36"
                inputMode="numeric"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "nb-flat cursor-pointer px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                    filter === f.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-card hover:bg-secondary",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCatalog.map((card) => {
                const owned = ownedSlugs.has(card.slug);
                const fit = checkEligibility(
                  card,
                  profile?.role,
                  profile?.monthlyIncome,
                );
                return (
                  <div key={card.slug} className="nb-card nb-lift flex flex-col p-4">
                    <CardVisual card={card} showPerks />
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {card.issuer}
                    </p>
                    <p className="font-display text-lg leading-tight font-bold">
                      {card.name}
                    </p>
                    <p className="mt-1 text-xs font-medium">{card.highlight}</p>

                    {/* perks detail */}
                    <ul className="mt-2 space-y-1">
                      {card.perks?.domesticLounge && (
                        <li className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                          <Smile className="mt-0.5 size-3 shrink-0" />
                          {card.perks.domesticLounge}
                        </li>
                      )}
                      {card.perks?.intlLounge && (
                        <li className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                          <Plane className="mt-0.5 size-3 shrink-0" />
                          {card.perks.intlLounge}
                        </li>
                      )}
                      {card.perks?.golf && (
                        <li className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                          <Waves className="mt-0.5 size-3 shrink-0" />
                          {card.perks.golf}
                        </li>
                      )}
                      {card.perks?.upi && (
                        <li className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                          <Wifi className="mt-0.5 size-3 shrink-0" />
                          Pay via UPI apps (RuPay)
                        </li>
                      )}
                    </ul>

                    <div className="tnum mt-2 text-xs text-muted-foreground">
                      {card.annualFee === 0
                        ? "Lifetime free"
                        : `₹${card.annualFee.toLocaleString("en-IN")} annual fee${card.renewalFeeWaiver ? ` · ${card.renewalFeeWaiver}` : ""}`}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {card.categories.slice(0, 3).map((cat) => (
                        <Badge key={cat} variant="secondary">
                          {categoryEmoji(cat)} {cat}
                        </Badge>
                      ))}
                      {fit.eligible ? (
                        <Badge variant="green">
                          <Check className="size-3" /> Fits your profile
                        </Badge>
                      ) : (
                        <Badge variant="orange" title={fit.reason}>
                          <X className="size-3" /> {fit.reason}
                        </Badge>
                      )}
                    </div>

                    <Button
                      className="mt-3 w-full"
                      variant={owned ? "outline" : "default"}
                      disabled={owned}
                      onClick={() => handleAdd(card.slug)}
                    >
                      {owned ? (
                        <>
                          <Check className="size-4" /> In wallet
                        </>
                      ) : (
                        <>
                          <Plus className="size-4" /> Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
              {filteredCatalog.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No cards match that search/filter.
                </p>
              )}
            </div>
          </section>
        )}

        {/* MY CARDS */}
        <section>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold tracking-tight">
            <CreditCard className="size-5" /> Cards ({cards.length})
          </h2>
          {cards.length === 0 ? (
            <div className="nb-card mt-4 p-10 text-center">
              <WalletCards className="mx-auto size-10 text-muted-foreground" />
              <h3 className="font-display mt-3 text-xl font-bold">
                Your wallet is empty
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Add your first card from the {DEMO_CARDS.length}-card catalog to
                unlock purchase optimization — or load the demo wallet to
                explore instantly.
              </p>
              <Button className="mt-5" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" /> Add your first card
              </Button>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((c) => {
                const demo = getDemoCard(c.slug);
                if (!demo) return null;
                return (
                  <div key={c._id} className="nb-card p-4">
                    <CardVisual
                      card={demo}
                      last4={c.cardNumberLast4}
                      showPerks
                      className={c.active ? "" : "opacity-50 grayscale"}
                    />
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {demo.issuer}
                        </p>
                        <p className="font-display font-bold">{demo.name}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          title={c.active ? "Exclude from optimization" : "Include in optimization"}
                          onClick={() =>
                            setCardActive({ slug: c.slug, active: !c.active })
                          }
                          className={cn(
                            "nb-flat cursor-pointer px-2 py-1 text-[10px] font-bold uppercase",
                            c.active ? "bg-block-green" : "bg-secondary",
                          )}
                        >
                          {c.active ? "Active" : "Paused"}
                        </button>
                        <button
                          title="Remove card"
                          onClick={() => {
                            void removeCard({ slug: c.slug });
                            toast.success("Card removed");
                          }}
                          className="nb-flat cursor-pointer bg-card px-2 py-1 hover:bg-destructive hover:text-white"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium">{demo.highlight}</p>
                    <ul className="mt-2 space-y-1">
                      {demo.rules.slice(0, 3).map((r) => (
                        <li
                          key={r.id}
                          className="tnum text-[11px] leading-snug text-muted-foreground"
                        >
                          • {r.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* REWARD BALANCES */}
        <section>
          <h2 className="font-display mt-2 text-xl font-bold tracking-tight">
            Reward balances
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            User-provided balances, stored per program.
          </p>
          {balances.length === 0 ? (
            <div className="nb-card mt-4 p-10 text-center">
              <h3 className="font-display text-xl font-bold">
                No rewards added yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a reward program below to track points, cashback and
                expiry.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {balances.map((b) => {
                const program = getProgram(b.programId);
                return (
                  <div key={b._id} className="nb-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {program?.issuer}
                        </p>
                        <p className="font-display font-bold">{program?.name ?? b.programId}</p>
                      </div>
                      <button
                        onClick={() => {
                          void removeBalance({ programId: b.programId });
                          toast.success("Reward program removed");
                        }}
                        className="nb-flat cursor-pointer bg-card px-2 py-1 hover:bg-destructive hover:text-white"
                        title="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="tnum font-display mt-2 text-2xl font-bold">
                      {b.points.toLocaleString("en-IN")}{" "}
                      <span className="text-sm font-semibold text-muted-foreground">
                        {program?.kind === "cashback" ? "₹ cashback" : program?.kind ?? "pts"}
                      </span>
                    </p>
                    {b.expiresAt && (
                      <Badge variant="destructive" className="mt-2">
                        {b.expiringPoints?.toLocaleString("en-IN") ?? b.points.toLocaleString("en-IN")} pts expiring{" "}
                        {new Date(b.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </Badge>
                    )}
                    {program?.redemptionNote && (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {program.redemptionNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {DEMO_PROGRAMS.map((p) => {
              const exists = balances.some((b) => b.programId === p.id);
              if (exists) return null;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    void addBalance({
                      programId: p.id,
                      points: 10000,
                      note: "User-provided (edit anytime)",
                    });
                    toast.success(`${p.name} added with 10,000 pts — edit anytime`);
                  }}
                  className="nb-flat nb-lift cursor-pointer bg-card px-3 py-2 text-xs font-bold uppercase tracking-wide"
                >
                  <Plus className="mr-1 inline size-3" /> Add {p.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* CATEGORY REFERENCE */}
        <section className="nb-flat flex flex-wrap items-center gap-3 bg-card p-4 text-xs text-muted-foreground">
          <Calendar className="size-4 shrink-0" />
          <span className="font-semibold text-foreground">Categories:</span>
          {CATEGORIES.map((c) => (
            <span key={c.id}>
              {c.emoji} {c.label}
            </span>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
