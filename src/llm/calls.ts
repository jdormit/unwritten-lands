import { generateText, streamText, Output, NoObjectGeneratedError } from "ai";
import type { DeepPartial, LanguageModel } from "ai";
import type { ZodType } from "zod";
import {
  worldGenerationSchema,
  directorOutputSchema,
  narratorOutputSchema,
  sacredTimeOutputSchema,
  epilogueOutputSchema,
  consequenceOutputSchema,
  themeSchema,
} from "../types/schemas";
import type {
  ThemeSeed,
} from "../types/schemas";
import type {
  WorldGeneration,
  DirectorOutput,
  NarratorOutput,
  SacredTimeOutput,
  EpilogueOutput,
  ConsequenceOutput,
  ChoiceResult,
  GameState,
} from "../types/game";
import { createModel } from "./client";
import {
  THEME_GEN_SYSTEM,
  buildThemeGenPrompt,
  WORLD_GEN_SYSTEM,
  buildWorldGenPrompt,
  getDirectorSystemPrompt,
  getDirectorEventPrompt,
  getDirectorActionPrompt,
  getNarratorSystemPrompt,
  getNarratorPrompt,
  getSacredTimeSystemPrompt,
  getSacredTimePrompt,
  getEpilogueSystemPrompt,
  getEpiloguePrompt,
  getConsequenceSystemPrompt,
  getConsequencePrompt,
} from "./prompts";
import {
  TERRAIN_SEEDS,
  CULTURE_SEEDS,
  MYTHIC_TONE_SEEDS,
  pickRandom,
} from "./theme-seeds";
import { withInspiration } from "./inspiration";
import {
  beginGeneration, finishGeneration, failGeneration,
  beginAttempt, completeAttempt, failAttempt,
} from "../debug/generation-debug";

// ============================================================
// Schema-aware retry helpers
// ============================================================

/**
 * Format Zod validation errors into a concise, LLM-readable string.
 */
function formatZodErrors(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
    return issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `- ${path}: ${issue.message}`;
      })
      .join("\n");
  }
  return String(error);
}

/**
 * Build a retry prompt that includes the original prompt plus feedback
 * about validation errors from the previous attempt.
 */
function buildRetryPrompt(originalPrompt: string, rawJson: string, validationErrors: string): string {
  // Truncate JSON if very long to avoid exceeding context limits
  const truncatedJson = rawJson.length > 2000
    ? rawJson.slice(0, 2000) + "\n... [truncated]"
    : rawJson;

  return `${originalPrompt}

IMPORTANT CORRECTION: Your previous response was valid JSON but FAILED schema validation. You MUST fix these specific errors in your new response:

VALIDATION ERRORS:
${validationErrors}

YOUR PREVIOUS (INVALID) RESPONSE:
${truncatedJson}

Generate a corrected response that fixes ALL of the above validation errors while preserving the creative content.`;
}

interface GenerationOptions<T> {
  model: LanguageModel;
  system: string;
  prompt: string | Promise<string>;
  schema: ZodType<T>;
  errorLabel: string;
  state?: GameState;
  debugRecordId?: number;
  abortSignal?: AbortSignal;
}

async function generateWithSchemaRetry<T>(options: GenerationOptions<T>): Promise<T> {
  const prompt = await options.prompt;
  const id = options.debugRecordId ?? beginGeneration(options.errorLabel, options.system, prompt, options.state);
  try {
    const output = await requestWithSchemaRetry({ ...options, prompt, debugRecordId: id });
    if (options.debugRecordId === undefined) finishGeneration(id, output);
    return output;
  } catch (error) {
    if (options.debugRecordId === undefined) failGeneration(id, error);
    throw error;
  }
}

