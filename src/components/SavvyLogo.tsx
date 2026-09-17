import { Zap } from "lucide-react";
import { Link } from "react-router";

export function SavvyLogo({
  to = "/",
  size = "md",
  tagline = false,
}: {
  to?: string;
  size?: "sm" | "md" | "lg";
  tagline?: boolean;
}) {
  const box =
    size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <Link to={to} className="group inline-flex items-center gap-2.5">
      <span
        className={`${box} nb-flat flex items-center justify-center bg-accent text-accent-foreground shadow-[3px_3px_0_0_var(--nb-line)] transition-transform group-hover:-translate-y-0.5`}
      >
        <Zap className="size-[60%]" strokeWidth={2.75} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display ${text} font-bold tracking-tight`}>
          Savvy
        </span>
        {tagline && (
          <span className="mt-1 max-w-56 text-[10px] leading-snug font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Spend smart. Earn more.
          </span>
        )}
      </span>
    </Link>
  );
}
