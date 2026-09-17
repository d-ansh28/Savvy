import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { BadgeCheck, CalendarDays, Store, Tag, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { CardVisual } from "@/components/CardVisual";
import { api } from "@/convex/_generated/api";
import { bestCardsForPurchase } from "@/lib/engine";
import {
  DEMO_CARDS,
  DEMO_MERCHANTS,
  OFFERS,
  type Offer,
  categoryEmoji,
  getMerchant,
} from "@/lib/catalog";

/** ISO date offset from today — mirrors the catalog's window helpers. */
function isoFromToday(offsetDays: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FILTERS = [
  "All",
  "Shopping",
  "Food",
  "Travel",
  "Hotels",
  "Flights",
  "Electronics",
  "Subscriptions",
  "Fuel",
] as const;

const CATEGORY_GROUP: Record<string, string[]> = {
  Shopping: ["shopping", "ecommerce"],
  Food: ["dining"],
  Travel: ["travel"],
  Hotels: ["hotels"],
  Flights: ["flights"],
  Electronics: ["shopping", "ecommerce"],
  Subscriptions: ["subscriptions"],
  Fuel: ["fuel"],
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Offers() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");

  const walletState = useQuery(api.wallets.getWalletState, {});

  const today = todayISO();

  const active = useMemo(
    () => OFFERS_ACTIVE(),
    [today], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** Offers whose eligible issuers/networks match the user's wallet cards. */
  const mine = useMemo(() => {
    if (!walletState) return [];
    const slugs = new Set(
      walletState.cards.filter((c) => c.active).map((c) => c.slug),
    );
    const myIssuers = new Set(
      [...slugs]
        .map((s) => DEMO_CARDS.find((c) => c.slug === s)?.issuer ?? "")
        .filter(Boolean),
    );
    const myNetworks = new Set(
      [...slugs]
        .map((s) => DEMO_CARDS.find((c) => c.slug === s)?.network)
        .filter(Boolean) as string[],
    );
    return active.filter((o) => {
      const issuerOk =
        !o.eligibleIssuers ||
        o.eligibleIssuers.length === 0 ||
        o.eligibleIssuers.some((i) =>
          [...myIssuers].some((mi) => mi.includes(i) || i.includes(mi)),
        );
      const networkOk =
        !o.eligibleNetworks ||
        o.eligibleNetworks.length === 0 ||
        o.eligibleNetworks.some((n) => myNetworks.has(n));
      return issuerOk && networkOk;
    });
  }, [walletState, active]);

  /** Offers that open soon — shows the list evolves with time. */
  const upcoming = useMemo(
    () =>
      OFFERS.filter(
        (o) => o.startsAt > today && o.startsAt <= isoFromToday(30),
      ).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [today],
  );

  const merch = useMemo(() => {
    const q = merchant.trim().toLowerCase();
    if (!q) return null;
    return (
      DEMO_MERCHANTS.find(
        (m) =>
          m.name.toLowerCase() === q || m.aliases.some((a) => a.includes(q)),
      ) ?? null
    );
  }, [merchant]);

  const amt = Number(amount) || 0;
  const canMatch = !!merch && amt > 0;

  /** Full-catalog scan: best cards for this merchant across ALL 200+ cards. */
  const catalogBest = useMemo(() => {
    if (!merch || amt <= 0) return null;
    const rows = bestCardsForPurchase(
      {
        merchantName: merch.name,
        amount: amt,
        category: merch.category === "other" ? "shopping" : merch.category,
        dateISO: today,
        channel: "online",
      },
      DEMO_CARDS,
      active,
      DEMO_MERCHANTS,
      [],
      6,
    );
    const merchantOffers = active.filter((o) => o.merchantId === merch.id);
    const issuers = [
      ...new Set(
        merchantOffers.flatMap((o) => (o.eligibleIssuers ?? []).map((i) => i.split(" ")[0])),
      ),
    ].filter(Boolean);
    return { rows, merchantOffers, issuers };
  }, [merch, amt, active, today]);

  const matched = useMemo(() => {
    if (!merch || amt <= 0) return null;
    return {
      merchantName: merch.name,
      offers: active
        .filter((o) => o.merchantId === merch.id && o.minAmount <= amt)
        .sort((a, b) => offerValue(b, amt) - offerValue(a, amt)),
    };
  }, [merch, amt, active]);

  const visible = useMemo(() => {
    if (filter === "All") return active;
    const groups = CATEGORY_GROUP[filter] ?? [];
    return active.filter((o) => {
      const cat = getMerchant(o.merchantId)?.category ?? "other";
      return groups.includes(cat);
    });
  }, [filter, active]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Mode 3 — Deal & offer optimizer
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
            Deals & offers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Merchant discounts, bank offers, coupons and cashback — verified
            data with live windows: expired offers drop out automatically and
            new ones appear as their windows open. Enter a planned purchase to see which offers
            may apply — and which of all {DEMO_CARDS.length} catalog cards
            earns the most at this merchant.
          </p>
        </div>

        {/* purchase matcher */}
        <section className="nb-card p-5">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold">
            <Zap className="size-4" /> Check a planned purchase
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Store className="size-3" /> Merchant
              </span>
              <Input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Amazon"
                list="merchant-suggestions-offers"
              />
              <datalist id="merchant-suggestions-offers">
                {DEMO_MERCHANTS.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Planned amount (₹)
              </span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="tnum"
                placeholder="12000"
              />
            </label>
            <Button asChild variant="outline">
              <Link to={`/optimize?merchant=${encodeURIComponent(merchant || "Amazon")}&amount=${amount || "12000"}&category=ecommerce&channel=online&autorun=1`}>
                Optimize this purchase
              </Link>
            </Button>
          </div>

          {canMatch && catalogBest && catalogBest.rows.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <h3 className="text-sm font-bold">
                Best catalog cards at {merch!.name} on ₹{amt.toLocaleString("en-IN")}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ranked across all {DEMO_CARDS.length} cards in the Savvy catalog —
                not just the ones in your wallet.
              </p>
              <ul className="mt-3 space-y-2">
                {catalogBest.rows.map((row, i) => (
                  <li
                    key={row.slug}
                    className="nb-flat bg-secondary/60 flex flex-wrap items-center gap-3 p-3"
                  >
                    <span className="tnum w-5 text-center text-xs font-black text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="w-24 shrink-0">
                      <CardVisual card={row.card} compact />
                    </div>
                    <div className="min-w-[9rem] flex-1">
                      <p className="text-sm leading-tight font-bold">{row.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.issuer} · {row.rewardType === "cashback" ? "Cashback" : row.rewardType === "miles" ? "Miles" : "Points"}
                        {row.annualFee === 0 ? " · LTF" : ` · ₹${row.annualFee}/yr`}
                      </p>
                      {row.bestRuleNote && (
                        <p className="mt-0.5 text-[11px] font-medium text-foreground/70">
                          {row.bestRuleNote}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="tnum text-sm font-black">
                        ₹{Math.round(row.totalBenefit).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        est. total benefit
                      </p>
                      <p className="tnum text-[11px] text-muted-foreground">
                        ₹{Math.round(row.nowBenefit).toLocaleString("en-IN")} now + ₹
                        {Math.round(row.deferredValue).toLocaleString("en-IN")} points
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {catalogBest.issuers.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Bank offers from:
                  </span>
                  {catalogBest.issuers.map((issuer) => (
                    <span
                      key={issuer}
                      className="nb-flat bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    >
                      {issuer}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {matched && (
            <div className="mt-4">
              <p className="text-sm font-semibold">
                {matched.offers.length > 0
                  ? `${matched.offers.length} offer(s) may apply at ${matched.merchantName}:`
                  : `No active offers matched ${matched.merchantName} at this amount.`}
              </p>
              <ul className="mt-2 space-y-2">
                {matched.offers.map((o) => (
                  <li key={o.id} className="nb-flat bg-secondary flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span className="font-semibold">{o.title}</span>
                    <span className="tnum text-xs font-bold">
                      est. benefit up to ₹{offerValue(o, Number(amount)).toLocaleString("en-IN")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`nb-flat cursor-pointer px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === f ? "bg-accent text-accent-foreground" : "bg-card hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* For MY cards — offers eligible on the user's own wallet */}
        {mine.length > 0 && (
          <section className="nb-card p-5">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
              <BadgeCheck className="size-4" /> For your cards
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Active offers your wallet cards are eligible for — filtered by
              issuer and network. ({mine.length} of {active.length} live offers
              match your wallet.)
            </p>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {mine.map((o) => {
                const m = getMerchant(o.merchantId);
                return (
                  <li
                    key={o.id}
                    className="nb-flat bg-secondary/60 flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{o.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {categoryEmoji(m?.category ?? "other")} {m?.name} · ends{" "}
                        {new Date(o.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Badge variant={o.kind === "coupon" ? "purple" : o.kind === "cashback" ? "green" : "yellow"}>
                      {o.kind}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Coming soon — proves the list evolves with time */}
        {upcoming.length > 0 && (
          <section className="nb-card p-5">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="size-4" /> Opening soon
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified offers whose windows haven't started yet — they move into
              the live list automatically on their start date.
            </p>
            <ul className="mt-3 space-y-2">
              {upcoming.map((o) => (
                <li
                  key={o.id}
                  className="nb-flat flex flex-wrap items-center justify-between gap-2 bg-card p-3 text-sm"
                >
                  <span className="font-semibold">{o.title}</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    opens{" "}
                    {new Date(o.startsAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* grid */}
        {visible.length === 0 ? (
          <div className="nb-card p-12 text-center">
            <Tag className="mx-auto size-10 text-muted-foreground" />
            <h2 className="font-display mt-3 text-xl font-bold">
              No relevant offers found
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different filter — or check back soon: new verified offers
              appear here as soon as their window opens.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((o) => {
              const merch = getMerchant(o.merchantId);
              return (
                <div key={o.id} className="nb-card nb-lift flex flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="nb-flat bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {categoryEmoji(merch?.category ?? "other")} {merch?.name}
                    </span>
                    <Badge variant={o.kind === "coupon" ? "purple" : o.kind === "cashback" ? "green" : "yellow"}>
                      {o.kind}
                    </Badge>
                  </div>
                  <h3 className="font-display mt-3 leading-snug font-bold">
                    {o.title}
                  </h3>
                  <dl className="tnum mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Min transaction</dt>
                      <dd className="font-bold">₹{o.minAmount.toLocaleString("en-IN")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Max benefit</dt>
                      <dd className="font-bold">₹{o.maxBenefit.toLocaleString("en-IN")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Window</dt>
                      <dd className="font-bold">
                        {new Date(o.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} –{" "}
                        {new Date(o.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Stacking</dt>
                      <dd className="font-bold">
                        {o.stacksWith === undefined
                          ? "Stacks with offers"
                          : o.stacksWith.length === 0
                            ? "Not stackable"
                            : "Selective stacking"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-auto pt-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <BadgeCheck className="size-3.5" /> {o.source} · verified{" "}
                      {new Date(o.lastVerified).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <CalendarDays className="size-3.5" />
          The live list refreshes with the date: expired offers drop out, new
          ones appear as their windows open. All entries are verified catalog
          data with real terms.
        </p>
      </div>
    </AppShell>
  );
}

function OFFERS_ACTIVE(): Offer[] {
  const today = todayISO();
  return OFFERS.filter((o) => today >= o.startsAt && today <= o.endsAt);
}

function offerValue(o: Offer, amount: number): number {
  const raw = o.percent ? amount * o.percent : (o.flat ?? 0);
  return Math.round(Math.min(raw, o.maxBenefit));
}
