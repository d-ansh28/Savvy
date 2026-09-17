import { Plane, Smile, Waves, Wifi } from "lucide-react";
import { type DemoCard, type Network } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const NETWORK_LABEL: Record<Network, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  rupay: "RuPay",
  diners: "DINERS",
};

export function CardVisual({
  card,
  last4,
  className,
  compact = false,
  showPerks = false,
}: {
  card: DemoCard;
  last4?: string;
  className?: string;
  compact?: boolean;
  showPerks?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "nb-flat relative flex flex-col justify-between overflow-hidden p-4",
          compact ? "h-32" : "h-44 sm:h-48",
        )}
        style={{
          background: `linear-gradient(135deg, ${card.art.from} 0%, ${card.art.to} 100%)`,
          color: card.art.ink,
        }}
      >
        {/* decorative diagonal slash */}
        <div
          aria-hidden
          className="absolute -top-10 -right-14 h-40 w-40 rotate-45 opacity-25"
          style={{ background: card.art.accent }}
        />

        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">
              {card.issuer}
            </p>
            <p className="font-display mt-0.5 truncate text-base leading-tight font-bold tracking-tight sm:text-lg">
              {card.name}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className="px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: card.art.accent, color: card.art.ink }}
            >
              {NETWORK_LABEL[card.network]}
            </span>
            {card.perks?.upi && (
              <span className="border border-white/50 px-1.5 py-0.5 text-[9px] font-bold">
                UPI
              </span>
            )}
          </div>
        </div>

        <div className="relative flex items-end justify-between gap-2">
          <div>
            <div className="flex h-6 w-9 items-center justify-center rounded-[2px] border border-white/40 bg-gradient-to-br from-yellow-200/90 to-yellow-500/80">
              <div className="grid h-3 w-6 grid-cols-3 gap-px">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="bg-black/20" />
                ))}
              </div>
            </div>
            <p className="tnum mt-2 text-xs font-semibold tracking-[0.3em] opacity-90">
              •••• {last4 ?? "4242"}
            </p>
          </div>
          <p className="tnum text-right text-[11px] font-semibold opacity-90">
            {card.rewardType === "cashback"
              ? "CASHBACK"
              : card.rewardType === "miles"
                ? "MILES"
                : "POINTS"}
            <span className="block text-[10px] font-medium opacity-75">
              {card.annualFee === 0
                ? "LTF"
                : `₹${card.annualFee.toLocaleString("en-IN")}/yr`}
            </span>
          </p>
        </div>
      </div>

      {showPerks && (
        <div className="flex flex-wrap gap-1.5">
          {card.perks?.domesticLounge && (
            <span className="nb-flat bg-block-blue px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-card-foreground">
              <Smile className="mr-1 inline size-2.5" />
              Lounge
            </span>
          )}
          {card.perks?.intlLounge && (
            <span className="nb-flat bg-block-purple px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-card-foreground">
              <Plane className="mr-1 inline size-2.5" />
              Intl lounge
            </span>
          )}
          {card.perks?.golf && (
            <span className="nb-flat bg-block-green px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-card-foreground">
              <Waves className="mr-1 inline size-2.5" />
              Golf
            </span>
          )}
          {card.perks?.metal && (
            <span className="nb-flat bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-card-foreground">
              Metal
            </span>
          )}
          {card.perks?.upi && (
            <span className="nb-flat bg-block-lime px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-card-foreground">
              <Wifi className="mr-1 inline size-2.5" />
              UPI card
            </span>
          )}
        </div>
      )}
    </div>
  );
}
