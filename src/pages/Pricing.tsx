import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PLANS, FREE_RUNS_LIMIT_DISPLAY } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const [opening, setOpening] = useState<string | null>(null);

  const choose = (planId: string, link: string | null) => {
    if (!link) {
      // Payment link not configured yet — show a friendly note instead of a dead end.
      window.alert(
        "Payment link isn't configured for this environment yet. Add RAZORPAY_" +
          planId.toUpperCase() +
          "_PAYMENT_LINK in project keys to enable checkout.",
      );
      return;
    }
    setOpening(planId);
    window.open(link, "_blank");
    setTimeout(() => setOpening(null), 1200);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
            Simple plans, serious savings
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Start free with {FREE_RUNS_LIMIT_DISPLAY} AI optimizations per week.
            Upgrade when you're ready — checkout via secure Razorpay payment
            links.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* FREE */}
          <div className="nb-card flex flex-col p-6">
            <p className="font-display text-sm font-bold uppercase tracking-wide">
              Free
            </p>
            <p className="tnum font-display mt-2 text-4xl font-bold">₹0</p>
            <p className="mt-1 text-xs text-muted-foreground">forever</p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {[
                `${FREE_RUNS_LIMIT_DISPLAY} AI optimizations / week`,
                "Wallet & card management",
                "Offers browser",
                "Expiring-reward alerts",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Badge variant="secondary" className="mt-5 justify-center">
              Your current plan
            </Badge>
          </div>

          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "nb-card relative flex flex-col p-6",
                plan.highlight && "nb-shadow",
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-[2px_2px_0_0_var(--nb-line)]">
                  Most popular
                </Badge>
              )}
              <span className={`nb-flat ${plan.block} mb-3 w-fit px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest`}>
                {plan.name}
              </span>
              <p className="tnum font-display text-4xl font-bold">
                ₹{plan.priceMonthly}
                <span className="text-sm font-medium text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6"
                variant={plan.highlight ? "default" : "outline"}
                disabled={opening === plan.id}
                onClick={() => choose(plan.id, plan.paymentLink)}
              >
                {opening === plan.id ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Opening checkout…
                  </>
                ) : (
                  `Choose ${plan.name}`
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Plan configuration is read from backend settings; payment links are
          injected via environment (RAZORPAY_STARTER_PAYMENT_LINK,
          RAZORPAY_PRO_PAYMENT_LINK, RAZORPAY_MAX_PAYMENT_LINK). No card
          details are stored by Savvy.
        </p>
      </div>
    </AppShell>
  );
}
