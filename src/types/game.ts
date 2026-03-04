// ============================================================
// Core Game Types for Unwritten Lands
// ============================================================

export type Season = "spring" | "summer" | "autumn" | "winter";

export type StorylineState = "introduced" | "escalating" | "climax" | "resolved";

export type GamePhase =
  | "title"
  | "authenticating"
  | "world_gen"
  | "sacred_time"
  | "event_loading"
  | "event"
  | "event_resolved"
  | "action_selection"
  | "action_loading"
  | "action"
  | "action_resolved"
  | "climax_loading"
  | "climax"
  | "epilogue_loading"
  | "epilogue"
  | "game_over_loading"
  | "game_over";

export type EpilogueOutcome =
  | "triumph"
  | "survival"
  | "pyrrhic_victory"
  | "defeat"
  | "collapse";

// ============================================================
// Resources
// ============================================================

export interface Resources {
  people: number;   // 0-10
  wealth: number;   // 0-10
  magic: number;    // 0-10
  reputation: number; // 0-10
}

export type ResourceKey = keyof Resources;

// ============================================================
// World Generation
// ============================================================

export interface Deity {
  name: string;
  domain: string;
  personality: string;
}

export interface Mythology {
  pantheon_summary: string;
  creation_myth: string;
  key_deities: Deity[];
}

export interface Setting {
  name: string;
  geography: string;
  tone: string;
}

export interface Advisor {
  name: string;
  archetype: "warrior" | "mystic" | "diplomat";
  personality: string;
  patron_deity: string;
  speaking_style: string;
}

export interface NeighboringClan {
  name: string;
  reputation: string;
  personality: string;
  initial_relationship: number;
  detail: string;
}

export interface LoomingThreat {
  name: string;
  description: string;
  nature: "military" | "supernatural" | "natural" | "political";
  foreshadowing_hints: string[];
  preparation_axes: string[];
}

export interface ClanInfo {
  name: string;
  backstory: string;
}

export interface WorldGeneration {
  setting: Setting;
  mythology: Mythology;
  clan: ClanInfo;
  advisors: Advisor[];
  neighboring_clans: NeighboringClan[];
  looming_threat: LoomingThreat;
}

// ============================================================
// Clan Relationships
// ============================================================

export interface ClanRelationship {
  clan_name: string;
  score: number; // -3 to +3
}

// ============================================================
// Storylines
// ============================================================

export interface ActiveStoryline {
  id: string;
  description: string;
  state: StorylineState;
  started_year: number;
  started_season: Season;
}

export interface ResolvedStoryline {
  id: string;
  description: string;
  resolution: string;
  year_resolved: number;
}

// ============================================================
// Event History
// ============================================================

export interface HistoryEntry {
  year: number;
  season: Season;
  title: string;
  chosenOption: string;
  summary: string;
}

// ============================================================
// Magic Allocation
// ============================================================

export interface MagicAllocation {
  war: number;
  harvest: number;
  diplomacy: number;
}

// ============================================================
// Flags
// ============================================================

export interface GameFlag {
  id: string;
  description: string;
}

// ============================================================
// Player Actions
// ============================================================

export type PlayerActionType =
  | "raid"
  | "trade"
  | "explore"
  | "feast"
  | "ritual"
  | "emissaries"
  | "fortify"
  | "request_aid"
  | "prepare_threat"
  | "custom";

export interface PlayerAction {
  type: PlayerActionType;
  label: string;
  description?: string;
  requiresTarget?: boolean;
  validTargets?: string[]; // clan names
}

export interface UnlockedAction {
  type: string;
  label: string;
  description: string;
  from_flag: string;
}

// ============================================================
// Director Output
// ============================================================

export interface DirectorOption {
  summary: string;
  tone: "cautious" | "bold" | "diplomatic" | "ruthless" | "pious" | "pragmatic";
  resource_effects: Partial<Resources>;
  relationship_effects: {
    clan_name: string;
    change: number;
  }[] | null;
  flags_added: { flag: string; description: string }[] | null;
  flags_removed: string[] | null;
  unlocks_action: {
    type: string;
    label: string;
    description: string;
  } | null;
}

export interface DirectorOutput {
  event_type: string;
  involves_clans: string[];
  storylines_referenced: string[];
  new_storyline: {
    id: string;
    description: string;
    state: "introduced";
  } | null;
  storyline_state_changes: {
    id: string;
    new_state: "escalating" | "climax" | "resolved";
  }[] | null;
  season_context: string;
  threat_foreshadowing: string | null;
  options: DirectorOption[];
}

// ============================================================
// Narrator Output
// ============================================================

export interface AdvisorOpinion {
  advisor_name: string;
  opinion: string;
}

export interface NarratorOutput {
  event_title: string;
  event_narrative: string;
  advisor_opinions: AdvisorOpinion[];
  option_texts: string[];
}

// ============================================================
// Sacred Time Output
// ============================================================

export interface SacredTimeOutput {
  year_recap: string;
  omens: string;
  threat_status: string;
}

// ============================================================
// Epilogue Output
// ============================================================

export interface EpilogueOutput {
  saga_title: string;
  saga_text: string;
  outcome: EpilogueOutcome;
}

// ============================================================
// Consequence Output (LLM-generated aftermath of a choice)
// ============================================================

export interface ConsequenceOutput {
  consequence_narrative: string;
  continue_text: string;
  chronicle_entry: string;
}

// ============================================================
// Choice Result (mechanical data from a resolved choice)
// ============================================================

export interface ChoiceResult {
  event_title: string;
  chosen_option_text: string;
  chosen_option_summary: string;
  resource_effects: Partial<Resources>;
  relationship_effects: { clan_name: string; change: number }[] | null;
  previous_resources: Resources;
  new_resources: Resources;
  flags_added: { flag: string; description: string }[] | null;
  flags_removed: string[] | null;
  isPlayerAction: boolean;
}

// ============================================================
// Current Event (combined Director + Narrator for display)
// ============================================================

export interface CurrentEvent {
  director: DirectorOutput;
  narrator: NarratorOutput;
  isPlayerAction: boolean;
}

// ============================================================
// Complete Game State
// ============================================================

export interface GameState {
  phase: GamePhase;
  world: WorldGeneration | null;
  resources: Resources;
  clan_relationships: ClanRelationship[];
  active_storylines: ActiveStoryline[];
  resolved_storylines: ResolvedStoryline[];
  current_year: number;
  current_season: Season;
  magic_allocation: MagicAllocation;
  flags: GameFlag[];
  unlocked_actions: UnlockedAction[];
  event_history: HistoryEntry[];
  full_history: HistoryEntry[];
  current_event: CurrentEvent | null;
  last_choice_result: ChoiceResult | null;
  consequence: ConsequenceOutput | null;
  sacred_time: SacredTimeOutput | null;
  epilogue: EpilogueOutput | null;
  last_event_type: string | null;
  error: string | null;
}
