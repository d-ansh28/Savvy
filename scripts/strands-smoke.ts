/**
 * Local smoke test for the Strands integration (run: bun scripts/strands-smoke.ts).
 * Verifies, without network access:
 *  1. parseToolCall extraction from model text
 *  2. VlyModel emits a valid Strands event stream for a mocked vly.ai response
 *  3. The real Agent loop executes a scripted model → toolUse → deterministic
 *     engine tool → final answer, exactly as it will in the Convex action
 */
import { Agent, Model, Message, TextBlock } from "@strands-agents/sdk";
import type { ModelStreamEvent, StreamOptions } from "@strands-agents/sdk";
import {
  VlyModel,
  parseToolCallInternal,
  createSavvyTools,
  seedAgentHistory,
  buildSavvyContextMessage,
} from "../src/lib/savvyAgent";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- 1. Tool-call fence parsing -------------------------------------------
console.log("1. parseToolCall");
{
  const good = 'Here is my answer\n```savvy_tool\n{"tool":"category_winners","input":{}}\n```';
  const parsed = parseToolCallInternal(good);
  check("extracts tool+input from fence", parsed?.tool === "category_winners");

  const plain = "Just a normal answer with ```code``` inside.";
  check("ignores non-tool fences", parseToolCallInternal(plain) === null);

  const broken = '```savvy_tool\n{not json}\n```';
  check("returns null on malformed JSON", parseToolCallInternal(broken) === null);

  const noFence = "I should just answer directly.";
  check("returns null on plain text", parseToolCallInternal(noFence) === null);
}

// --- 2. VlyModel streaming against a mocked vly.ai -------------------------
console.log("2. VlyModel event stream");
{
  const calls: unknown[] = [];
  const fakeVly = {
    ai: {
      completion: async (req: unknown) => {
        calls.push(req);
        return {
          success: true,
          data: {
            id: "test",
            choices: [{ message: { role: "assistant", content: "Plain grounded answer." }, finishReason: "stop" }],
            usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
          },
        };
      },
    },
  };

  // Temporarily swap the module's vly reference via dependency seam.
  setVlyForTest(fakeVly as never);

  const model = new VlyModel({ modelId: "gpt-4o-mini" });
  const messages = [new Message({ role: "user", content: [new TextBlock("Hello")] })];
  const events: ModelStreamEvent[] = [];
  for await (const ev of model.stream(messages, { systemPrompt: "sys" })) events.push(ev);

  check("emits messageStart", events[0]?.type === "modelMessageStartEvent");
  check(
    "emits textDelta",
    events.some((e) => e.type === "modelContentBlockDeltaEvent" && (e as { delta?: { type?: string } }).delta?.type === "textDelta"),
  );
  check(
    "ends with endTurn",
    events.some((e) => e.type === "modelMessageStopEvent" && (e as { stopReason?: string }).stopReason === "endTurn"),
  );
  check("calls vly.ai once", calls.length === 1, `got ${calls.length}`);
  check("no tool protocol injected without toolSpecs", !JSON.stringify(calls[0]).includes("savvy_tool"));

  // With toolSpecs the protocol must ride along in the system message.
  const tools = createSavvyTools({ walletCards: [] });
  const events2: ModelStreamEvent[] = [];
  for await (const ev of model.stream(messages, {
    systemPrompt: "sys",
    toolSpecs: tools.map((t) => t.toolSpec),
  })) {
    events2.push(ev);
  }
  check(
    "tool protocol injected with toolSpecs",
    JSON.stringify(calls[1]).includes("savvy_tool") && JSON.stringify(calls[1]).includes("category_winners"),
  );
  check(
    "plain text still ends endTurn with tools present",
    events2.some((e) => e.type === "modelMessageStopEvent" && (e as { stopReason?: string }).stopReason === "endTurn"),
  );
}

