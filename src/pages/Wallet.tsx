import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  CreditCard,
  Plus,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
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
  categoryEmoji,
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
  { id: "lowfee", label: "Low fee" },
] as const;

export default function Wallet() {
  const walletState = useQuery(api.wallets.getWalletState, {});
  const seedDemo = useMutation(api.wallets.seedDemoWallet);
  const addCard = useMutation(api.wallets.addCard);
  const removeCard = useMutation(api.wallets.removeCard);
  const setCardActive = useMutation(api.wallets.setCardActive);
  const addBalance = useMutation(api.wallets.addRewardBalance);
  const removeBalance = useMutation(api.wallets.removeRewardBalance);
  const setSpend = useMutation(api.wallets.setMonthlySpend);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [last4, setLast4] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [spendDraft, setSpendDraft] = useState<string | null>(null);

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
    if (query && !`${c.issuer} ${c.name}`.toLowerCase().includes(query.toLowerCase()))
      return false;
    if (filter === "all") return true;
    if (filter === "cashback") return c.rewardType === "cashback";
    if (filter === "travel")
      return c.categories.includes("travel") || c.categories.includes("flights");
    if (filter === "dining") return c.categories.includes("dining");
    if (filter === "fuel") return c.categories.includes("fuel");
    if (filter === "lowfee") return c.annualFee <= 1000;
    return true;
  });

  const handleAdd = async (slug: string) => {
    try {
      const res = await addCard({ slug, last4: last4 || undefined });
      if (res.added) {
        toast.success("Card added to your wallet");
        setAddOpen(false);
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
              Every card with its fee, reward structure and caps — data-driven
              from the demo catalog. Toggle cards to include/exclude them from
              optimization.
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

        {/* ADD PANEL */}
        {addOpen && (
          <section className="nb-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-56">
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
                placeholder="Last 4 digits (optional)"
                className="tnum w-44"
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
                return (
                  <div key={card.slug} className="nb-card nb-lift flex flex-col p-4">
                    <CardVisual card={card} last4={owned ? "4242" : undefined} />
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {card.issuer}
                    </p>
                    <p className="font-display text-lg leading-tight font-bold">
                      {card.name}
                    </p>
                    <p className="mt-1 text-xs font-medium">{card.highlight}</p>
                    <p className="tnum mt-2 text-xs text-muted-foreground">
                      {card.annualFee === 0
                        ? "No annual fee"
                        : `₹${card.annualFee.toLocaleString("en-IN")} annual fee`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {card.categories.slice(0, 3).map((cat) => (
                        <Badge key={cat} variant="secondary">
                          {categoryEmoji(cat)} {cat}
                        </Badge>
                      ))}
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
                Add your first card to unlock purchase optimization, or load
                the demo wallet to explore instantly.
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
                      {demo.rules.slice(0, 2).map((r) => (
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
            User-provided balances, stored per program. Enter what you know —
            everything else stays optional.
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

          {/* add balance */}
          <div className="mt-4 flex flex-wrap gap-2">
            {DEMO_PROGRAMS.filter((p) => !ownedSlugs.has(`prog-${p.id}`)).map((p) => {
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
                    toast.success(`${p.name} added with 10,000 pts — edit below anytime`);
                  }}
                  className="nb-flat nb-lift cursor-pointer bg-card px-3 py-2 text-xs font-bold uppercase tracking-wide"
                >
                  <Plus className="mr-1 inline size-3" /> Add {p.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* SPEND PROFILE */}
        <section className="nb-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="nb-flat flex size-9 items-center justify-center bg-block-blue">
                <Calendar className="size-4" />
              </span>
              <div>
                <p className="font-display font-bold">Monthly spend profile</p>
                <p className="text-xs text-muted-foreground">
                  Optional — powers category-cap math and insights. Demo
                  categories: {CATEGORIES.slice(0, 4).map((c) => c.label).join(", ")}…
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={spendDraft ?? (profile?.monthlySpend ? String(profile.monthlySpend) : "")}
                onChange={(e) => setSpendDraft(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="e.g. 40000"
                className="tnum w-36"
                inputMode="numeric"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const v = Number(spendDraft ?? profile?.monthlySpend ?? 0);
                  void setSpend({ monthlySpend: v });
                  toast.success("Monthly spend updated");
                  setSpendDraft(null);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