async function requestWithSchemaRetry<T>(options: GenerationOptions<T> & { debugRecordId: number }): Promise<T> {
  const { model, system, schema, errorLabel } = options;
  let prompt = await options.prompt;
  const id = options.debugRecordId;
  for (let attempt = 0; attempt < 2; attempt++) {
    options.abortSignal?.throwIfAborted();
    const attemptId = beginAttempt(id, prompt, "nonstream");
    try {
      const result = await generateText({
        model,
        system,
        prompt,
        output: Output.object({ schema }),
        abortSignal: options.abortSignal,
      });
      options.abortSignal?.throwIfAborted();
      completeAttempt(id, attemptId, result.output);
      return result.output;
    } catch (error) {
      const schemaFailure = NoObjectGeneratedError.isInstance(error);
      const rawText = schemaFailure ? error.text ?? "" : undefined;
      const feedback = schemaFailure ? formatZodErrors(error.cause) : undefined;
      failAttempt(id, attemptId, error, rawText, feedback);
      options.abortSignal?.throwIfAborted();
      if (!schemaFailure) throw error;
      if (attempt === 1) {
        throw new Error(`${errorLabel}: schema validation failed after retry.\nErrors:\n${feedback}`);
      }
      console.warn(`${errorLabel}: schema validation failed, retrying with feedback.\nErrors:\n${feedback}`);
      prompt = buildRetryPrompt(prompt, rawText!, feedback!);
    }
  }
  throw new Error(`No structured output received from ${errorLabel}`);
}

// ============================================================
// Streaming helper type
// ============================================================

export interface StreamHandle<T> {
  /** Async iterable of partial objects as they stream in */
  partialStream: AsyncIterable<DeepPartial<T>>;
  /** Promise that resolves with the final validated output */
  finalOutput: Promise<T>;
  /** Abort the stream */
  abort: () => void;
}

/**
 * Stream structured output with schema-aware retry on final validation.
 *
 * Streams partial output for the UI, then validates the final result.
 * If validation fails, falls back to a non-streaming retry with error feedback.
 */
function streamWithSchemaRetry<T>(options: GenerationOptions<T> & {
  prompt: Promise<string>;
  abortController: AbortController;
}): StreamHandle<T> {
  const signal = options.abortController.signal;
  let onAbort: () => void;
  const promptReady = new Promise<string>((resolve, reject) => {
    onAbort = () => reject(signal.reason);
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
    options.prompt.then(resolve, reject);
  });
  const started = promptReady
    .finally(() => signal.removeEventListener("abort", onAbort))
    .then((prompt) => {
      signal.throwIfAborted();
      return startStreamWithSchemaRetry({ ...options, prompt });
    });
  return {
    partialStream: (async function* () {
      const stream = await started;
      yield* stream.partialStream;
    })(),
    finalOutput: started.then((stream) => stream.finalOutput),
    abort: () => options.abortController.abort(),
  };
}

function startStreamWithSchemaRetry<T>(options: GenerationOptions<T> & {
  prompt: string;
  abortController: AbortController;
}): StreamHandle<T> {
  const { model, system, prompt, schema, errorLabel, abortController } = options;
  const id = beginGeneration(errorLabel, system, prompt, options.state);
  const attemptId = beginAttempt(id, prompt, "stream");

  let result;
  try {
    result = streamText({
      model,
      system,
      prompt,
      output: Output.object({ schema }),
      abortSignal: abortController.signal,
    });
  } catch (error) {
    failAttempt(id, attemptId, error);
    failGeneration(id, error);
    throw error;
  }

  const finalOutput = (async (): Promise<T> => {
    try {
      const output = await result.output;
      abortController.signal.throwIfAborted();
      completeAttempt(id, attemptId, output);
      return output as T;
    } catch (firstError) {
      const schemaFailure = NoObjectGeneratedError.isInstance(firstError);
      failAttempt(id, attemptId, firstError,
        schemaFailure ? firstError.text : undefined,
        schemaFailure ? formatZodErrors(firstError.cause) : undefined);
      abortController.signal.throwIfAborted();
      if (!NoObjectGeneratedError.isInstance(firstError)) throw firstError;

      const rawText = firstError.text ?? "";
      const validationErrors = formatZodErrors(firstError.cause);
      console.warn(
        `${errorLabel}: stream schema validation failed, retrying with feedback.\nErrors:\n${validationErrors}`,
      );

      return generateWithSchemaRetry({
        model,
        system,
        prompt: buildRetryPrompt(prompt, rawText, validationErrors),
        schema,
        errorLabel: `${errorLabel} (stream retry)`,
        debugRecordId: id,
        abortSignal: abortController.signal,
      });
    }
  })().then((output) => {
    finishGeneration(id, output);
    return output;
  }, (error) => {
    failGeneration(id, error);
    throw error;
  });

  return {
    partialStream: result.partialOutputStream as AsyncIterable<DeepPartial<T>>,
    finalOutput,
    abort: () => abortController.abort(),
  };
}

