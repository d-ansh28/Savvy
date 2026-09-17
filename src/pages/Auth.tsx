import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, Loader2, LogIn, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SavvyLogo } from "@/components/SavvyLogo";
import { useAuth } from "@/hooks/use-auth";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && isAuthenticated) {
    navigate(redirect);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    setIsLoading(true);
    setError(null);
    try {
      await signIn("email-password", {
        email,
        password,
        flow: mode === "signUp" ? "signUp" : "signIn",
      });
      navigate(redirect);
    } catch (err) {
      console.error("Auth error:", err);
      const raw =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      // Convex errors arrive as `Uncaught Error: <message> [convex] ...`
      const message = raw
        .replace(/^.*?Error: /, "")
        .replace(/\s*\[convex\].*$/, "")
        .trim();
      setError(message || "Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="nb-grid-bg flex min-h-screen flex-col">
      <header className="border-b-2 border-line bg-background">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6">
          <SavvyLogo size="sm" />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex h-full flex-col items-center justify-center">
          <Card className="nb-shadow min-w-[350px] pb-0">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-2xl">
                {mode === "signUp" ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription>
                {mode === "signUp"
                  ? "Sign up with your email and a password — your wallet will be waiting."
                  : "Log in with your email and password."}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="pl-9"
                      autoComplete="email"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      placeholder={mode === "signUp" ? "At least 8 characters" : "Your password"}
                      type={showPassword ? "text" : "password"}
                      className="pr-10"
                      autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                      minLength={8}
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute top-2.5 right-2 cursor-pointer text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2 pb-6">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : mode === "signUp" ? (
                    <UserPlus className="mr-2 size-4" />
                  ) : (
                    <LogIn className="mr-2 size-4" />
                  )}
                  {mode === "signUp" ? "Create account" : "Log in"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {mode === "signUp" ? (
                    <>
                      Already have an account?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => {
                          setMode("signIn");
                          setError(null);
                        }}
                      >
                        Log in
                      </Button>
                    </>
                  ) : (
                    <>
                      New to Savvy?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => {
                          setMode("signUp");
                          setError(null);
                        }}
                      >
                        Create an account
                      </Button>
                    </>
                  )}
                </p>
              </CardFooter>
            </form>

            <div className="rounded-b-none border-t-2 border-line bg-secondary px-6 py-4 text-center text-xs text-muted-foreground">
              We never ask for CVV, PIN, OTP codes from your bank, or banking
              credentials. Passwords are stored hashed (PBKDF2-SHA256).
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return <Auth {...props} />;
}
