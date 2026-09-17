import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.string()),
    /** Email+password auth (scrypt hash — never the password itself). */
    passwordHash: v.optional(v.string()),
  }).index("email", ["email"]),

  /**
   * A user's personal wallet.
   * Subscription status lives here for v1 (single-user wallet model).
   */
  wallets: defineTable({
    userId: v.string(),
    plan: v.string(), // "free" | "starter" | "pro" | "max"
    subscriptionStatus: v.string(), // "none" | "active" | "expired"
    freeRunsUsed: v.number(),
    periodStart: v.string(), // ISO date of current usage week
    seedLoaded: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Cards in the user's wallet (references demo catalog by slug). */
  walletCards: defineTable({
    userId: v.string(),
    slug: v.string(),
    nickname: v.optional(v.string()),
    cardNumberLast4: v.optional(v.string()),
    active: v.boolean(),
    addedAt: v.number(),
  }).index("by_user", ["userId"]),

  /** User-entered reward balances (demo programs, user-provided status). */
  rewardBalances: defineTable({
    userId: v.string(),
    programId: v.string(),
    points: v.number(),
    expiresAt: v.optional(v.string()),
    expiringPoints: v.optional(v.number()),
    note: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Optional monthly spend profile used for cap math + card-fit matching. */
  spendingProfile: defineTable({
    userId: v.string(),
    monthlySpend: v.number(),
    role: v.optional(v.string()), // student | employee | self_employed | business_owner
    monthlyIncome: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Optimization history (demo/trial). */
  optimizations: defineTable({
    userId: v.string(),
    merchantName: v.string(),
    amount: v.number(),
    category: v.string(),
    bestCardSlug: v.optional(v.string()),
    totalBenefit: v.number(),
    effectiveCost: v.number(),
    runAt: v.number(),
  }).index("by_user", ["userId"]),
});

export default schema;