// ============================================================
// Theme Generation (pre-worldbuilding diversity seed)
// ============================================================

export function getThemeSeeds() {
  return {
    terrain: pickRandom(TERRAIN_SEEDS),
    culture: pickRandom(CULTURE_SEEDS),
    mythicTone: pickRandom(MYTHIC_TONE_SEEDS),
  };
}

async function generateTheme(): Promise<ThemeSeed> {
  const model = createModel("storytelling");
  const terrain = pickRandom(TERRAIN_SEEDS);
  const culture = pickRandom(CULTURE_SEEDS);
  const mythicTone = pickRandom(MYTHIC_TONE_SEEDS);

  return generateWithSchemaRetry({
    model,
    system: THEME_GEN_SYSTEM,
    prompt: withInspiration(buildThemeGenPrompt(terrain, culture, mythicTone)),
    schema: themeSchema,
    errorLabel: "Theme generation",
  });
}

// ============================================================
// World Generation
// ============================================================

export async function generateWorld(): Promise<WorldGeneration> {
  const model = createModel("storytelling");
  const theme = await generateTheme();

  return generateWithSchemaRetry({
    model,
    system: WORLD_GEN_SYSTEM,
    prompt: withInspiration(buildWorldGenPrompt(theme)),
    schema: worldGenerationSchema,
    errorLabel: "World generation",
  });
}

// ============================================================
// Director Event
// ============================================================

export async function generateDirectorEvent(
  state: GameState,
): Promise<DirectorOutput> {
  const model = createModel("director");

  return generateWithSchemaRetry({
    model,
    system: getDirectorSystemPrompt(state),
    state,
    prompt: withInspiration(getDirectorEventPrompt(state)),
    schema: directorOutputSchema,
    errorLabel: "Director event",
  });
}

// ============================================================
// Director Action (player-initiated)
// ============================================================

export async function generateDirectorAction(
  state: GameState,
  actionType: string,
  actionLabel: string,
  actionDescription: string,
  targetClan?: string,
): Promise<DirectorOutput> {
  const model = createModel("director");

  return generateWithSchemaRetry({
    model,
    system: getDirectorSystemPrompt(state),
    state,
    prompt: withInspiration(getDirectorActionPrompt(state, actionType, actionLabel, actionDescription, targetClan)),
    schema: directorOutputSchema,
    errorLabel: "Director action",
  });
}

// ============================================================
// Narrator
// ============================================================

export async function generateNarration(
  state: GameState,
  directorOutput: DirectorOutput,
  isPlayerAction: boolean,
): Promise<NarratorOutput> {
  const model = createModel("storytelling");

  return generateWithSchemaRetry({
    model,
    system: getNarratorSystemPrompt(state),
    state,
    prompt: withInspiration(getNarratorPrompt(directorOutput, isPlayerAction)),
    schema: narratorOutputSchema,
    errorLabel: "Narrator",
  });
}

// ============================================================
// Sacred Time
// ============================================================

export async function generateSacredTime(
  state: GameState,
): Promise<SacredTimeOutput> {
  const model = createModel("storytelling");

  return generateWithSchemaRetry({
    model,
    system: getSacredTimeSystemPrompt(state),
    state,
    prompt: withInspiration(getSacredTimePrompt(state)),
    schema: sacredTimeOutputSchema,
    errorLabel: "Sacred time",
  });
}

// ============================================================
// Consequence (aftermath of a choice)
// ============================================================

