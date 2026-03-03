import type {
  GameState,
  GamePhase,
  GameFlag,
  WorldGeneration,
  Resources,
  MagicAllocation,
  CurrentEvent,
  SacredTimeOutput,
  EpilogueOutput,
  DirectorOption,
  HistoryEntry,
  Season,
  UnlockedAction,
} from "../types/game";

// ============================================================
// Initial State
// ============================================================

export const INITIAL_RESOURCES: Resources = {
  people: 5,
  wealth: 5,
  magic: 5,
  reputation: 5,
};

export const initialGameState: GameState = {
  phase: "title",
  world: null,
  resources: { ...INITIAL_RESOURCES },
  clan_relationships: [],
  active_storylines: [],
  resolved_storylines: [],
  current_year: 1,
  current_season: "spring",
  magic_allocation: { war: 1, harvest: 1, diplomacy: 1 },
  flags: [],
  unlocked_actions: [],
  event_history: [],
  full_history: [],
  current_event: null,
  sacred_time: null,
  epilogue: null,
  last_event_type: null,
  error: null,
};

// ============================================================
// Actions
// ============================================================

export type GameAction =
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "INIT_WORLD"; world: WorldGeneration }
  | { type: "SET_SACRED_TIME"; sacredTime: SacredTimeOutput }
  | { type: "SET_MAGIC_ALLOCATION"; allocation: MagicAllocation }
  | { type: "SET_CURRENT_EVENT"; event: CurrentEvent }
  | { type: "APPLY_CHOICE"; optionIndex: number }
  | { type: "ADVANCE_SEASON" }
  | { type: "SET_EPILOGUE"; epilogue: EpilogueOutput }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "LOAD_GAME"; state: GameState }
  | { type: "RESET" };

// ============================================================
// Helpers
// ============================================================

const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nextSeason(current: Season): { season: Season; yearAdvanced: boolean } {
  const idx = SEASON_ORDER.indexOf(current);
  if (idx === 3) {
    return { season: "spring", yearAdvanced: true };
  }
  return { season: SEASON_ORDER[idx + 1], yearAdvanced: false };
}

function applyResourceEffects(
  resources: Resources,
  effects: Partial<Resources>,
): Resources {
  return {
    people: clamp((resources.people + (effects.people ?? 0)), 0, 10),
    wealth: clamp((resources.wealth + (effects.wealth ?? 0)), 0, 10),
    magic: clamp((resources.magic + (effects.magic ?? 0)), 0, 10),
    reputation: clamp((resources.reputation + (effects.reputation ?? 0)), 0, 10),
  };
}

function isResourceDepleted(resources: Resources): boolean {
  return (
    resources.people <= 0 ||
    resources.wealth <= 0 ||
    resources.magic <= 0 ||
    resources.reputation <= 0
  );
}

