import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { build } from "esbuild";

const quotes = JSON.parse(readFileSync(new URL("../../src/llm/inspiration-quotes.json", import.meta.url)));
const requests = [];
let failNext = false;
globalThis.__inspirationTest = (options) => {
  requests.push(options);
  if (failNext) {
    failNext = false;
    throw Object.assign(new Error("Invalid output"), { schemaFailure: true, text: "{}" });
  }
  if (options.system.startsWith("You are a theme generator")) {
    return { output: { geography: "stone hills", cultural_tone: "oaths", description: "A new home" } };
  }
  return { output: { ok: true } };
};

const result = await build({
  stdin: {
    contents: 'export * from "./src/llm/calls.ts"; export * from "./src/debug/generation-debug.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [{
    name: "fake-ai",
    setup(builder) {
      builder.onLoad({ filter: /\/inspiration\.ts$/ }, ({ path }) => ({
        contents: readFileSync(path, "utf8").replace(
          "const quotes = await corpus;",
          "await globalThis.__inspirationLoadGate; const quotes = await corpus;",
        ),
        loader: "ts",
        resolveDir: new URL("../../src/llm", import.meta.url).pathname,
      }));
      builder.onResolve({ filter: /^(ai|\.\/client)$/ }, (args) => ({
        path: args.path, namespace: "fake-ai",
      }));
      builder.onLoad({ filter: /.*/, namespace: "fake-ai" }, ({ path }) => ({
        contents: path === "ai" ? `
          export const Output = { object: () => ({}) };
          export const NoObjectGeneratedError = { isInstance: e => !!e.schemaFailure };
          export const generateText = async options => globalThis.__inspirationTest(options);
          export const streamText = options => {
            const result = globalThis.__inspirationTest(options);
            return { output: Promise.resolve(result.output),
              partialOutputStream: (async function* () { yield result.output; })() };
          };
        ` : "export const createModel = () => ({});",
      }));
    },
  }],
});
const calls = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const state = {
  current_year: 1, current_season: "spring", phase: "event_loading",
  resources: { people: 5, wealth: 5, magic: 5, reputation: 5 },
  magic_allocation: { war: 1, harvest: 1, diplomacy: 1 },
  clan_relationships: [], active_storylines: [], flags: [],
  event_history: [], full_history: [], resolved_storylines: [], last_event_type: null,
  world: {
    setting: { name: "Ridge", tone: "mythic", geography: "stone hills" },
    clan: { name: "Hearth", backstory: "New settlers" },
    mythology: { pantheon_summary: "Spirits of stone", key_deities: [] },
    looming_threat: { name: "Frost", description: "Endless winter", nature: "supernatural" },
    advisors: [], neighboring_clans: [],
  },
};
const director = {
  event_type: "trade", involves_clans: [], season_context: "spring", threat_foreshadowing: null,
  options: Array.from({ length: 3 }, () => ({ summary: "Offer grain", tone: "cautious" })),
};
const choice = {
  event_title: "Trade", chosen_option_text: "Offer grain", chosen_option_summary: "Trade grain",
  resource_effects: { people: 0, wealth: 1, magic: 0, reputation: 0 },
  relationship_effects: [], flags_added: [], isPlayerAction: false,
};

function assertInspired(request) {
  assert.equal(request.prompt.split("INSPIRATION:").length, 2);
  const passage = request.prompt.split('"""')[1].trim();
  assert.ok(quotes.some((quote) => quote.text === passage));
}

test("the corpus contains 500–1000 distinct, traceable excerpts", () => {
  assert.ok(quotes.length >= 500 && quotes.length <= 1000);
  assert.equal(new Set(quotes.map((quote) => quote.text)).size, quotes.length);
  assert.equal(new Set(quotes.map((quote) => quote.id)).size, quotes.length);
  for (const quote of quotes) {
    assert.match(quote.id, /^\d+:\d+-\d+$/);
    assert.ok(quote.text.length >= 150 && quote.text.length <= 1500);
    assert.ok(quote.title && quote.author);
  }
});

test("every generation entry point includes a corpus passage, including the first call", async () => {
  const countBefore = requests.length;
  for (const [name, args] of [
    ["generateWorld", []], ["generateDirectorEvent", [state]],
    ["generateDirectorAction", [state, "trade", "Trade grain", "Visit the market"]],
    ["generateNarration", [state, director, false]],
    ["generateSacredTime", [state]], ["generateConsequence", [state, choice]],
    ["generateEpilogue", [state]], ["generateThemeWithSeeds", []],
  ]) {
    await calls[name](...args);
  }
  assert.equal(requests.length - countBefore, 9);
  requests.slice(countBefore).forEach(assertInspired);
  const event = requests.slice(countBefore).find((request) => request.prompt.includes("next seasonal event"));
  assert.ok(event.prompt.includes("CREATIVE SEEDS"));
  assert.ok(event.prompt.includes("Situation:"));
  const recorded = calls.getGenerationRecords().find((record) => record.prompt === event.prompt);
  assert.equal(recorded.status, "complete");
  assert.equal(recorded.year, 1);
  assert.equal(recorded.season, "spring");
  assert.ok(recorded.seeds.Situation && recorded.seeds.Tension && recorded.seeds.Scope);
  assert.ok(recorded.inspiration.includes('"""'));
  assert.deepEqual(recorded.input_state, state);
  assert.deepEqual(recorded.output, { ok: true });
  assert.equal(calls.isDebugEnabled(), false);
});

