import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  Bell,
  Brain,
  Calculator,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PerkLogo } from "@/components/PerkLogo";
import { CardVisual } from "@/components/CardVisual";
import { getDemoCard } from "@/lib/catalog";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

function MiniStat({
  value,
  label,
  block,
}: {
  value: string;
  label: string;
  block: string;
}) {
  return (
    <div className={`nb-flat ${block} p-3`}>
      <p className="tnum font-display text-xl font-bold">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
        {label}
      </p>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const millennia = getDemoCard("hdfc-millennia")!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="nb-grid-bg min-h-screen"
    >
      {/* NAV */}
      <header className="border-b-2 border-line bg-background">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <PerkLogo />
          <div className="flex items-center gap-3">
            <a
              href="#how"
              className="hidden text-sm font-bold text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              How it works
            </a>
            <Link
              to="/pricing"
              className="hidden text-sm font-bold text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Pricing
            </Link>
            {!isLoading && isAuthenticated ? (
              <Button asChild size="sm">
                <Link to="/dashboard">
                  Dashboard <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth?mode=signup">Build My Wallet</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
        <div>
          <motion.div {...fadeUp}>
            <Badge variant="yellow" className="mb-5 shadow-[3px_3px_0_0_var(--nb-line)]">
              <Sparkles className="size-3" />
              AI wallet intelligence · Demo
            </Badge>
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.05 }}
            className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            Make every payment{" "}
            <span className="nb-underline">worth more.</span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            PerkPilot AI analyzes your cards, rewards, offers and spending to
            help you get more value from every purchase. Know exactly which
            card to use, what you'll earn, and what it actually costs you —
            before you pay.
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Button asChild size="lg">
              <Link to="/auth?mode=signup">
                Build My Wallet <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how">See How It Works</a>
            </Button>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.24 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-block-green" /> No bank
              credentials, ever
            </span>
            <span className="flex items-center gap-1.5">
              <Calculator className="size-4 text-block-blue" /> Deterministic
              math — AI explains, never calculates
            </span>
          </motion.div>
        </div>

        {/* Hero optimization card */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
          className="relative"
        >
          <div className="nb-card nb-shadow p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="nb-flat bg-block-lime px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-card-foreground">
                Estimated optimization
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Example
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat value="₹12,000" label="Purchase" block="bg-secondary" />
              <MiniStat value="Amazon" label="Merchant" block="bg-secondary" />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <CardVisual card={millennia} compact className="w-44 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Recommended
                </p>
                <p className="font-display text-xl font-bold">
                  HDFC Millennia
                </p>
                <Badge variant="green" className="mt-2">
                  <Zap className="size-3" /> Best fit for this purchase
                </Badge>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t-2 border-dashed border-line/40 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated cashback</span>
                <span className="tnum font-bold">₹600</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Additional offer</span>
                <span className="tnum font-bold">₹500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Points</span>
                <span className="tnum font-bold">0</span>
              </div>
              <div className="flex items-baseline justify-between border-t-2 border-line pt-3">
                <span className="font-display text-sm font-bold uppercase tracking-wide">
                  Total est. benefit
                </span>
                <span className="tnum font-display text-2xl font-bold">
                  ₹1,100
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-sm font-bold uppercase tracking-wide">
                  Effective cost
                </span>
                <span className="tnum font-display text-2xl font-bold text-block-green">
                  ₹10,900
                </span>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Estimated calculations based on demo reward rules. Not a
              guarantee of actual rewards.
            </p>
          </div>

          {/* floating chips */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="nb-flat nb-shadow absolute -top-4 -right-3 hidden items-center gap-1.5 bg-block-yellow px-2.5 py-1.5 text-xs font-bold text-card-foreground sm:flex"
          >
            <BadgePercent className="size-3.5" /> +5% cashback found
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="nb-flat nb-shadow absolute -bottom-4 -left-3 hidden items-center gap-1.5 bg-block-blue px-2.5 py-1.5 text-xs font-bold text-card-foreground sm:flex"
          >
            <Bell className="size-3.5" /> 8,000 pts expiring soon
          </motion.div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y-2 border-line bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps. Zero guesswork.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            PerkPilot evaluates every payment method you own against the thing
            you're about to buy — then shows the math, not just a verdict.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Wallet,
                block: "bg-block-yellow",
                title: "Build your wallet",
                body: "Add the cards, programs and balances you already have. Manual entry only — we never ask for bank logins, CVV, PIN or OTP.",
              },
              {
                step: "02",
                icon: Zap,
                block: "bg-block-lime",
                title: "Optimize a purchase",
                body: "Enter a merchant and amount. The rules engine checks every card's rates, caps, minimums and eligible offers to compute the best way to pay.",
              },
              {
                step: "03",
                icon: Brain,
                block: "bg-block-blue",
                title: "See the why",
                body: "Every recommendation comes with a full breakdown — cashback, offers, caps, assumptions — and an AI explanation grounded in your actual numbers.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="nb-card nb-lift p-6"
              >
                <div className="flex items-center justify-between">
                  <span className={`nb-flat ${s.block} flex size-10 items-center justify-center`}>
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-display text-3xl font-bold text-line/15">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WALLET SHOWCASE */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Badge variant="blue" className="mb-4">Your wallet, decoded</Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              A wallet that works as hard as you do.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Track cards, balances and expiring rewards in one place. The
              dashboard surfaces opportunities and warns you before points
              vanish.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "All cards, rates and caps on one screen",
                "Expiring-reward alerts with amounts and dates",
                "Active offers matched to your spending",
                "Deterministic engine — same inputs, same numbers",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm font-medium">
                  <span className="nb-flat mt-0.5 flex size-5 shrink-0 items-center justify-center bg-block-green text-[11px] font-bold">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8">
              <Link to="/auth?mode=signup">
                Start free — 3 optimizations a week <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {["hdfc-millennia", "sbi-cashback", "axis-flipkart", "amex-mr"].map(
              (slug, i) => {
                const card = getDemoCard(slug)!;
                return (
                  <motion.div
                    key={slug}
                    initial={{ opacity: 0, y: 20, rotate: i % 2 === 0 ? -2 : 2 }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.07 }}
                    className={i % 2 === 1 ? "sm:translate-y-6" : ""}
                  >
                    <CardVisual card={card} />
                  </motion.div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-line bg-foreground text-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          <h2 className="font-display max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Stop leaving rewards on the table.
          </h2>
          <p className="max-w-xl text-sm opacity-80">
            Free plan includes 3 AI optimizations per week. Upgrade any time
            for unlimited runs and advanced analytics.
          </p>
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent">
            <Link to="/auth?mode=signup">
              Build My Wallet <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t-2 border-line bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <PerkLogo size="sm" />
          <p className="text-xs text-muted-foreground">
            Demo product. All card data, rates and offers are illustrative —
            not affiliated with any issuer. We never store card numbers, CVV,
            PIN or bank credentials.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
