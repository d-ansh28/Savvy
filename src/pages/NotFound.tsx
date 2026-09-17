import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { SavvyLogo } from "@/components/SavvyLogo";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="nb-grid-bg flex min-h-screen flex-col"
    >
      <header className="border-b-2 border-line bg-background">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6">
          <SavvyLogo size="sm" />
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <span className="nb-flat nb-shadow flex size-14 items-center justify-center bg-block-yellow">
          <Compass className="size-7" />
        </span>
        <h1 className="font-display text-5xl font-bold tracking-tight">404</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          That page took a wrong turn. Head back to your wallet or the landing
          page to keep optimizing.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