// --- 3. Full Agent loop with a scripted model -------------------------------
console.log("3. Agent loop (toolUse → deterministic tool → final answer)");
{
  const script: Array<{ text: string; stopReason: "toolUse" | "endTurn" }> = [
    { text: '```savvy_tool\n{"tool":"best_cards_for_merchant","input":{"merchantName":"Amazon","amount":10000,"category":"ecommerce"}}\n```', stopReason: "toolUse" },
    { text: "For ₹10,000 on Amazon, the catalog winner is the top-ranked card from the engine tool result; it earns the highest estimated benefit per the verified catalog.", stopReason: "endTurn" },
  ];
  let step = 0;

  class ScriptedModel extends Model<never> {
    config = {};
    updateConfig(c: never) { this.config = c; }
    getConfig() { return this.config; }
    async *stream(_messages: Message[], _options?: StreamOptions): AsyncIterable<ModelStreamEvent> {
      const s = script[Math.min(step++, script.length - 1)];
      const { ModelMessageStartEvent, ModelContentBlockStartEvent, ModelContentBlockDeltaEvent, ModelContentBlockStopEvent, ModelMessageStopEvent } =
        await import("@strands-agents/sdk");
      yield new ModelMessageStartEvent({ type: "modelMessageStartEvent", role: "assistant" });
      if (s.stopReason === "toolUse") {
        yield new ModelContentBlockStartEvent({
          type: "modelContentBlockStartEvent",
          start: { type: "toolUseStart", name: "best_cards_for_merchant", toolUseId: `tid-${step}` },
        });
        yield new ModelContentBlockDeltaEvent({
          type: "modelContentBlockDeltaEvent",
          delta: { type: "toolUseInputDelta", input: '{"merchantName":"Amazon","amount":10000,"category":"ecommerce"}' },
        });
        yield new ModelContentBlockStopEvent({ type: "modelContentBlockStopEvent" });
        yield new ModelMessageStopEvent({ type: "modelMessageStopEvent", stopReason: "toolUse" });
      } else {
        yield new ModelContentBlockStartEvent({ type: "modelContentBlockStartEvent" });
        yield new ModelContentBlockDeltaEvent({ type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: s.text } });
        yield new ModelContentBlockStopEvent({ type: "modelContentBlockStopEvent" });
        yield new ModelMessageStopEvent({ type: "modelMessageStopEvent", stopReason: "endTurn" });
      }
    }
  }

  const agent = new Agent({
    model: new ScriptedModel(),
    systemPrompt: "test",
    tools: createSavvyTools({ walletCards: [{ slug: "hdfc-millennia", active: true }] }),
    printer: false,
  });
  const result = await agent.invoke("Best card for Amazon ₹10,000?", { limits: { turns: 4, outputTokens: 2000 } });

  check("loop completes with endTurn", result.stopReason === "endTurn", `got ${result.stopReason}`);
  const toolUses = agent.messages.flatMap((m) => m.content).filter((b) => b.type === "toolUseBlock");
  check("agent issued exactly one toolUse", toolUses.length === 1, `got ${toolUses.length}`);
  const toolResults = agent.messages.flatMap((m) => m.content).filter((b) => b.type === "toolResultBlock");
  check("tool produced a success result", (toolResults[0] as { status?: string } | undefined)?.status === "success");
  const resultText = JSON.stringify((toolResults[0] as { content?: { text?: string }[] } | undefined)?.content ?? []);
  check("tool ran the REAL engine over the REAL catalog", resultText.includes("Amazon") && resultText.includes("totalEstimatedBenefit"));
  check("final answer present", result.lastMessage.content.some((b) => b.type === "textBlock" && "text" in b && b.text.length > 20));
}

