import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { ConvexError, type Value } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const KEYLEN = 64; // bytes

/** sha256 helper via Web Crypto (works in Convex's default runtime). */
async function sha256(data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data);
}

/**
 * PBKDF2-SHA256 password hash in the form `salt:hash` (hex).
 * One-way — the password itself is never stored.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    key,
    KEYLEN * 8,
  );
  const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex(salt)}:${hex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
      key,
      hashHex.length * 4,
    ),
  );
  const expected = new Uint8Array(hashHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  if (bits.length !== expected.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountRow {
  _id: Id<"users">;
  email?: string;
  passwordHash?: string;
}

export const emailPassword = ConvexCredentials({
  id: "email-password",
  authorize: async (
    credentials: Partial<Record<string, Value | undefined>>,
    ctx,
  ): Promise<{ userId: Id<"users">; sessionId?: Id<"authSessions"> } | null> => {
    const email = String(credentials.email ?? "").trim().toLowerCase();
    const password = String(credentials.password ?? "");
    const flow = credentials.flow === "signUp" ? "signUp" : "signIn";

    if (!EMAIL_RE.test(email)) throw new ConvexError("Enter a valid email address");
    if (password.length < 8) throw new ConvexError("Password must be at least 8 characters");

    const existing = (await ctx.runQuery(
      internal.authAccounts.findByEmail,
      { email },
    )) as AccountRow | null;

    if (flow === "signUp") {
      if (existing) {
        throw new ConvexError("An account with this email already exists — sign in instead");
      }
      const userId = (await ctx.runMutation(internal.authAccounts.create, {
        email,
        passwordHash: await hashPassword(password),
      })) as Id<"users">;
      return { userId };
    }

    if (!existing?.passwordHash) {
      // Same message for unknown email and wrong password (no account enumeration).
      throw new ConvexError("Invalid email or password");
    }
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) throw new ConvexError("Invalid email or password");
    return { userId: existing._id };
  },
});