// ============================================================
// Reducer
// ============================================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase, error: null };

    case "INIT_WORLD": {
      const world = action.world;
      return {
        ...state,
        world,
        phase: "sacred_time",
        clan_relationships: world.neighboring_clans.map((c) => ({
          clan_name: c.name,
          score: c.initial_relationship,
        })),
        // Slight variation in starting resources based on world generation
        resources: { ...INITIAL_RESOURCES },
      };
    }

    case "SET_SACRED_TIME":
      return {
        ...state,
        sacred_time: action.sacredTime,
      };

    case "SET_MAGIC_ALLOCATION":
      return {
        ...state,
        magic_allocation: action.allocation,
        phase: "event_loading",
      };

    case "SET_CURRENT_EVENT":
      return {
        ...state,
        current_event: action.event,
        phase: action.event.isPlayerAction ? "action" : "event",
        error: null,
      };

    case "APPLY_CHOICE": {
      if (!state.current_event) return state;

      const { director, narrator, isPlayerAction } = state.current_event;
      const option: DirectorOption = director.options[action.optionIndex];

      // Apply resource effects
      const newResources = applyResourceEffects(
        state.resources,
        option.resource_effects,
      );

      // Apply relationship effects
      const newRelationships = state.clan_relationships.map((rel) => {
        const effect = option.relationship_effects?.find(
          (e) => e.clan_name === rel.clan_name,
        );
        if (effect) {
          return {
            ...rel,
            score: clamp(rel.score + effect.change, -3, 3),
          };
        }
        return rel;
      });

      // Update flags
      let newFlags: GameFlag[] = [...state.flags];
      if (option.flags_added) {
        for (const added of option.flags_added) {
          if (!newFlags.some((f) => f.id === added.flag)) {
            newFlags.push({ id: added.flag, description: added.description });
          }
        }
      }
      if (option.flags_removed) {
        newFlags = newFlags.filter((f) => !option.flags_removed!.includes(f.id));
      }

      // Update unlocked actions
      let newUnlockedActions = [...state.unlocked_actions];
      if (option.unlocks_action) {
        const ua: UnlockedAction = {
          ...option.unlocks_action,
          from_flag: option.unlocks_action.type,
        };
        if (!newUnlockedActions.some((a) => a.type === ua.type)) {
          newUnlockedActions = [...newUnlockedActions, ua];
        }
      }

      // Update storylines
      let newActiveStorylines = [...state.active_storylines];
      let newResolvedStorylines = [...state.resolved_storylines];

      // Add new storyline if introduced
      if (director.new_storyline) {
        newActiveStorylines.push({
          ...director.new_storyline,
          started_year: state.current_year,
          started_season: state.current_season,
        });
      }

      // Apply storyline state changes
      if (director.storyline_state_changes) {
        for (const change of director.storyline_state_changes) {
          if (change.new_state === "resolved") {
            const storyline = newActiveStorylines.find((s) => s.id === change.id);
            if (storyline) {
              newActiveStorylines = newActiveStorylines.filter((s) => s.id !== change.id);
              newResolvedStorylines.push({
                id: storyline.id,
                description: storyline.description,
                resolution: option.summary,
                year_resolved: state.current_year,
              });
            }
          } else {
            newActiveStorylines = newActiveStorylines.map((s) =>
              s.id === change.id ? { ...s, state: change.new_state } : s,
            );
          }
        }
      }

      // Build history entry
      const historyEntry: HistoryEntry = {
        year: state.current_year,
        season: state.current_season,
        summary: `${narrator.event_narrative.substring(0, 100)}... Choice: ${narrator.option_texts[action.optionIndex]}`,
      };

      const newEventHistory = [
        ...state.event_history.slice(-7), // Keep last 8
        historyEntry,
      ];

      const newFullHistory = [...state.full_history, historyEntry];

      // Check for resource depletion (game over)
      const depleted = isResourceDepleted(newResources);

      return {
        ...state,
        resources: newResources,
        clan_relationships: newRelationships,
        flags: newFlags,
        unlocked_actions: newUnlockedActions,
        active_storylines: newActiveStorylines,
        resolved_storylines: newResolvedStorylines,
        event_history: newEventHistory,
        full_history: newFullHistory,
        last_event_type: director.event_type,
        current_event: null,
        phase: depleted
          ? "game_over_loading"
          : isPlayerAction
            ? "action_resolved"
            : "event_resolved",
      };
    }

    case "ADVANCE_SEASON": {
      const { season, yearAdvanced } = nextSeason(state.current_season);

      // Year 10 climax check — don't increment year past 10
      if (yearAdvanced && state.current_year >= 10) {
        return {
          ...state,
          phase: "climax_loading",
        };
      }

      if (yearAdvanced) {
        return {
          ...state,
          current_season: season,
          current_year: state.current_year + 1,
          phase: "sacred_time",
          sacred_time: null,
        };
      }

      return {
        ...state,
        current_season: season,
        phase: "event_loading",
      };
    }

    case "SET_EPILOGUE":
      return {
        ...state,
        epilogue: action.epilogue,
        phase: state.phase === "game_over_loading" ? "game_over" : "epilogue",
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "LOAD_GAME":
      return { ...action.state };

    case "RESET":
      return { ...initialGameState };

    default:
      return state;
  }
}
