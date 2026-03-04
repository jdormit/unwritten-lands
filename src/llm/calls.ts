import { generateText, Output } from "ai";
import type { Auth } from "ai-sdk-codex-oauth";
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
// Retry helper
// ============================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.warn("LLM call failed, retrying...", error);
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

// ============================================================
// Theme Generation (pre-worldbuilding diversity seed)
// ============================================================

async function generateTheme(auth: Auth): Promise<ThemeSeed> {
  const model = createModel(auth);

  // Randomly sample one seed from each list for combinatorial variety
  const terrain = pickRandom(TERRAIN_SEEDS);
  const culture = pickRandom(CULTURE_SEEDS);
  const mythicTone = pickRandom(MYTHIC_TONE_SEEDS);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: THEME_GEN_SYSTEM,
      prompt: buildThemeGenPrompt(terrain, culture, mythicTone),
      output: Output.object({
        schema: themeSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from theme generation");
    }

    return output as ThemeSeed;
  });
}

// ============================================================
// World Generation
// ============================================================

export async function generateWorld(auth: Auth): Promise<WorldGeneration> {
  const model = createModel(auth);

  // First, generate a theme seed to anchor the world on a diverse setting
  const theme = await generateTheme(auth);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: WORLD_GEN_SYSTEM,
      prompt: buildWorldGenPrompt(theme),
      output: Output.object({
        schema: worldGenerationSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from world generation");
    }

    return output as WorldGeneration;
  });
}

// ============================================================
// Director Event
// ============================================================

export async function generateDirectorEvent(
  auth: Auth,
  state: GameState,
): Promise<DirectorOutput> {
  const model = createModel(auth);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: getDirectorSystemPrompt(state),
      prompt: getDirectorEventPrompt(state),
      output: Output.object({
        schema: directorOutputSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from director");
    }

    return output as DirectorOutput;
  });
}

// ============================================================
// Director Action (player-initiated)
// ============================================================

export async function generateDirectorAction(
  auth: Auth,
  state: GameState,
  actionType: string,
  targetClan?: string,
): Promise<DirectorOutput> {
  const model = createModel(auth);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: getDirectorSystemPrompt(state),
      prompt: getDirectorActionPrompt(state, actionType, targetClan),
      output: Output.object({
        schema: directorOutputSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from director (action)");
    }

    return output as DirectorOutput;
  });
}

// ============================================================
// Narrator
// ============================================================

export async function generateNarration(
  auth: Auth,
  state: GameState,
  directorOutput: DirectorOutput,
  isPlayerAction: boolean,
): Promise<NarratorOutput> {
  const model = createModel(auth);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: getNarratorSystemPrompt(state),
      prompt: getNarratorPrompt(directorOutput, isPlayerAction),
      output: Output.object({
        schema: narratorOutputSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from narrator");
    }

    return output as NarratorOutput;
  });
}

// ============================================================
// Sacred Time
// ============================================================

export async function generateSacredTime(
  auth: Auth,
  state: GameState,
): Promise<SacredTimeOutput> {
  const model = createModel(auth);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: getSacredTimeSystemPrompt(state),
      prompt: getSacredTimePrompt(state),
      output: Output.object({
        schema: sacredTimeOutputSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from sacred time");
    }

    return output as SacredTimeOutput;
  });
}

// ============================================================
// Consequence (aftermath of a choice)
// ============================================================

export async function generateConsequence(
  auth: Auth,
  state: GameState,
  choiceResult: ChoiceResult,
): Promise<ConsequenceOutput> {
  const model = createModel(auth);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: getConsequenceSystemPrompt(state),
      prompt: getConsequencePrompt(choiceResult),
      output: Output.object({
        schema: consequenceOutputSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from consequence narrator");
    }

    return output as ConsequenceOutput;
  });
}

// ============================================================
// Epilogue
// ============================================================

export async function generateEpilogue(
  auth: Auth,
  state: GameState,
): Promise<EpilogueOutput> {
  const model = createModel(auth);

  return withRetry(async () => {
    const { output } = await generateText({
      model,
      system: getEpilogueSystemPrompt(state),
      prompt: getEpiloguePrompt(state),
      output: Output.object({
        schema: epilogueOutputSchema,
      }),
    });

    if (!output) {
      throw new Error("No structured output received from epilogue");
    }

    return output as EpilogueOutput;
  });
}
