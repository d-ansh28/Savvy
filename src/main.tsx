import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, {
  StrictMode,
  useEffect,
  lazy,
  Suspense,
  Component,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import "./index.css";

/**
 * Lazy-load a route with one automatic retry after a hard reload.
 *
 * After a new build is deployed, a signed-in tab still runs the OLD bundle and
 * requests hashed chunks (e.g. Dashboard-DQapvb3Q.js) that no longer exist on
 * the server → "TypeError: Failed to fetch dynamically imported module". This
 * commonly hits right after creating an account, because that's the first time
 * a chunk-only navigation (e.g. /dashboard) happens. The first failure reloads
 * the page once to pick up the fresh index.html + chunk hashes; the session
 * flag prevents reload loops if the chunk is genuinely unreachable.
 */
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  load: () => Promise<T>,
): React.LazyExoticComponent<T["default"]> {
  return lazy(() =>
    load().catch((error: unknown) => {
      const stale =
        error instanceof TypeError &&
        /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
          error.message,
        );
      if (
        stale &&
        typeof window !== "undefined" &&
        !window.sessionStorage.getItem("savvy:chunk-reload")
      ) {
        window.sessionStorage.setItem("savvy:chunk-reload", "1");
        window.location.reload();
      }
      throw error;
    }),
  );
}

// Lazy load route components for better code splitting
const Landing = lazyRetry(() => import("./pages/Landing.tsx"));
const AuthPage = lazyRetry(() => import("./pages/Auth.tsx"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard.tsx"));
const Wallet = lazyRetry(() => import("./pages/Wallet.tsx"));
const Optimize = lazyRetry(() => import("./pages/Optimize.tsx"));
const Offers = lazyRetry(() => import("./pages/Offers.tsx"));
const RewardsVault = lazyRetry(() => import("./pages/RewardsVault.tsx"));
const Insights = lazyRetry(() => import("./pages/Insights.tsx"));
const Assistant = lazyRetry(() => import("./pages/Assistant.tsx"));
const Pricing = lazyRetry(() => import("./pages/Pricing.tsx"));
const NotFound = lazyRetry(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}

/** Friendly fallback if a route chunk fails to load even after a reload. */
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="nb-card max-w-md p-8 text-center">
            <h2 className="font-display text-xl font-bold">
              Couldn't load this page
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Savvy was updated in the background. Reload to get the latest
              version of the app.
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Reload Savvy
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    // A completed navigation means chunks loaded fine — re-arm the one-shot
    // stale-chunk reload so a future deploy can trigger it again.
    window.sessionStorage.removeItem("savvy:chunk-reload");
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <RouteErrorBoundary>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/wallet"
                element={
                  <RequireAuth>
                    <Wallet />
                  </RequireAuth>
                }
              />
              <Route
                path="/optimize"
                element={
                  <RequireAuth>
                    <Optimize />
                  </RequireAuth>
                }
              />
              <Route
                path="/offers"
                element={
                  <RequireAuth>
                    <Offers />
                  </RequireAuth>
                }
              />
              <Route
                path="/rewards"
                element={
                  <RequireAuth>
                    <RewardsVault />
                  </RequireAuth>
                }
              />
              <Route
                path="/insights"
                element={
                  <RequireAuth>
                    <Insights />
                  </RequireAuth>
                }
              />
              <Route
                path="/assistant"
                element={
                  <RequireAuth>
                    <Assistant />
                  </RequireAuth>
                }
              />
              <Route
                path="/pricing"
                element={
                  <RequireAuth>
                    <Pricing />
                  </RequireAuth>
                }
              />              <Route path="*" element={<NotFound />} />
            </Routes>
              </Suspense>
            </RouteErrorBoundary>
          </BrowserRouter>
          <Toaster />
        </ConvexAuthProvider>
      </RootErrorBoundary>
    </StrictMode>,
  );
