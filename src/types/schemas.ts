import { z } from "zod";

// ============================================================
// Zod Schemas for LLM Structured Output
// ============================================================
//
// These schemas use strict Zod validators (.min, .max, .length, etc.) to
// enforce data integrity. The AI Gateway's OpenAI-compatible API does not
// enforce these constraints at generation time, so we rely on:
//   1. Descriptive .describe() strings to guide the model
//   2. A schema-aware retry mechanism (see calls.ts) that feeds validation
//      errors back to the model for a corrective second attempt
// ============================================================

// Theme Generation Schema (pre-worldbuilding diversity seed)
export const themeSchema = z.object({
  geography: z.string().describe("The physical landscape and terrain — be specific and vivid, e.g. 'wind-scoured volcanic plateau above the cloud line' not just 'mountains'"),
  cultural_tone: z.string().describe("The cultural flavor and inspiration — blend real-world influences into something original, e.g. 'draws from Andean mountain cultures and Tibetan monasticism' not just 'Asian-inspired'"),
  description: z.string().describe("2-3 evocative sentences painting this world's atmosphere for the player. Written in second person present tense, as if the player is arriving for the first time. Concrete sensory details — sights, sounds, smells. E.g. 'You stand on a wind-scoured plateau where sulfur vents hiss between prayer stones. Below, terraced fields cling to volcanic slopes, tended by monks whose chants echo through the cloud line. The air tastes of ash and incense.'"),
});

export type ThemeSeed = z.infer<typeof themeSchema>;

// World Generation Schema
export const worldGenerationSchema = z.object({
  setting: z.object({
    name: z.string().describe("Name of the region"),
    geography: z.string().describe("2-3 sentences describing the geography"),
    tone: z.string().describe("The mythic/cultural flavor of the setting"),
  }),
  mythology: z.object({
    pantheon_summary: z.string().describe("2-3 sentences about the gods/spirits"),
    creation_myth: z.string().describe("1-2 sentences about creation"),
    key_deities: z.array(z.object({
      name: z.string(),
      domain: z.string(),
      personality: z.string(),
    })).min(3).max(5).describe("3-5 key deities/spirits"),
  }),
  clan: z.object({
    name: z.string().describe("The player's clan name"),
    backstory: z.string().describe("2-3 sentences about the clan's history and current situation. This backstory is also used as context for the Year 1 Sacred Time narrative, so it should describe a state of affairs that naturally leads into the start of the game."),
  }),
  advisors: z.array(z.object({
    name: z.string(),
    archetype: z.enum(["warrior", "mystic", "diplomat"]),
    personality: z.string().describe("2-3 adjectives"),
    patron_deity: z.string().describe("Name of their patron deity"),
    speaking_style: z.string().describe("Brief description of how they talk"),
  })).length(3).describe("Exactly 3 advisors"),
  neighboring_clans: z.array(z.object({
    name: z.string(),
    reputation: z.string().describe("e.g. 'warlike raiders', 'wealthy traders'"),
    personality: z.string(),
    initial_relationship: z.number().min(-2).max(2).describe("Starting relationship score, integer from -2 (hostile) to 2 (friendly)"),
    detail: z.string().describe("One distinguishing cultural detail"),
  })).min(3).max(4).describe("3-4 neighboring clans"),
  looming_threat: z.object({
    name: z.string(),
    description: z.string().describe("2-3 sentences describing the threat"),
    nature: z.enum(["military", "supernatural", "natural", "political"]),
    foreshadowing_hints: z.array(z.string()).min(3).max(5).describe("3-5 ways the threat can be hinted at early"),
    preparation_axes: z.array(z.string()).min(2).max(4).describe("2-4 kinds of preparation that help against it"),
  }),
});

