import { type DemoCard, type Network } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const NETWORK_LABEL: Record<Network, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
};

export function CardVisual({
  card,
  last4,
  className,
  compact = false,
}: {
  card: DemoCard;
  last4?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "nb-flat relative flex flex-col justify-between overflow-hidden p-4",
        compact ? "h-32" : "h-44 sm:h-48",
        className,
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
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
            {card.issuer}
          </p>
          <p className="font-display mt-1 text-lg leading-tight font-bold tracking-tight">
            {card.name}
          </p>
        </div>
        <span
          className="nb-flat px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: card.art.accent, color: card.art.ink }}
        >
          {NETWORK_LABEL[card.network]}
        </span>
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
        {!compact && (
          <p className="tnum text-right text-[11px] font-semibold opacity-90">
            {card.rewardType === "cashback" ? "CASHBACK" : card.rewardType === "miles" ? "MILES" : "POINTS"}
            <span className="block text-[10px] font-medium opacity-75">
              {card.annualFee === 0 ? "No annual fee" : `₹${card.annualFee.toLocaleString("en-IN")}/yr fee`}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
