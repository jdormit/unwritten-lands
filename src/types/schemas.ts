import { z } from "zod";

// ============================================================
// Zod Schemas for LLM Structured Output
// ============================================================

// Theme Generation Schema (pre-worldbuilding diversity seed)
export const themeSchema = z.object({
  geography: z.string().describe("The physical landscape and terrain — be specific and vivid, e.g. 'wind-scoured volcanic plateau above the cloud line' not just 'mountains'"),
  cultural_tone: z.string().describe("The cultural flavor and inspiration — blend real-world influences into something original, e.g. 'draws from Andean mountain cultures and Tibetan monasticism' not just 'Asian-inspired'"),
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
    })).describe("3-5 key deities/spirits"),
  }),
  clan: z.object({
    name: z.string().describe("The player's clan name"),
    backstory: z.string().describe("2-3 sentences about the clan's history"),
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
    initial_relationship: z.number().min(-2).max(2).describe("Starting relationship score"),
    detail: z.string().describe("One distinguishing cultural detail"),
  })).min(3).max(4).describe("3-4 neighboring clans"),
  looming_threat: z.object({
    name: z.string(),
    description: z.string().describe("2-3 sentences describing the threat"),
    nature: z.enum(["military", "supernatural", "natural", "political"]),
    foreshadowing_hints: z.array(z.string()).min(3).max(4).describe("Ways the threat can be hinted at early"),
    preparation_axes: z.array(z.string()).min(2).max(4).describe("What kinds of preparation help against it"),
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
      people: z.number().min(-2).max(2).nullable(),
      wealth: z.number().min(-2).max(2).nullable(),
      magic: z.number().min(-2).max(2).nullable(),
      reputation: z.number().min(-2).max(2).nullable(),
    }),
    relationship_effects: z.array(z.object({
      clan_name: z.string(),
      change: z.number().min(-2).max(2),
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
    }).nullable(),
  })).length(3).describe("Exactly 3 options"),
});

// Narrator Output Schema
export const narratorOutputSchema = z.object({
  event_narrative: z.string().describe("2-4 sentences describing the situation"),
  advisor_opinions: z.array(z.object({
    advisor_name: z.string(),
    opinion: z.string().describe("1-2 sentences, in character"),
  })).length(3).describe("One opinion from each advisor"),
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
