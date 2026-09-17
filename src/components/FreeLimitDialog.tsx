import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/pricing";
import { useState } from "react";

export function FreeLimitDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [opening, setOpening] = useState<string | null>(null);

  const openPaymentLink = (planId: string, link: string | null) => {
    if (!link) {
      window.open("/pricing", "_self");
      return;
    }
    setOpening(planId);
    window.open(link, "_blank");
    setTimeout(() => setOpening(null), 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-2xl">
            <span className="nb-flat bg-block-yellow flex size-8 items-center justify-center">
              <Sparkles className="size-4" />
            </span>
            Free optimization limit reached
          </DialogTitle>
          <DialogDescription>
            You've used all 3 free runs this week. Upgrade for unlimited
            purchase optimization and deeper analytics — plans are managed on
            the pricing page and paid via Razorpay payment links.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`nb-card p-4 ${plan.highlight ? "relative" : ""}`}
            >
              {plan.highlight && (
                <Badge className="absolute -top-2.5 left-3">Popular</Badge>
              )}
              <p className="font-display text-sm font-bold uppercase tracking-wide">
                {plan.name}
              </p>
              <p className="tnum font-display mt-1 text-2xl font-bold">
                ₹{plan.priceMonthly}
                <span className="text-xs font-medium text-muted-foreground">/mo</span>
              </p>
              <Button
                className="mt-3 w-full"
                variant={plan.highlight ? "default" : "outline"}
                disabled={opening === plan.id}
                onClick={() => openPaymentLink(plan.id, plan.paymentLink)}
              >
                {opening === plan.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Choose"
                )}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Payments open in Razorpay's secure checkout. Subscription activation
          is verified server-side after payment confirmation.
        </p>
      </DialogContent>
    </Dialog>
  );
}
