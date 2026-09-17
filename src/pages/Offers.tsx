import { useMemo, useState } from "react";
import { Link } from "react-router";
import { BadgeCheck, CalendarDays, Store, Tag, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import {
  DEMO_MERCHANTS,
  type Offer,
  categoryEmoji,
  getMerchant,
} from "@/lib/catalog";

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

  const today = todayISO();

  const active = useMemo(
    () => OFFERS_ACTIVE(),
    [today], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const matched = useMemo(() => {
    const amt = Number(amount);
    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) return null;
    const merch = DEMO_MERCHANTS.find(
      (m) =>
        m.name.toLowerCase() === merchant.trim().toLowerCase() ||
        m.aliases.some((a) => a.includes(merchant.trim().toLowerCase())),
    );
    if (!merch) return { merchantName: merchant.trim(), offers: [] as Offer[] };
    return {
      merchantName: merch.name,
      offers: active
        .filter((o) => o.merchantId === merch.id && o.minAmount <= amt)
        .sort((a, b) => offerValue(b, amt) - offerValue(a, amt)),
    };
  }, [merchant, amount, active]);

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
            Merchant discounts, bank offers, coupons and cashback — all demo
            data, clearly labeled. Enter a planned purchase to see which offers
            may apply.
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

          {matched && (
            <div className="mt-4">
              <p className="text-sm font-semibold">
                {matched.offers.length > 0
                  ? `${matched.offers.length} offer(s) may apply at ${matched.merchantName}:`
                  : `No active demo offers matched ${matched.merchantName} at this amount.`}
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

        {/* grid */}
        {visible.length === 0 ? (
          <div className="nb-card p-12 text-center">
            <Tag className="mx-auto size-10 text-muted-foreground" />
            <h2 className="font-display mt-3 text-xl font-bold">
              No relevant offers found
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different filter — or check back after the next demo data
              refresh.
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
          Expired and future offers are excluded automatically by date window.
          All offers here are demo data — not live promotions.
        </p>
      </div>
    </AppShell>
  );
}

function OFFERS_ACTIVE(): Offer[] {
  const today = todayISO();
  return ALL_OFFERS.filter((o) => today >= o.startsAt && today <= o.endsAt);
}

import { OFFERS as ALL_OFFERS } from "@/lib/catalog";

function offerValue(o: Offer, amount: number): number {
  const raw = o.percent ? amount * o.percent : (o.flat ?? 0);
  return Math.round(Math.min(raw, o.maxBenefit));
}
