import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PLANS } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";

/**
 * Subscription page — fully data-driven from the plan config (src/lib/pricing.ts).
 * Payment uses Razorpay Payment Links; after returning from checkout the user
 * confirms payment so the server activates the plan. In production this is
 * replaced by a verified Razorpay webhook — never a client URL check.
 */
export default function Pricing() {
  const [opening, setOpening] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const activatePlan = useMutation(api.wallets.activatePlan);

  const choose = (planId: string, link: string | null) => {
    if (!link) {
      window.alert(
        "Payment link isn't configured for this plan yet. Add the Razorpay " +
          "payment link in project keys to enable checkout.",
      );
      return;
    }
    setOpening(planId);
    window.open(link, "_blank");
    setTimeout(() => setOpening(null), 1200);
  };

  const confirmPayment = async (planId: string) => {
    setActivating(planId);
    try {
      await activatePlan({ plan: planId });
      window.location.reload();
    } catch {
      setActivating(null);
      window.alert(
        "Couldn't activate the plan right now. Please try again in a moment.",
      );
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
            Simple plans, serious savings
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Start free with 3 AI optimizations every month. Upgrade when you're
            ready — checkout via secure Razorpay payment links.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
              <span
                className={`nb-flat ${plan.block} mb-3 w-fit px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest`}
              >
                {plan.name}
              </span>
              <p className="tnum font-display text-4xl font-bold">
                ₹{plan.priceMonthly}
                <span className="text-sm font-medium text-muted-foreground">
                  /mo
                </span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.priceMonthly === 0 ? (
                <Button
                  className="mt-6"
                  variant="outline"
                  disabled
                  title="You're on the Free plan by default"
                >
                  Included — no card needed
                </Button>
              ) : (
                <div className="mt-6 space-y-2">
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={opening === plan.id}
                    onClick={() => choose(plan.id, plan.paymentLink)}
                  >
                    {opening === plan.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Opening
                        checkout…
                      </>
                    ) : (
                      `Pay ₹${plan.priceMonthly} / month`
                    )}
                  </Button>
                  <Button
                    className="w-full"
                    variant="ghost"
                    size="sm"
                    disabled={activating === plan.id}
                    onClick={() => confirmPayment(plan.id)}
                  >
                    {activating === plan.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "I've paid — activate now"
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Payments open in Razorpay's secure checkout. Paid plans grant{" "}
          {PLANS[1]?.runsPerMonth}/{PLANS[2]?.runsPerMonth}/
          {PLANS[3]?.runsPerMonth} AI optimization runs per month respectively,
          enforced server-side. No card details are ever stored by Savvy.
        </p>
      </div>
    </AppShell>
  );
}
