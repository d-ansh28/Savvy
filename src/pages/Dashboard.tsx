import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BellRing,
  Calendar,
  CreditCard,
  IndianRupee,
  Sparkles,
  Store,
  Tag,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { CardVisual } from "@/components/CardVisual";
import {
  CATEGORIES,
  DEMO_MERCHANTS,
  OFFERS,
  categoryEmoji,
  getDemoCard,
  getProgram,
} from "@/lib/catalog";
import { useAuth } from "@/hooks/use-auth";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Captured once at module load — avoids impure Date.now() during render. */
const MODULE_LOAD_TIME = Date.now();

function StatBlock({
  value,
  label,
  block,
  icon: Icon,
}: {
  value: string;
  label: string;
  block: string;
  icon: typeof Zap;
}) {
  return (
    <div className={`nb-flat ${block} p-4`}>
      <div className="flex items-center justify-between">
        <p className="tnum font-display text-2xl font-bold tracking-tight">
          {value}
        </p>
        <Icon className="size-5 opacity-60" />
      </div>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-70">
        {label}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const walletState = useQuery(api.wallets.getWalletState, {});
  const seedDemo = useMutation(api.wallets.seedDemoWallet);

  const [merchant, setMerchant] = useState("Amazon");
  const [amount, setAmount] = useState("12000");
  const [category, setCategory] = useState("ecommerce");
  const [seeding, setSeeding] = useState(false);

  const activeOffers = useMemo(() => {
    const today = todayISO();
    return OFFERS.filter((o) => today >= o.startsAt && today <= o.endsAt);
  }, []);

  const expiring = useMemo(() => {
    if (!walletState) return [];
    // Expiry window is computed at module scope (not during render) to keep
    // the render pure; a fresh page load refreshes the threshold.
    const now = MODULE_LOAD_TIME;
    return walletState.balances
      .filter(
        (b) =>
          b.expiresAt &&
          new Date(b.expiresAt).getTime() - now < 60 * 24 * 3600 * 1000,
      )
      .map((b) => ({
        program: getProgram(b.programId),
        points: b.expiringPoints ?? b.points,
        expiresAt: b.expiresAt as string,
      }));
  }, [walletState]);

  if (walletState === undefined) {
    return (
      <AppShell usage={null}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-56" />
        </div>
      </AppShell>
    );
  }

  if (walletState === null) {
    return (
      <AppShell usage={null}>
        <Card>
          <CardHeader>
            <CardTitle>Session issue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We couldn't load your wallet. Please sign in again.
            </p>
            <Button className="mt-4" onClick={() => navigate("/auth")}>
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const { wallet, cards, balances, profile, runLimit } = walletState;
  const remaining = Math.max(0, runLimit - wallet.freeRunsUsed);
  const isEmpty = cards.length === 0 && balances.length === 0;

  const totalPoints = balances.reduce((s, b) => s + b.points, 0);
  const cashbackBalance = balances
    .filter((b) => b.programId.includes("cashback"))
    .reduce((s, b) => s + b.points, 0);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo({});
    } finally {
      setSeeding(false);
    }
  };

  const runOptimize = () => {
    const amt = Number(amount);
    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) return;
    navigate(
      `/optimize?merchant=${encodeURIComponent(merchant.trim())}&amount=${amt}&category=${category}&channel=online&date=${todayISO()}&autorun=1`,
    );
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Heading */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Your Wallet
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {user?.name ? `Hey ${user.name},` : "Hey there,"} here's the
              picture.
            </h1>
          </div>
          {isPaidBadge(wallet)}
        </div>

        {isEmpty ? (
          /* EMPTY STATE */
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your wallet is empty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add your first card to start optimizing purchases, or load a
                demo wallet with 4 cards and 3 reward balances to explore the
                product instantly.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/wallet">
                    <CreditCard className="size-4" /> Add your first card
                  </Link>
                </Button>
                <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                  <Sparkles className="size-4" />
                  {seeding ? "Loading demo wallet…" : "Load demo wallet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* STATS */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatBlock
                value={`${cards.length}`}
                label="Cards in wallet"
                block="bg-block-blue"
                icon={CreditCard}
              />
              <StatBlock
                value={totalPoints.toLocaleString("en-IN")}
                label="Known reward points"
                block="bg-block-purple"
                icon={Sparkles}
              />
              <StatBlock
                value={`₹${cashbackBalance.toLocaleString("en-IN")}`}
                label="Cashback balance"
                block="bg-block-green"
                icon={IndianRupee}
              />
              <StatBlock
                value={`${activeOffers.length + expiring.length}`}
                label="Active opportunities"
                block="bg-block-yellow"
                icon={Tag}
              />
            </div>

            {/* USAGE */}
            <div className="nb-flat flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3">
              <p className="text-sm font-medium">
                {wallet.plan === "free" ? (
                  <>
                    <span className="tnum font-bold">{remaining} of {runLimit}</span>{" "}
                    free optimizations remaining this month.
                  </>
                ) : (
                  <>
                    <span className="font-bold capitalize">{wallet.plan}</span> plan
                    — {runLimit} AI optimizations / month.
                  </>
                )}
              </p>
              <Button asChild variant="ghost" size="sm">
                <Link to="/pricing">
                  Upgrade <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>

            {/* OPTIMIZE BOX */}
            <section className="nb-card nb-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 h-full w-1.5 bg-block-lime" />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="nb-flat flex size-9 items-center justify-center bg-block-lime">
                    <Zap className="size-5" />
                  </span>
                  <h2 className="font-display text-2xl font-bold tracking-tight">
                    Optimize My Purchase
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter what you're about to buy. The rules engine evaluates
                  every card and offer in your wallet and shows the best way to
                  pay — with the math.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Store className="size-3" /> Merchant
                    </span>
                    <Input
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="Amazon"
                      list="merchant-suggestions"
                    />
                    <datalist id="merchant-suggestions">
                      {DEMO_MERCHANTS.map((m) => (
                        <option key={m.id} value={m.name} />
                      ))}
                    </datalist>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <IndianRupee className="size-3" /> Amount
                    </span>
                    <Input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      placeholder="12000"
                      className="tnum"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Category
                    </span>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.emoji} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="flex items-end">
                    <Button
                      size="lg"
                      className="w-full lg:w-auto"
                      onClick={runOptimize}
                      disabled={!merchant.trim() || !Number(amount)}
                    >
                      <Zap className="size-4" /> Find Best Way To Pay
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* EXPIRING REWARDS */}
            {expiring.length > 0 && (
              <section>
                <div className="flex items-center gap-2">
                  <BellRing className="size-4 text-destructive" />
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    Expiring soon
                  </h2>
                  <Badge variant="destructive">{expiring.length}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {expiring.map((e) => (
                    <div
                      key={e.program?.id ?? e.expiresAt}
                      className="nb-flat flex items-center justify-between gap-3 bg-block-orange p-4"
                    >
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                          {e.program?.name ?? "Reward program"}
                        </p>
                        <p className="tnum font-display text-xl font-bold">
                          {e.points.toLocaleString("en-IN")} pts
                        </p>
                      </div>
                      <div className="text-right">
                        <TriangleAlert className="ml-auto size-4" />
                        <p className="tnum text-xs font-bold">
                          {new Date(e.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ACTIVE OFFERS */}
            <section>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="size-4" />
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    Active offers
                  </h2>
                  <Badge variant="yellow">Demo data</Badge>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/offers">
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {activeOffers.slice(0, 6).map((o) => {
                  const merch = DEMO_MERCHANTS.find((m) => m.id === o.merchantId);
                  return (
                    <div key={o.id} className="nb-card nb-lift p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="nb-flat bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {categoryEmoji(merch?.category ?? "other")} {merch?.name}
                        </span>
                        <Badge variant={o.kind === "coupon" ? "purple" : "green"}>
                          {o.kind}
                        </Badge>
                      </div>
                      <p className="mt-2.5 text-sm leading-snug font-semibold">
                        {o.title}
                      </p>
                      <p className="tnum mt-2 text-[11px] text-muted-foreground">
                        Min ₹{o.minAmount.toLocaleString("en-IN")} · up to ₹
                        {o.maxBenefit.toLocaleString("en-IN")} · ends{" "}
                        {new Date(o.endsAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* CARDS ROW */}
            <section>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  Your cards
                </h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/wallet">
                    Manage wallet <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => {
                  const demo = getDemoCard(c.slug);
                  if (!demo) return null;
                  return (
                    <div key={c._id} className="space-y-2">
                      <CardVisual
                        card={demo}
                        last4={c.cardNumberLast4}
                        compact
                        className={c.active ? "" : "opacity-50 grayscale"}
                      />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {demo.issuer}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SPEND PROFILE */}
            <section className="nb-flat flex flex-wrap items-center justify-between gap-3 bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="nb-flat flex size-9 items-center justify-center bg-block-blue">
                  <Calendar className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">Monthly spend profile</p>
                  <p className="text-xs text-muted-foreground">
                    Used for category cap math in optimizations.
                  </p>
                </div>
              </div>
              <p className="tnum font-display text-xl font-bold">
                {profile?.monthlySpend
                  ? `₹${profile.monthlySpend.toLocaleString("en-IN")}`
                  : "Not set"}
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function isPaidBadge(wallet: { plan: string; subscriptionStatus: string }) {
  return wallet.plan !== "free" && wallet.subscriptionStatus === "active" ? (
    <Badge variant="purple" className="capitalize">{wallet.plan} member</Badge>
  ) : (
    <Badge variant="secondary">Free plan</Badge>
  );
}