// Director Output Schema
export const directorOutputSchema = z.object({
  event_type: z.string().describe("e.g. raid, trade, omen, internal_dispute, supernatural, diplomatic"),
  involves_clans: z.array(z.string()).describe("Names of neighboring clans involved, if any"),
  storylines_referenced: z.array(z.string()).describe("IDs of active storylines this event advances"),
  new_storyline: z.object({
    id: z.string(),
    description: z.string(),
    state: z.literal("introduced"),
  }).nullable().describe("If this event starts a new storyline"),
  storyline_state_changes: z.array(z.object({
    id: z.string(),
    new_state: z.enum(["escalating", "climax", "resolved"]),
  })).nullable().describe("If this advances/resolves existing storylines"),
  season_context: z.string().describe("How the current season affects this event"),
  threat_foreshadowing: z.string().nullable().describe("Connection to the looming threat, if any"),
  options: z.array(z.object({
    summary: z.string().describe("Brief description of the choice"),
    tone: z.enum(["cautious", "bold", "diplomatic", "ruthless", "pious", "pragmatic"]),
    resource_effects: z.object({
      people: z.number().min(-2).max(2).nullable().describe("Integer from -2 to 2, or null"),
      wealth: z.number().min(-2).max(2).nullable().describe("Integer from -2 to 2, or null"),
      magic: z.number().min(-2).max(2).nullable().describe("Integer from -2 to 2, or null"),
      reputation: z.number().min(-2).max(2).nullable().describe("Integer from -2 to 2, or null"),
    }),
    relationship_effects: z.array(z.object({
      clan_name: z.string(),
      change: z.number().min(-2).max(2).describe("Integer from -2 to 2"),
    })).nullable(),
    flags_added: z.array(z.object({
      flag: z.string().describe("A short snake_case identifier for the flag"),
      description: z.string().describe("A brief, player-readable description of what this flag represents, e.g. 'The River Clan owes you a favor'"),
    })).nullable(),
    flags_removed: z.array(z.string()).nullable(),
    unlocks_action: z.object({
      type: z.string(),
      label: z.string(),
      description: z.string(),
      single_use: z.boolean().nullable().describe("If true, this action disappears after the player uses it once. Use for one-off opportunities (e.g. 'Explore the collapsed mine', 'Confront the traitor'). If false/null, the action persists."),
      requirements: z.array(z.object({
        type: z.enum(["min_resource", "max_resource", "season", "min_relationship", "max_relationship"]),
        resource: z.enum(["people", "wealth", "magic", "reputation"]).nullable().describe("Required for min_resource/max_resource types"),
        clan_name: z.string().nullable().describe("Required for min_relationship/max_relationship types"),
        season: z.enum(["spring", "summer", "autumn", "winter"]).nullable().describe("Required for season type"),
        value: z.number().nullable().describe("Threshold value for resource (0-10) or relationship (-3 to 3) requirements"),
        unmet_hint: z.string().describe("A short, thematic, immersive sentence explaining why the action is unavailable. Must NOT mention numbers, scores, or game mechanics."),
      })).nullable().describe("Optional requirements that must be met to use this action. Only add when thematically appropriate — many actions should have no requirements."),
    }).nullable(),
  })).length(3).describe("Exactly 3 options"),
});

// Narrator Output Schema
export const narratorOutputSchema = z.object({
  event_title: z.string().describe("A short, evocative title for this event (2-5 words), e.g. 'Riders at the Gate', 'The Harvest Quarrel', 'A Debt Recalled'"),
  event_narrative: z.string().describe("2-4 sentences describing the situation"),
  advisor_opinions: z.array(z.object({
    advisor_name: z.string(),
    opinion: z.string().describe("1-2 sentences, in character"),
  })).length(3).describe("Exactly 3 opinions, one from each advisor"),
  option_texts: z.array(z.string()).length(3).describe("Exactly 3 concise imperative sentences for the options"),
});

// Sacred Time Output Schema
export const sacredTimeOutputSchema = z.object({
  year_recap: z.string().describe("2-3 sentences summarizing last year"),
  omens: z.string().describe("1-2 sentences of prophecy/foreshadowing"),
  threat_status: z.string().describe("1 sentence on the looming threat's progression"),
});

// Epilogue Output Schema
export const epilogueOutputSchema = z.object({
  saga_title: z.string(),
  saga_text: z.string().describe("A narrative summary of the clan's entire story, 3-6 paragraphs"),
  outcome: z.enum(["triumph", "survival", "pyrrhic_victory", "defeat", "collapse"]),
});

// Consequence Output Schema
export const consequenceOutputSchema = z.object({
  consequence_narrative: z.string().describe("2-3 sentences describing the immediate aftermath of the player's choice, written in saga-like prose. Concrete and vivid, not abstract."),
  continue_text: z.string().describe("A short, atmospheric phrase for the continue button (3-6 words). Should feel in-world and contextual to the season and situation, e.g. 'The season turns...', 'Dawn breaks over the valley...', 'Your warriors return...'. NEVER generic UI text like 'Continue' or 'Next'."),
  chronicle_entry: z.string().describe("A concise 1-2 sentence summary of the event and the clan's decision, written as a saga historian would record it for the chronicle. Focus on what happened and why it mattered. Example: 'When the Elk Clan demanded tribute, the clan refused and sent warriors to guard the pass. The Elk retreated, but their grudge only deepened.'"),
});