test("all streaming entry points preserve partial and final output", async () => {
  for (const [name, args] of [
    ["streamWorldGeneration", [{ geography: "ridge", cultural_tone: "oaths" }]],
    ["streamNarration", [state, director, false]], ["streamSacredTime", [state]],
    ["streamConsequence", [state, choice]], ["streamEpilogue", [state]],
  ]) {
    const handle = calls[name](...args);
    assert.equal(typeof handle.abort, "function");
    assert.deepEqual(await Array.fromAsync(handle.partialStream), [{ ok: true }]);
    assert.deepEqual(await handle.finalOutput, { ok: true });
    assertInspired(requests.at(-1));
  }
});

test("abort during quote loading prevents a streaming AI request", async () => {
  const countBefore = requests.length;
  let release;
  globalThis.__inspirationLoadGate = new Promise((resolve) => { release = resolve; });
  const handle = calls.streamWorldGeneration({});
  handle.abort();
  try {
    await assert.rejects(handle.finalOutput, { name: "AbortError" });
    await assert.rejects(Array.fromAsync(handle.partialStream), { name: "AbortError" });
    assert.equal(requests.length, countBefore);
  } finally {
    delete globalThis.__inspirationLoadGate;
    release();
  }
});

test("inspiration loading errors reach callers without an uninspired AI request", async () => {
  const countBefore = requests.length;
  const error = new Error("Corpus unavailable");
  globalThis.__inspirationLoadGate = Promise.reject(error);
  const handle = calls.streamWorldGeneration({});
  try {
    await assert.rejects(handle.finalOutput, error);
    await assert.rejects(Array.fromAsync(handle.partialStream), error);
    await assert.rejects(calls.generateDirectorEvent(state), error);
    assert.equal(requests.length, countBefore);
  } finally {
    delete globalThis.__inspirationLoadGate;
  }
});

test("schema retries keep the original passage", async () => {
  const recordCount = calls.getGenerationRecords().length;
  failNext = true;
  await calls.generateDirectorEvent(state);
  const [first, retry] = requests.slice(-2);
  assertInspired(first);
  assertInspired(retry);
  assert.ok(retry.prompt.startsWith(first.prompt));
  assert.equal(first.prompt.split('"""')[1], retry.prompt.split('"""')[1]);
  assert.equal(calls.getGenerationRecords().length, recordCount + 1);
  assert.equal(calls.getGenerationRecords().at(-1).status, "complete");
  const attempts = calls.getGenerationRecords().at(-1).attempts;
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].status, "error");
  assert.equal(attempts[0].raw_response, "{}");
  assert.equal(attempts[1].prompt, retry.prompt);
  assert.equal(attempts[1].status, "complete");
});

test("abort after streaming startup reaches the model's abort signal", async () => {
  const handle = calls.streamWorldGeneration({});
  await handle.finalOutput;
  const request = requests.at(-1);
  assert.equal(request.abortSignal.aborted, false);
  handle.abort();
  assert.equal(request.abortSignal.aborted, true);
});

test("a stream schema retry keeps its passage", async () => {
  // The fake SDK's final result rejects, while its partial stream remains readable.
  const original = globalThis.__inspirationTest;
  let first = true;
  globalThis.__inspirationTest = (options) => {
    if (!first) return original(options);
    first = false;
    requests.push(options);
    return { output: Promise.reject(Object.assign(new Error("Invalid output"), {
      schemaFailure: true, text: "{}",
    })) };
  };
  try {
    const recordCount = calls.getGenerationRecords().length;
    assert.deepEqual(await calls.streamWorldGeneration({}).finalOutput, { ok: true });
    const [initial, retry] = requests.slice(-2);
    assert.equal(initial.prompt.split('"""')[1], retry.prompt.split('"""')[1]);
    assert.equal(calls.getGenerationRecords().length, recordCount + 1);
  } finally {
    globalThis.__inspirationTest = original;
  }
});

test("abort while a stream schema retry is pending cancels that request", async () => {
  const original = globalThis.__inspirationTest;
  let startedRetry;
  const retryReady = new Promise((resolve) => { startedRetry = resolve; });
  let attempt = 0;
  globalThis.__inspirationTest = (options) => {
    requests.push(options);
    if (attempt++ === 0) {
      return { output: Promise.reject(Object.assign(new Error("Invalid output"), {
        schemaFailure: true, text: "{}",
      })) };
    }
    assert.ok(options.abortSignal);
    startedRetry();
    return new Promise((_, reject) => {
      options.abortSignal.addEventListener("abort", () => reject(options.abortSignal.reason), { once: true });
    });
  };
  try {
    const countBefore = requests.length;
    const handle = calls.streamWorldGeneration({});
    const rejected = assert.rejects(handle.finalOutput, { name: "AbortError" });
    await retryReady;
    handle.abort();
    await rejected;
    assert.equal(requests.length, countBefore + 2);
    assert.equal(calls.getGenerationRecords().at(-1).status, "error");
    assert.equal(calls.getGenerationRecords().at(-1).attempts.at(-1).status, "error");
  } finally {
    globalThis.__inspirationTest = original;
  }
});