// --- 4. rewards_utilization tool + history seeding -------------------------
console.log("4. rewards_utilization tool & multi-turn seeding");
{
  const tools = createSavvyTools({
    walletCards: [{ slug: "hdfc-millennia", active: true }],
    balances: [
      { programId: "amex-mr", points: 48000, expiresAt: "2026-10-31", expiringPoints: 8000 },
    ],
  });
  const rewardsTool = tools.find((t) => t.toolSpec.name === "rewards_utilization");
  check("rewards_utilization tool registered", rewardsTool !== undefined);

  if (rewardsTool) {
    // invoke() returns the unwrapped callback value — the tool's JSON string.
    const text = String(await rewardsTool.invoke({}));
    // 48,000 MR pts @ ₹0.4 → voucher ladder + travel conversions all live;
    // the tool must surface concrete claimable rewards, not generic percents.
    check("returns concrete claimable rewards", text.includes("affordableNow") && text.includes("Amazon Pay"));
    check("includes claim location + full steps", text.includes("claimAt") && text.includes("howToClaim"));
    check("uses the real balance + point value", text.includes("48000") && text.includes('"valuePerPoint":0.4'));
    check("surfaces expiring points", text.includes("8000"));
    check("lists fastest catalog earners", text.includes("earnFastestWith"));
  }

  // The tiered award planner itself: per-program ladders, deterministic math.
  {
    const { redemptionOptionsForBalance } = await import("../src/lib/redemptions");
    const amex = redemptionOptionsForBalance("amex-mr", 50_000);
    const amexReturn = amex.find((o) => o.title === "Domestic return flight");
    check("amex ladder: return flight tier present", amexReturn !== undefined);
    check(
      "points derived from per-point value (₹7,500 @ ₹0.4 = 18,750)",
      amexReturn?.pointsRequired === 18_750,
    );
    check("amex ladder has claim steps", (amexReturn?.claimSteps.length ?? 0) >= 2);
    const neu = redemptionOptionsForBalance("tata-neu", 50_000);
    const neuReturn = neu.find((o) => o.title === "Domestic return flight");
    check(
      "same award costs fewer NeuCoins (₹7,500 @ ₹1.0 = 7,500)",
      neuReturn?.pointsRequired === 7_500,
    );
    check(
      "ladders differ per program (claims + unit)",
      amexReturn?.whereToClaim !== neuReturn?.whereToClaim,
    );
    check("no spend-offer category in the planner", !amex.some((o) => (o.category as string) === "offer"));
    const cashback = redemptionOptionsForBalance("hdfc-cashback", 2_000);
    check(
      "cashback gets honest single-step statement credit",
      cashback.length === 1 &&
        cashback[0].category === "statement" &&
        cashback[0].claimSteps.length === 1,
    );
    const poor = redemptionOptionsForBalance("amex-mr", 3_000);
    const poorAffordable = poor.filter((o) => o.pointsRequired <= 3_000);
    check(
      "small balance: only small vouchers affordable, big awards gated",
      poorAffordable.length > 0 &&
        poorAffordable.every((o) => o.category === "voucher") &&
        poor.some((o) => o.pointsRequired > 3_000),
    );
  }

  // History seeding: context message + prior turns, in order.
  const agent = new Agent({
    model: new VlyModel({ modelId: "gpt-4o-mini" }),
    systemPrompt: "test",
    tools: createSavvyTools({ walletCards: [{ slug: "hdfc-millennia", active: true }] }),
    printer: false,
  });
  seedAgentHistory(
    agent,
    { walletCards: [{ slug: "hdfc-millennia", active: true }] },
    [
      { role: "user", text: "Best card for dining?" },
      { role: "assistant", text: "The HDFC Millennia wins for dining." },
    ],
  );
  check(
    "context message seeded first",
    agent.messages[0]?.content.some(
      (b) => b.type === "textBlock" && "text" in b && b.text.startsWith("USER WALLET CONTEXT"),
    ),
  );
  check("history turns seeded in order", agent.messages.length === 3);
  check(
    "context message lists owned cards",
    (agent.messages[0]?.content[0] as { text?: string } | undefined)?.text.includes("HDFC Bank Millennia") === true,
  );
  check("context builder works standalone", buildSavvyContextMessage({ walletCards: [] }).includes("none yet"));
}

console.log(failures === 0 ? "\nAll Strands smoke tests passed." : `\n${failures} FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);

// --- test seam: swap the vly singleton --------------------------------------
import * as savvy from "../src/lib/savvyAgent";
function setVlyForTest(fake: unknown) {
  (savvy as unknown as { __setVlyForTest: (v: unknown) => void }).__setVlyForTest(fake);
}