export async function generateConsequence(
  state: GameState,
  choiceResult: ChoiceResult,
): Promise<ConsequenceOutput> {
  const model = createModel("storytelling");

  return generateWithSchemaRetry({
    model,
    system: getConsequenceSystemPrompt(state),
    state,
    prompt: withInspiration(getConsequencePrompt(choiceResult)),
    schema: consequenceOutputSchema,
    errorLabel: "Consequence",
  });
}

// ============================================================
// Epilogue
// ============================================================

export async function generateEpilogue(
  state: GameState,
): Promise<EpilogueOutput> {
  const model = createModel("storytelling");

  return generateWithSchemaRetry({
    model,
    system: getEpilogueSystemPrompt(state),
    state,
    prompt: withInspiration(getEpiloguePrompt(state)),
    schema: epilogueOutputSchema,
    errorLabel: "Epilogue",
  });
}

// ============================================================
// Streaming Variants
// ============================================================

/**
 * Generate theme with seeds exposed for display.
 * Returns the seeds used and the theme result.
 */
export async function generateThemeWithSeeds(): Promise<{
  seeds: { terrain: string; culture: string; mythicTone: string };
  theme: ThemeSeed;
}> {
  const model = createModel("storytelling");
  const seeds = getThemeSeeds();

  const theme = await generateWithSchemaRetry({
    model,
    system: THEME_GEN_SYSTEM,
    prompt: withInspiration(buildThemeGenPrompt(seeds.terrain, seeds.culture, seeds.mythicTone)),
    schema: themeSchema,
    errorLabel: "Theme generation (with seeds)",
  });

  return { seeds, theme };
}

/**
 * Stream world generation, yielding partial objects as they arrive.
 */
export function streamWorldGeneration(
  theme: ThemeSeed,
): StreamHandle<WorldGeneration> {
  return streamWithSchemaRetry({
    model: createModel("storytelling"),
    system: WORLD_GEN_SYSTEM,
    prompt: withInspiration(buildWorldGenPrompt(theme)),
    schema: worldGenerationSchema,
    errorLabel: "World generation (stream)",
    abortController: new AbortController(),
  });
}

/**
 * Stream narrator output, yielding partial objects as they arrive.
 */
export function streamNarration(
  state: GameState,
  directorOutput: DirectorOutput,
  isPlayerAction: boolean,
): StreamHandle<NarratorOutput> {
  return streamWithSchemaRetry({
    model: createModel("storytelling"),
    system: getNarratorSystemPrompt(state),
    state,
    prompt: withInspiration(getNarratorPrompt(directorOutput, isPlayerAction)),
    schema: narratorOutputSchema,
    errorLabel: "Narrator (stream)",
    abortController: new AbortController(),
  });
}

/**
 * Stream sacred time output.
 */
export function streamSacredTime(
  state: GameState,
): StreamHandle<SacredTimeOutput> {
  return streamWithSchemaRetry({
    model: createModel("storytelling"),
    system: getSacredTimeSystemPrompt(state),
    state,
    prompt: withInspiration(getSacredTimePrompt(state)),
    schema: sacredTimeOutputSchema,
    errorLabel: "Sacred time (stream)",
    abortController: new AbortController(),
  });
}

/**
 * Stream consequence output.
 */
export function streamConsequence(
  state: GameState,
  choiceResult: ChoiceResult,
): StreamHandle<ConsequenceOutput> {
  return streamWithSchemaRetry({
    model: createModel("storytelling"),
    system: getConsequenceSystemPrompt(state),
    state,
    prompt: withInspiration(getConsequencePrompt(choiceResult)),
    schema: consequenceOutputSchema,
    errorLabel: "Consequence (stream)",
    abortController: new AbortController(),
  });
}

/**
 * Stream epilogue output.
 */
export function streamEpilogue(
  state: GameState,
): StreamHandle<EpilogueOutput> {
  return streamWithSchemaRetry({
    model: createModel("storytelling"),
    system: getEpilogueSystemPrompt(state),
    state,
    prompt: withInspiration(getEpiloguePrompt(state)),
    schema: epilogueOutputSchema,
    errorLabel: "Epilogue (stream)",
    abortController: new AbortController(),
  });
}
