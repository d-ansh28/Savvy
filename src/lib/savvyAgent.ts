/**
 * AWS Strands Agents SDK integration for Savvy.
 *
 * Strands (https://github.com/strands-agents — AWS open source, Apache-2.0)
 * provides the agentic loop: model ↔ tool orchestration, turn limits,
 * traces and structured streaming. Savvy plugs in two things:
 *
 *  1. `VlyModel` — a custom Strands `Model` provider that wraps the existing
 *     vly.ai gateway (same `VLY_INTEGRATION_KEY` the app already uses — no new
 *     API keys). vly.ai's completion endpoint is text-only, so the provider
 *     teaches the agent loop a strict JSON tool-call protocol: tool
 *     definitions ride in the system prompt, and the model "calls" a tool by
 *     answering with a single ```savvy_tool {...}``` fence. The provider
 *     parses that fence and emits genuine Strands
 *     toolUse/toolResult streaming events, so the SDK's loop, limits and
 *     traces all work unchanged.
 *
 *  2. `createSavvyAgent()` — the agent with REAL deterministic tools backed by
 *     `src/lib/engine.ts`. The model decides WHICH tool to call; the math is
 *     always computed by the engine, never by the LLM. Every tool result is
 *     stringified and fed back into the loop so the model explains numbers
 *     that were actually calculated.
 *
 * All exports run inside a Convex "use node" action (Node.js runtime).
 */

import {
  Agent,
  Model,
  Message,
  TextBlock,
  ToolResultBlock,
  ToolUseBlock,
  ModelMessageStartEvent,
  ModelContentBlockStartEvent,
  ModelContentBlockDeltaEvent,
  ModelContentBlockStopEvent,
  ModelMessageStopEvent,
  ModelMetadataEvent,
  tool,
  type BaseModelConfig,
  type StreamOptions,
  type ModelStreamEvent,
  type ToolSpec,
  type Usage,
  type Metrics,
} from "@strands-agents/sdk";
import { z } from "zod";
import { vly as __realVly } from "./vly-integrations";
import {
  DEMO_CARDS,
  DEMO_MERCHANTS,
  OFFERS,
  categoryLabel,
  type Category,
} from "./catalog";
import {
  bestCardsForPurchase,
  bestEarnersForCategory,
  bestEarnersForRewardKind,
  categoryGapAnalysis,
  optimizePurchase,
  type RewardBalance,
  type WalletCard,
} from "./engine";
import { getProgram } from "./catalog";
import { rankedRedemptions } from "./redemptions";

// ---------------------------------------------------------------------------
// 1. Custom Strands Model provider — vly.ai gateway
// ---------------------------------------------------------------------------

/** Gateway seam: defaults to the real vly.ai client; tests swap it. */
let vlyGateway: typeof __realVly = __realVly;

/** @internal Test-only: replaces the vly.ai gateway (see scripts/strands-smoke.ts). */
export function __setVlyForTest(fake: typeof __realVly): void {
  vlyGateway = fake;
}

export interface VlyModelConfig extends BaseModelConfig {
  /** Static system prompt injected before the tool protocol block. */
  systemPromptSuffix?: string;
}

interface WireMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const TOOL_FENCE = "savvy_tool";

