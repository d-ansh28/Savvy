import { useMemo } from "react";
import { Plane, Smile, Waves, Wifi } from "lucide-react";
import { type DemoCard, type Network } from "@/lib/catalog";
import { artFor, NETWORK_MARK } from "@/lib/issuerArt";
import { cn } from "@/lib/utils";

function NetworkMark({ network, upi }: { network: Network; upi?: boolean }) {
  const m = NETWORK_MARK[network];
  if (m.kind === "circles") {
    return (
      <span className="flex flex-col items-center gap-0.5">
        <span className="flex items-center">
          <span
            className="inline-block size-5 rounded-full"
            style={{ background: m.color }}
          />
          <span
            className="-ml-2 inline-block size-5 rounded-full opacity-90"
            style={{ background: m.second }}
          />
        </span>
        <span className="text-[7px] font-bold tracking-tight text-white/90">
          mastercard
        </span>
      </span>
    );
  }
  if (m.kind === "box") {
    return (
      <span className="flex h-6 items-center justify-center border-2 border-white/80 bg-[#016fd0] px-1.5 text-[8px] font-black tracking-wide text-white">
        {m.text}
      </span>
    );
  }
  if (m.kind === "rupay") {
    return (
      <span className="flex flex-col items-center gap-0.5">
        <span className="flex items-baseline">
          <span
            className="text-[11px] font-black tracking-tight"
            style={{ color: m.color }}
          >
            Ru
          </span>
          <span
            className="text-[11px] font-black tracking-tight"
            style={{ color: m.second }}
          >
            Pay
          </span>
        </span>
        {upi && (
          <span className="border border-white/60 px-1 text-[7px] font-bold tracking-widest text-white/90">
            UPI
          </span>
        )}
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-black tracking-[0.08em] italic"
      style={{ color: m.color }}
    >
      {m.text}
    </span>
  );
}

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
  const art = useMemo(() => artFor(card), [card]);
  const showLast4 = last4 ?? "4242";
  const isMetal = card.perks?.metal === true;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "nb-flat relative flex flex-col justify-between overflow-hidden p-3.5",
          compact ? "h-32" : "h-44 sm:h-48",
        )}
        style={{
          background: `linear-gradient(135deg, ${art.from} 0%, ${art.to} 100%)`,
          color: art.ink,
        }}
      >
        {/* subtle brand texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            background: `repeating-linear-gradient(45deg, transparent 0 10px, rgba(255,255,255,${art.texture}) 10px 11px)`,
          }}
        />
        {/* diagonal sheen */}
        <div
          aria-hidden
          className="absolute -top-12 -right-16 h-44 w-44 rotate-45 opacity-20"
          style={{ background: art.accent }}
        />
        {/* dark issuer band (Scapia-style) */}
        {art.band && (
          <div
            aria-hidden
            className="absolute top-0 right-0 left-0 h-11"
            style={{ background: art.band }}
          />
        )}

        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-[9px] font-bold uppercase tracking-[0.18em]",
                art.band ? "text-[10px] tracking-[0.2em] text-white/90" : "opacity-80",
              )}
            >
              {card.issuer}
            </p>
            <p className="font-display mt-0.5 truncate text-base leading-tight font-bold tracking-tight sm:text-lg">
              {card.name}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <NetworkMark network={card.network} upi={card.perks?.upi} />
            {card.perks?.upi && card.network !== "rupay" && (
              <span className="border border-white/50 px-1.5 py-0.5 text-[9px] font-bold">
                UPI
              </span>
            )}
          </div>
        </div>

        <div className="relative flex items-end justify-between gap-2">
          <div>
            {/* metallic chip */}
            <div className="flex h-7 w-10 items-center justify-center rounded-[3px] border border-yellow-200/60 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500">
              <div className="grid h-3.5 w-7 grid-cols-3 gap-px p-0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="bg-amber-700/25" />
                ))}
              </div>
            </div>
            <p className="tnum mt-2 text-xs font-semibold tracking-[0.3em] opacity-90">
              •••• {showLast4}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 pb-1">
            <p className="tnum text-right text-[11px] font-semibold opacity-95">
              {card.rewardType === "cashback"
                ? "CASHBACK"
                : card.rewardType === "miles"
                  ? "MILES"
                  : "POINTS"}
            </p>
            <p className="tnum text-right text-[10px] font-medium opacity-75">
              {card.annualFee === 0
                ? "LTF"
                : `₹${card.annualFee.toLocaleString("en-IN")}/yr`}
            </p>
          </div>
        </div>

        {/* contactless mark */}
        <svg
          aria-hidden
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
        >
          <path d="M8.5 14.5A4 4 0 0 0 8.5 9.5" />
          <path d="M11.5 17a8 8 0 0 0 0-10" />
          <circle cx="5.5" cy="12" r="1.5" fill="white" />
        </svg>
        {isMetal && (
          <div className="absolute top-3 right-3 rounded-sm border border-white/40 bg-black/30 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white/90">
            METAL
          </div>
        )}
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
