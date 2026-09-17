import { useMemo } from "react";
import { Plane, Smile, Waves, Wifi } from "lucide-react";
import { type DemoCard, type Network } from "@/lib/catalog";
import { artFor, NETWORK_MARK, OFFICIAL_FACES } from "@/lib/issuerArt";
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

/** Decorative motif layer for official faces. */
function FaceMotif({
  motif,
  color,
}: {
  motif: NonNullable<
    (typeof OFFICIAL_FACES)[string]
  >["motif"];
  color: string;
}) {
  if (!motif || motif === "none") return null;
  if (motif === "diagonal") {
    return (
      <div
        aria-hidden
        className="absolute -top-10 -right-10 h-48 w-48 rotate-45 opacity-60"
        style={{
          background: `linear-gradient(135deg, transparent 0 40%, ${color} 40% 45%, transparent 45% 60%, ${color} 60% 63%, transparent 63%)`,
        }}
      />
    );
  }
  if (motif === "rings") {
    return (
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="absolute -right-6 -bottom-10 h-40 w-40 opacity-70"
      >
        {[22, 30, 38, 46].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
          />
        ))}
      </svg>
    );
  }
  if (motif === "diamond") {
    return (
      <div
        aria-hidden
        className="absolute top-1/2 right-6 h-36 w-36 -translate-y-1/2 rotate-45 border-2 opacity-50"
        style={{ borderColor: color, background: "transparent" }}
      />
    );
  }
  if (motif === "wave") {
    return (
      <svg
        aria-hidden
        viewBox="0 0 120 60"
        className="absolute right-0 bottom-6 h-16 w-40 opacity-60"
        preserveAspectRatio="none"
      >
        <path
          d="M0 40 Q 15 10 30 40 T 60 40 T 90 40 T 120 40"
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        <path
          d="M0 50 Q 15 24 30 50 T 60 50 T 90 50 T 120 50"
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    );
  }
  // dots
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-50"
      style={{
        backgroundImage: `radial-gradient(${color} 1.2px, transparent 1.2px)`,
        backgroundSize: "14px 14px",
      }}
    />
  );
}

/**
 * Tiny clean card face for dense comparison lists (Insights, leaderboards):
 * issuer wordmark + chip + network mark only — no crowded fine print.
 */
export function CardVisualMini({
  card,
  className,
}: {
  card: DemoCard;
  className?: string;
}) {
  const art = useMemo(() => artFor(card), [card]);
  const face = useMemo(() => OFFICIAL_FACES[card.slug], [card.slug]);

  return (
    <div
      className={cn(
        "nb-flat relative flex aspect-[8/5] w-full flex-col justify-between overflow-hidden p-2.5",
        className,
      )}
      style={{
        background: face ? face.bg : `linear-gradient(135deg, ${art.from} 0%, ${art.to} 100%)`,
        color: face ? face.ink : art.ink,
      }}
    >
      {!face && art.band && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/3"
          style={{ background: art.band }}
        />
      )}
      <div className="relative flex items-start justify-between gap-1.5">
        <p className="min-w-0 truncate text-[9px] leading-tight font-black tracking-wide uppercase">
          {face?.coBrand ? face.wordmark ?? card.issuer : card.issuer}
        </p>
        <NetworkMark network={card.network} upi={card.perks?.upi} />
      </div>
      <div className="relative flex items-end justify-between gap-1.5">
        <div className="flex h-5 w-8 items-center justify-center rounded-[3px] border border-yellow-200/60 bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500">
          <div className="grid h-2.5 w-5 grid-cols-3 gap-px p-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="bg-amber-700/25" />
            ))}
          </div>
        </div>
        <p className="truncate text-[8px] font-bold tracking-wider uppercase opacity-80">
          {card.rewardType === "cashback" ? "Cash" : card.rewardType === "miles" ? "Miles" : "Pts"}
        </p>
      </div>
    </div>
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
  const face = useMemo(() => OFFICIAL_FACES[card.slug], [card.slug]);
  const showLast4 = last4 ?? "4242";
  const isMetal = card.perks?.metal === true;

  const issuerName = face?.coBrand ? face.wordmark ?? card.issuer : card.issuer;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "nb-flat relative flex flex-col justify-between overflow-hidden p-3.5",
          compact ? "h-32" : "h-44 sm:h-48",
        )}
        style={{
          background: face ? face.bg : `linear-gradient(135deg, ${art.from} 0%, ${art.to} 100%)`,
          color: face ? face.ink : art.ink,
        }}
      >
        {/* subtle brand texture (non-official faces) */}
        {!face && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              background: `repeating-linear-gradient(45deg, transparent 0 10px, rgba(255,255,255,${art.texture}) 10px 11px)`,
            }}
          />
        )}
        {/* diagonal sheen (non-official faces) */}
        {!face && (
          <div
            aria-hidden
            className="absolute -top-12 -right-16 h-44 w-44 rotate-45 opacity-20"
            style={{ background: art.accent }}
          />
        )}
        {/* official face motif */}
        {face?.motif && face.motif !== "none" && face.motifColor && (
          <FaceMotif motif={face.motif} color={face.motifColor} />
        )}
        {/* dark issuer band (Scapia-style, non-official faces) */}
        {!face && art.band && (
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
                face
                  ? "text-[11px] tracking-[0.14em]"
                  : art.band
                    ? "text-[10px] tracking-[0.2em] text-white/90"
                    : "opacity-80",
              )}
              style={face?.coBrandColor ? { color: face.coBrandColor } : undefined}
            >
              {face?.coBrand ?? card.issuer}
            </p>
            <p
              className={cn(
                "font-display mt-0.5 truncate text-base leading-tight font-bold tracking-tight sm:text-lg",
                face && "text-[15px] sm:text-base",
              )}
              style={face?.wordmarkColor ? { color: face.wordmarkColor } : undefined}
            >
              {face?.coBrand ? face.wordmark : card.name}
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
              {face?.rewardLabel ??
                (card.rewardType === "cashback"
                  ? "CASHBACK"
                  : card.rewardType === "miles"
                    ? "MILES"
                    : "POINTS")}
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
        {/* keep issuer name discoverable on co-brand faces */}
        {face?.coBrand && !face.wordmark?.toLowerCase().includes(issuerName.toLowerCase()) && (
          <p className="absolute right-3 bottom-14 text-[9px] font-bold uppercase tracking-widest opacity-70">
            {issuerName}
          </p>
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