/** Flattens Strands messages (text + toolUse + toolResult blocks) to vly text. */
function flattenMessages(
  systemPrompt: string,
  toolSpecs: ToolSpec[],
  messages: Message[],
): WireMessage[] {
  const out: WireMessage[] = [];

  let sys = systemPrompt;
  if (toolSpecs.length > 0) {
    const protocol = [
      "",
      "## Tool calling protocol",
      "You can call tools to fetch real data. Available tools:",
      ...toolSpecs.map(
        (t) => `- ${t.name}: ${t.description} Input JSON schema: ${JSON.stringify(t.inputSchema ?? {})}`,
      ),
      "",
      "To call a tool, reply with EXACTLY one fence and nothing else:",
      `\`\`\`${TOOL_FENCE}`,
      `{"tool": "<tool-name>", "input": { ... }}`,
      "```",
      "The tool result arrives as the next message. After you have the data, answer the user directly in plain text — never mention the protocol, fences, or tools by name.",
    ].join("\n");
    sys = `${sys}\n${protocol}`;
  }
  out.push({ role: "system", content: sys });

  for (const m of messages) {
    if (m.role === "user") {
      // A user turn may carry toolResult blocks (the loop's feedback step).
      const toolResults = m.content.filter((b) => b.type === "toolResultBlock");
      const texts = m.content.filter((b) => b.type === "textBlock");
      for (const tr of toolResults) {
        out.push({
          role: "user",
          content: `TOOL_RESULT (${tr.toolUseId}):\n${tr.content
            .map((c) => ("text" in c ? c.text : JSON.stringify(c)))
            .join("\n")}`,
        });
      }
      const text = texts.map((b) => ("text" in b ? b.text : "")).join("\n");
      if (text.trim()) out.push({ role: "user", content: text });
    } else {
      // assistant turn: text and/or toolUse requests
      const parts = m.content.map((b) => {
        if (b.type === "textBlock") return "text" in b ? b.text : "";
        if (b.type === "toolUseBlock")
          return `\`\`\`${TOOL_FENCE}\n${JSON.stringify({ tool: b.name, input: b.input })}\n\`\`\``;
        return "";
      });
      const joined = parts.filter(Boolean).join("\n");
      if (joined.trim()) out.push({ role: "assistant", content: joined });
    }
  }
  return out;
}

interface ParsedToolCall {
  tool: string;
  input: unknown;
}

