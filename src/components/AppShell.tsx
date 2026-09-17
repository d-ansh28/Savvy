import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  Brain,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PerkLogo } from "@/components/PerkLogo";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/optimize", label: "Optimize", icon: Zap },
  { to: "/wallet", label: "Wallet", icon: CreditCard },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/offers", label: "Offers", icon: Tag },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/assistant", label: "AI", icon: Brain },
];

export function AppShell({
  children,
  usage,
}: {
  children: ReactNode;
  usage?: { freeRunsUsed: number; limit: number; plan: string } | null;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const walletState = useQuery(api.wallets.getWalletState, {});

  const used = usage?.freeRunsUsed ?? walletState?.wallet.freeRunsUsed ?? 0;
  const limit = usage?.limit ?? walletState?.freeLimit ?? 3;
  const isPaid =
    (usage?.plan ?? walletState?.wallet.plan ?? "free") !== "free" &&
    (walletState?.wallet.subscriptionStatus ?? "none") === "active";
  const remaining = Math.max(0, limit - used);

  return (
    <div className="nb-grid-bg min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-line bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <PerkLogo to="/dashboard" size="sm" />
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all",
                      isActive
                        ? "border-line bg-accent text-accent-foreground shadow-[2px_2px_0_0_var(--nb-line)]"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  <Icon className="size-3.5" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isPaid ? (
              <span className="nb-flat hidden bg-block-purple px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-card-foreground sm:block">
                {walletState?.wallet.plan} plan
              </span>
            ) : (
              <button
                onClick={() => navigate("/pricing")}
                className="nb-flat hidden cursor-pointer items-center gap-2 bg-card px-2.5 py-1.5 transition-colors hover:bg-secondary sm:flex"
                title="Free plan usage"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Free runs
                </span>
                <span className="tnum flex items-center gap-1">
                  {Array.from({ length: limit }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-2.5 border-2 border-line",
                        i < remaining ? "bg-block-green" : "bg-secondary",
                      )}
                    />
                  ))}
                </span>
                <span className="tnum text-xs font-bold">
                  {remaining}/{limit}
                </span>
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">
                {user?.name ?? "Sign out"}
              </span>
            </Button>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t-2 border-line bg-background px-4 py-2 md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-1.5 border-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-all",
                  isActive
                    ? "border-line bg-accent text-accent-foreground"
                    : "border-transparent text-muted-foreground",
                )
              }
            >
              <Icon className="size-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16 sm:px-6">
        {children}
      </main>
      <footer className="border-t-2 border-line bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-semibold">PerkPilot AI — demo build</p>
          <p>
            All rates, offers and balances are illustrative demo data. Never
            provides CVV, PIN, OTP or bank credentials.
          </p>
        </div>
      </footer>
    </div>
  );
}
