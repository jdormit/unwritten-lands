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

// ============================================================
// Configuration
// ============================================================

/** Default temperature for all LLM calls — higher for more creative output. */
const TEMPERATURE = 1.2;

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

/**
 * Generate structured output with schema-aware retry.
 *
 * 1. First attempt uses Output.object({ schema }) for strict validation
 * 2. If validation fails, extracts the raw text and Zod errors from the error
 * 3. Retries with the errors fed back to the model in the prompt
 */
async function generateWithSchemaRetry<T>(options: {
  model: LanguageModel;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  errorLabel: string;
}): Promise<T> {
  const { model, system, prompt, schema, errorLabel } = options;

  // First attempt
  try {
    const result = await generateText({
      model,
      system,
      prompt,
      temperature: TEMPERATURE,
      output: Output.object({ schema }),
    });
    return result.output;
  } catch (firstError) {
    // If it's not a schema validation error, just throw
    if (!NoObjectGeneratedError.isInstance(firstError)) {
      throw firstError;
    }

    const rawText = firstError.text ?? "";
    const validationErrors = formatZodErrors(firstError.cause);
    console.warn(
      `${errorLabel}: schema validation failed, retrying with feedback.\nErrors:\n${validationErrors}`,
    );

    // Second attempt with error feedback
    try {
      const retryResult = await generateText({
        model,
        system,
        prompt: buildRetryPrompt(prompt, rawText, validationErrors),
        temperature: TEMPERATURE,
        output: Output.object({ schema }),
      });
      return retryResult.output;
    } catch (retryError) {
      if (NoObjectGeneratedError.isInstance(retryError)) {
        const retryValidationErrors = formatZodErrors(retryError.cause);
        throw new Error(
          `${errorLabel}: schema validation failed after retry.\nErrors:\n${retryValidationErrors}`,
        );
      }
      throw retryError;
    }
  }
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
function streamWithSchemaRetry<T>(options: {
  model: LanguageModel;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  errorLabel: string;
  abortController: AbortController;
}): StreamHandle<T> {
  const { model, system, prompt, schema, errorLabel, abortController } = options;

  const result = streamText({
    model,
    system,
    prompt,
    temperature: TEMPERATURE,
    output: Output.object({ schema }),
    abortSignal: abortController.signal,
  });

  const finalOutput = (async (): Promise<T> => {
    try {
      const output = await result.output;
      return output as T;
    } catch (firstError) {
      // If aborted or not a schema error, just throw
      if (abortController.signal.aborted) throw firstError;
      if (!NoObjectGeneratedError.isInstance(firstError)) throw firstError;

      const rawText = firstError.text ?? "";
      const validationErrors = formatZodErrors(firstError.cause);
      console.warn(
        `${errorLabel}: stream schema validation failed, retrying with feedback.\nErrors:\n${validationErrors}`,
      );

      // Non-streaming retry with error feedback
      return generateWithSchemaRetry({
        model,
        system,
        prompt: buildRetryPrompt(prompt, rawText, validationErrors),
        schema,
        errorLabel: `${errorLabel} (stream retry)`,
      });
    }
  })();

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
  const model = createModel();
  const terrain = pickRandom(TERRAIN_SEEDS);
  const culture = pickRandom(CULTURE_SEEDS);
  const mythicTone = pickRandom(MYTHIC_TONE_SEEDS);

  return generateWithSchemaRetry({
    model,
    system: THEME_GEN_SYSTEM,
    prompt: buildThemeGenPrompt(terrain, culture, mythicTone),
    schema: themeSchema,
    errorLabel: "Theme generation",
  });
}

// ============================================================
// World Generation
// ============================================================

export async function generateWorld(): Promise<WorldGeneration> {
  const model = createModel();
  const theme = await generateTheme();

  return generateWithSchemaRetry({
    model,
    system: WORLD_GEN_SYSTEM,
    prompt: buildWorldGenPrompt(theme),
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
  const model = createModel();

  return generateWithSchemaRetry({
    model,
    system: getDirectorSystemPrompt(state),
    prompt: getDirectorEventPrompt(state),
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
  const model = createModel();

  return generateWithSchemaRetry({
    model,
    system: getDirectorSystemPrompt(state),
    prompt: getDirectorActionPrompt(state, actionType, actionLabel, actionDescription, targetClan),
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
  const model = createModel();

  return generateWithSchemaRetry({
    model,
    system: getNarratorSystemPrompt(state),
    prompt: getNarratorPrompt(directorOutput, isPlayerAction),
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
  const model = createModel();

  return generateWithSchemaRetry({
    model,
    system: getSacredTimeSystemPrompt(state),
    prompt: getSacredTimePrompt(state),
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
  const model = createModel();

  return generateWithSchemaRetry({
    model,
    system: getConsequenceSystemPrompt(state),
    prompt: getConsequencePrompt(choiceResult),
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
  const model = createModel();

  return generateWithSchemaRetry({
    model,
    system: getEpilogueSystemPrompt(state),
    prompt: getEpiloguePrompt(state),
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
  const model = createModel();
  const seeds = getThemeSeeds();

  const theme = await generateWithSchemaRetry({
    model,
    system: THEME_GEN_SYSTEM,
    prompt: buildThemeGenPrompt(seeds.terrain, seeds.culture, seeds.mythicTone),
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
    model: createModel(),
    system: WORLD_GEN_SYSTEM,
    prompt: buildWorldGenPrompt(theme),
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
    model: createModel(),
    system: getNarratorSystemPrompt(state),
    prompt: getNarratorPrompt(directorOutput, isPlayerAction),
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
    model: createModel(),
    system: getSacredTimeSystemPrompt(state),
    prompt: getSacredTimePrompt(state),
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
    model: createModel(),
    system: getConsequenceSystemPrompt(state),
    prompt: getConsequencePrompt(choiceResult),
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
    model: createModel(),
    system: getEpilogueSystemPrompt(state),
    prompt: getEpiloguePrompt(state),
    schema: epilogueOutputSchema,
    errorLabel: "Epilogue (stream)",
    abortController: new AbortController(),
  });
}