/** Extracts a ```savvy_tool {...}``` fence from model text, if present. */
export function parseToolCallInternal(text: string): ParsedToolCall | null {
  const re = new RegExp("```" + TOOL_FENCE + "\\s*([\\s\\S]*?)```", "i");
  const m = text.match(re);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1].trim()) as ParsedToolCall;
    if (parsed && typeof parsed.tool === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Strands Model provider backed by the vly.ai gateway.
 * Emits the standard Strands streaming events so the Agent loop,
 * limits, and traces operate exactly as with first-party providers.
 */
export class VlyModel extends Model<VlyModelConfig> {
  private config: VlyModelConfig;

  constructor(config: VlyModelConfig = {}) {
    super();
    this.config = {
      modelId: config.modelId ?? "gpt-4o-mini",
      maxTokens: config.maxTokens ?? 700,
      temperature: config.temperature ?? 0.2,
      systemPromptSuffix: config.systemPromptSuffix,
    };
  }

  updateConfig(modelConfig: VlyModelConfig): void {
    this.config = { ...this.config, ...modelConfig };
  }

  getConfig(): VlyModelConfig {
    return this.config;
  }

  async *stream(
    messages: Message[],
    options?: StreamOptions,
  ): AsyncIterable<ModelStreamEvent> {
    const systemPrompt = [
      typeof options?.systemPrompt === "string" ? options.systemPrompt : "",
      this.config.systemPromptSuffix ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const wire = flattenMessages(systemPrompt, options?.toolSpecs ?? [], messages);

    const response = await vlyGateway.ai.completion({
      model: this.config.modelId,
      messages: wire,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    if (!response.success || !response.data) {
      throw new Error(
        `vly.ai completion failed: ${response.error ?? "unknown error"}`,
      );
    }

    const text = response.data.choices[0]?.message?.content ?? "";
    const usage = response.data.usage;
    const meta: { usage?: Usage; metrics?: Metrics } = {};
    if (usage) {
      meta.usage = {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      };
      meta.metrics = { latencyMs: 0 };
    }

    const parsed = options?.toolSpecs?.length
      ? parseToolCallInternal(text)
      : null;

    if (parsed) {
      const toolUseId = `vly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      yield new ModelMessageStartEvent({ type: "modelMessageStartEvent", role: "assistant" });
      yield new ModelContentBlockStartEvent({
        type: "modelContentBlockStartEvent",
        start: { type: "toolUseStart", name: parsed.tool, toolUseId },
      });
      yield new ModelContentBlockDeltaEvent({
        type: "modelContentBlockDeltaEvent",
        delta: { type: "toolUseInputDelta", input: JSON.stringify(parsed.input ?? {}) },
      });
      yield new ModelContentBlockStopEvent({ type: "modelContentBlockStopEvent" });
      yield new ModelMessageStopEvent({
        type: "modelMessageStopEvent",
        stopReason: "toolUse",
      });
      if (meta.usage) yield new ModelMetadataEvent({ type: "modelMetadataEvent", ...meta });
      return;
    }

    // Plain text answer — strip any accidental protocol remnants.
    const clean = text.replace(new RegExp("\`\`\`" + TOOL_FENCE + "[\\s\\S]*?\`\`\`", "g"), "").trim();
    yield new ModelMessageStartEvent({ type: "modelMessageStartEvent", role: "assistant" });
    yield new ModelContentBlockStartEvent({ type: "modelContentBlockStartEvent" });
    yield new ModelContentBlockDeltaEvent({
      type: "modelContentBlockDeltaEvent",
      delta: { type: "textDelta", text: clean },
    });
    yield new ModelContentBlockStopEvent({ type: "modelContentBlockStopEvent" });
    yield new ModelMessageStopEvent({ type: "modelMessageStopEvent", stopReason: "endTurn" });
    if (meta.usage) yield new ModelMetadataEvent({ type: "modelMetadataEvent", ...meta });
  }
}

// ---------------------------------------------------------------------------
// 2. Deterministic agent tools — the engine does ALL math
// ---------------------------------------------------------------------------

export interface AgentWalletContext {
  walletCards: WalletCard[];
  /** Tracked reward balances — powers the rewards_utilization tool. */
  balances?: RewardBalance[];
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Builds the Savvy toolset. Every tool runs the deterministic engine over the
 * verified catalog — the agent orchestrates WHICH analysis to run; it never
 * invents rates or does arithmetic.
 */
export function createSavvyTools(ctx: AgentWalletContext) {
  const optimizePurchaseTool = tool({
    name: "optimize_purchase",
    description:
      "Evaluate the user's wallet for a specific purchase and return the best payment card with its full deterministic breakdown (cashback, points, offers, effective cost). Use for 'which card should I use for X at Y merchant' questions.",
    inputSchema: z.object({
      merchantName: z.string().describe("Merchant name, e.g. Amazon"),
      amount: z.number().positive().describe("Purchase amount in rupees"),
      category: z
        .enum([
          "groceries", "ecommerce", "dining", "travel", "flights", "hotels",
          "fuel", "utilities", "telecom", "subscriptions", "shopping",
          "education", "entertainment", "other",
        ] as const satisfies readonly Category[])
        .describe("Purchase category"),
      channel: z.enum(["online", "offline"]).describe("online or offline"),
    }),
    callback: (input) => {
      const today = new Date().toISOString().slice(0, 10);
      const result = optimizePurchase(
        ctx.walletCards,
        DEMO_CARDS,
        OFFERS,
        {
          merchantName: input.merchantName,
          amount: input.amount,
          category: input.category,
          dateISO: today,
          channel: input.channel,
        },
        DEMO_MERCHANTS,
      );
      return json({
        best: result.best
          ? {
              card: `${result.best.issuer} ${result.best.name}`,
              cashback: result.best.cashback,
              pointsEarned: result.best.points,
              offerApplied: result.best.offer?.title ?? null,
              offerBenefit: result.best.offer?.benefit ?? 0,
              totalEstimatedBenefit: result.best.totalBenefit,
              effectiveCost: result.best.effectiveCost,
              calculationSteps: result.best.steps,
            }
          : null,
        walletAlternatives: result.alternatives.slice(0, 3).map((a) => ({
          card: `${a.issuer} ${a.name}`,
          totalEstimatedBenefit: a.totalBenefit,
        })),
        catalogSuggestions: result.catalogSuggestions.slice(0, 3).map((s) => ({
          card: `${s.issuer} ${s.name}`,
          estimatedBenefit: s.estimatedBenefit,
          annualFee: s.annualFee,
          why: s.why,
        })),
        warnings: result.warnings,
      });
    },
  });

  const bestCardsForMerchantTool = tool({
    name: "best_cards_for_merchant",
    description:
      "Scan the ENTIRE 200+ card catalog (not just the user's wallet) and rank the best cards for a purchase at a merchant by total estimated benefit. Use when the user asks which card is best in general, or their wallet produces no benefit.",
    inputSchema: z.object({
      merchantName: z.string().describe("Merchant name (may be empty for a pure category scan)"),
      amount: z.number().positive().describe("Purchase or monthly-spend amount in rupees"),
      category: z
        .enum([
          "groceries", "ecommerce", "dining", "travel", "flights", "hotels",
          "fuel", "utilities", "telecom", "subscriptions", "shopping",
          "education", "entertainment", "other",
        ] as const satisfies readonly Category[])
        .describe("Category to evaluate"),
    }),
    callback: (input) => {
      const today = new Date().toISOString().slice(0, 10);
      const owned = new Set(ctx.walletCards.map((c) => c.slug));
      const rows = bestCardsForPurchase(
        {
          merchantName: input.merchantName,
          amount: input.amount,
          category: input.category,
          dateISO: today,
          channel: "online",
        },
        DEMO_CARDS,
        OFFERS,
        DEMO_MERCHANTS,
        [...owned],
        6,
      );
      return json({
        categoryLabel: categoryLabel(input.category),
        catalogSize: DEMO_CARDS.length,
        top: rows.map((r, i) => ({
          rank: i + 1,
          card: `${r.issuer} ${r.name}`,
          rewardType: r.rewardType,
          benefitNow: r.nowBenefit,
          benefitDeferred: r.deferredValue,
          totalEstimatedBenefit: r.totalBenefit,
          annualFee: r.annualFee,
          upi: r.card.perks?.upi === true,
          ownedByUser: owned.has(r.slug),
        })),
      });
    },
  });

  const categoryWinnersTool = tool({
    name: "category_winners",
    description:
      "For every spending category, return the catalog-wide best card vs the user's best owned card and the monthly rupee gap. Use for 'where am I leaving money on the table' or 'best card for each category' questions.",
    inputSchema: z.object({}),
    callback: () => {
      const owned = ctx.walletCards.map((c) => c.slug);
      const gaps = categoryGapAnalysis(DEMO_CARDS, OFFERS, DEMO_MERCHANTS, owned);
      return json({
        categories: gaps.map((g) => ({
          category: g.categoryLabel,
          catalogBest: `${g.catalogBest.issuer} ${g.catalogBest.name}`,
          catalogBestBenefit: g.catalogBest.totalBenefit,
          usersBest: g.ownedBest ? `${g.ownedBest.issuer} ${g.ownedBest.name}` : null,
          monthlyGapIfUpgraded: g.monthlyGap,
        })),
      });
    },
  });

  const fastestEarnersTool = tool({
    name: "fastest_earners",
    description:
      "Rank catalog cards by how fast they earn rewards (cashback, points or miles value per ₹10,000) in a category. Use for 'which card earns points fastest' questions.",
    inputSchema: z.object({
      category: z
        .enum([
          "groceries", "ecommerce", "dining", "travel", "flights", "hotels",
          "fuel", "utilities", "telecom", "subscriptions", "shopping",
          "education", "entertainment", "other",
        ] as const satisfies readonly Category[])
        .describe("Category to rank"),
    }),
    callback: (input) => {
      const rows = bestEarnersForCategory(input.category, DEMO_CARDS, 6);
      return json({
        categoryLabel: categoryLabel(input.category),
        top: rows.map((r, i) => ({
          rank: i + 1,
          card: `${r.issuer} ${r.name}`,
          rateLabel: r.rateLabel,
          valuePer10k: r.valuePer10k,
          annualFee: r.annualFee,
          upi: r.card.perks?.upi === true,
        })),
      });
    },
  });

  const walletSummaryTool = tool({
    name: "wallet_summary",
    description:
      "Return the user's wallet: every card (issuer, name, reward type, annual fee, UPI support) and which are active. Use for questions about what the user owns.",
    inputSchema: z.object({}),
    callback: () => {
      return json({
        totalCards: ctx.walletCards.length,
        cards: ctx.walletCards.map((c) => {
          const demo = DEMO_CARDS.find((d) => d.slug === c.slug);
          return {
            nickname: c.nickname ?? null,
            issuer: demo?.issuer ?? "Unknown",
            name: demo?.name ?? c.slug,
            rewardType: demo?.rewardType ?? "unknown",
            annualFee: demo?.annualFee ?? 0,
            upi: demo?.perks?.upi === true,
            active: c.active,
          };
        }),
      });
    },
  });

  /**
   * Rewards-utilization advisor — the deterministic core of "how do I best
   * use my points?". For every tracked balance: the program's per-point
   * value, ranked redemption routes with estimated rupee values, points at
   * expiry risk, and which catalog card earns that currency fastest.
   */
  const rewardsUtilizationTool = tool({
    name: "rewards_utilization",
    description:
      "For each reward program balance the user tracks (points/miles/cashback): value per point, ranked redemption routes with estimated rupee values, points expiring soon, and which catalog card earns that currency fastest. Use for 'how should I use my points', 'am I wasting rewards', 'best way to redeem' questions.",
    inputSchema: z.object({}),
    callback: () => {
      const rows = (ctx.balances ?? []).map((b) => {
        const program = getProgram(b.programId);
        const kind = program?.kind ?? "points";
        const balance = b.points ?? 0;
        /** Top catalog earners for this currency — where to EARN more. */
        const earnFastestWith = bestEarnersForRewardKind(kind, DEMO_CARDS, 2).map(
          (e) => ({
            card: `${e.issuer} ${e.name}`,
            valuePer10k: e.valuePer10k,
            annualFee: e.annualFee,
          }),
        );
        if (!program) return { programId: b.programId, points: b.points };
        if (program.kind === "cashback") {
          // Cashback needs no redemption — but live offers on owned cards are
          // still free value worth claiming alongside it.
          const boosters = rankedRedemptions(program.id, b.points ?? 0, {
            ownedCards: ctx.walletCards.map((c) => ({ slug: c.slug })),
            todayISO: new Date().toISOString().slice(0, 10),
          }).affordable.filter((o) => o.category === "offer");
          return {
            program: program.name,
            issuer: program.issuer,
            kind,
            balance: b.points,
            rupeeValue: b.points,
            bestRoute:
              "Statement credit — auto-credits quarterly (₹1 cashback = ₹1), no action needed",
            freeOfferBoosters: boosters.map((o) => ({
              reward: o.title,
              estValue: o.estValue,
              claimAt: o.whereToClaim,
              howToClaim: o.claimSteps,
              deadline: o.offerBoost?.endsAt ?? null,
            })),
            expiringPoints: b.expiringPoints ?? null,
            expiresAt: b.expiresAt ?? null,
            earnFastestWith,
          };
        }
        const pv = program.demoPointValue;
        if (!pv) {
          return {
            program: program.name,
            issuer: program.issuer,
            kind,
            balance: b.points,
            note: "Per-point value unavailable — verify with the issuer before redeeming.",
            expiringPoints: b.expiringPoints ?? null,
            earnFastestWith,
          };
        }
        // Dynamic planner: what the balance can actually get NOW — vouchers,
        // live offer boosters claimable with the user's own cards, and travel
        // conversions — with claim location + steps. Same deterministic math
        // as the Rewards Vault advisor (rankedRedemptions).
        const { affordable, nearlyThere } = rankedRedemptions(program.id, balance, {
          ownedCards: ctx.walletCards.map((c) => ({ slug: c.slug })),
          todayISO: new Date().toISOString().slice(0, 10),
        });
        return {
          program: program.name,
          issuer: program.issuer,
          kind,
          balance,
          valuePerPoint: pv,
          affordableNow: affordable.slice(0, 8).map((o) => ({
            reward:
              o.pointsRequired > 0
                ? `${o.emoji} ${o.title} (${o.pointsRequired.toLocaleString("en-IN")} ${kind} ≈ ₹${o.estValue.toLocaleString("en-IN")})`
                : `${o.emoji} ${o.title} (FREE — no points, ≈ ₹${o.estValue.toLocaleString("en-IN")} extra value)`,
            example: o.example,
            claimAt: o.whereToClaim,
            howToClaim: o.claimSteps,
            deadline: o.offerBoost?.endsAt ?? null,
          })),
          nearlyThere: nearlyThere.map(({ option, pointsGap }) => ({
            reward: `${option.emoji} ${option.title}`,
            pointsGap,
          })),
          note: "Options come from the deterministic redemption planner; values derive from the program's verified per-point value and today's live offer windows. Partner transfer charts are not included — verify live before transferring.",
          expiringPoints: b.expiringPoints ?? null,
          expiresAt: b.expiresAt ?? null,
          earnFastestWith,
        };
      });
      return json({
        programs: rows,
        totalPoints: rows.reduce((s, r) => s + ((r as { balance?: number }).balance ?? 0), 0),
      });
    },
  });

  return [
    optimizePurchaseTool,
    bestCardsForMerchantTool,
    categoryWinnersTool,
    fastestEarnersTool,
    walletSummaryTool,
    rewardsUtilizationTool,
  ];
}

// ---------------------------------------------------------------------------
// 3. The Savvy agent
// ---------------------------------------------------------------------------

export const SAVVY_AGENT_SYSTEM_PROMPT = `You are Savvy's AI wallet agent, orchestrated by the AWS Strands Agents SDK.

Your job: answer the user's question about their cards, rewards, offers and savings as accurately as possible.

Hard rules:
- Ground EVERY number in tool results or the USER WALLET CONTEXT message. Call a tool when the data isn't already in front of you — especially before answering questions about specific cards, categories, purchases or redemption routes.
- NEVER invent card names, rates, caps, offers or point values. NEVER do arithmetic yourself — restate numbers from tool results verbatim.
- If a tool returned the data, answer confidently and name the specific cards and issuers.
- If no tool covers the question (e.g. live partner transfer charts), say: "Unable to calculate accurately with the available information."
- Be concise: under 130 words, friendly and practical. Use Indian Rupee formatting like ₹1,100. Suggest the relevant Savvy page (Purchase Optimizer, Rewards Vault, Insights, Offers) when useful.`;

/** Per-invocation agent loop safety limits. */
export const SAVVY_AGENT_LIMITS = {
  /** Max model+tool turns — keeps latency bounded in a serverless action. */
  turns: 4,
  /** Max cumulative generated tokens across the loop. */
  outputTokens: 1400,
} as const;

/**
 * Creates a fresh Strands Agent wired to the vly gateway and Savvy's
 * deterministic tools. A new instance per invocation keeps conversation state
 * clean inside stateless Convex actions.
 */
export function createSavvyAgent(ctx: AgentWalletContext): Agent {
  return new Agent({
    model: new VlyModel({ modelId: "gpt-4o-mini", maxTokens: 700, temperature: 0.2 }),
    systemPrompt: SAVVY_AGENT_SYSTEM_PROMPT,
    tools: createSavvyTools(ctx),
    printer: false,
  });
}

/**
 * A prior assistant/user turn from the client conversation. Plain text only —
 * tool traces and internal blocks never cross the wire.
 */
export interface SavvyAgentMessage {
  role: "user" | "assistant";
  text: string;
}

/**
 * Builds the opening context message (wallet + balances + plan) that gets
 * seeded into a fresh agent as a user turn before the conversation history.
 */
export function buildSavvyContextMessage(ctx: AgentWalletContext): string {
  const cards = ctx.walletCards.map((c) => {
    const d = DEMO_CARDS.find((x) => x.slug === c.slug);
    return `${d?.issuer ?? "?"} ${d?.name ?? c.slug}${c.active ? "" : " (inactive)"}`;
  });
  const balances = (ctx.balances ?? []).map((b) => {
    const p = getProgram(b.programId);
    const kind = p?.kind === "cashback" ? "cashback" : p?.kind === "miles" ? "miles" : "points";
    const exp = b.expiringPoints ? ` — ${b.expiringPoints.toLocaleString("en-IN")} expiring ${b.expiresAt ?? "soon"}` : "";
    return `${p?.name ?? b.programId}: ${(b.points ?? 0).toLocaleString("en-IN")} ${kind}${exp}`;
  });
  return [
    "USER WALLET CONTEXT (verified catalog data — never contradict or re-derive these numbers):",
    `- Cards owned (${cards.length}): ${cards.length > 0 ? cards.join("; ") : "none yet"}`,
    `- Reward balances: ${balances.length > 0 ? balances.join("; ") : "none tracked yet"}`,
    "- Use your tools for any analysis this summary doesn't already cover.",
  ].join("\n");
}

/**
 * Seeds a fresh agent with the wallet context and prior conversation turns so
 * multi-turn questions like "why that one?" resolve against real history.
 */
export function seedAgentHistory(
  agent: Agent,
  ctx: AgentWalletContext,
  history: SavvyAgentMessage[],
): void {
  const seed: Message[] = [
    new Message({ role: "user", content: [new TextBlock(buildSavvyContextMessage(ctx))] }),
  ];
  for (const h of history) {
    const text = h.text.trim();
    if (text) seed.push(new Message({ role: h.role, content: [new TextBlock(text)] }));
  }
  agent.messages.push(...seed);
}

// --- test seam: allows the smoke test to swap the vly.ai gateway ----------
// (implemented via the module-level vlyGateway variable above)

