import type { GameState, PlayerAction } from "../types/game";

/**
 * Derive the list of available player actions from game state.
 * This is a pure function — deterministic based on state.
 */
export function getAvailableActions(state: GameState): PlayerAction[] {
  if (!state.world) return [];

  const actions: PlayerAction[] = [];
  const clanNames = state.world.neighboring_clans.map((c) => c.name);

  // === Always Available ===

  actions.push({
    type: "raid",
    label: "Raid a neighbor",
    description: "Send warriors to take what you need by force.",
    requiresTarget: true,
    validTargets: clanNames,
  });

  actions.push({
    type: "trade",
    label: "Trade with a neighbor",
    description: "Propose an exchange of goods with a neighboring clan.",
    requiresTarget: true,
    validTargets: clanNames,
  });

  actions.push({
    type: "explore",
    label: "Send scouts to explore",
    description: "Send scouts into the wilderness to discover what lies beyond your lands.",
  });

  // === Conditional: Resource-Gated ===

  if (state.resources.wealth >= 3) {
    actions.push({
      type: "feast",
      label: "Hold a feast",
      description: "Spend wealth on a grand gathering to lift spirits and impress neighbors.",
    });
  }

  if (state.resources.magic >= 3) {
    actions.push({
      type: "ritual",
      label: "Perform a ritual",
      description: "Call upon the gods and spirits for guidance, protection, or power.",
    });
  }

  if (state.resources.reputation >= 3) {
    actions.push({
      type: "emissaries",
      label: "Send emissaries",
      description: "Send diplomats to strengthen ties with a neighboring clan.",
      requiresTarget: true,
      validTargets: clanNames,
    });
  }

  if (state.resources.wealth >= 2 && state.resources.people >= 3) {
    actions.push({
      type: "fortify",
      label: "Fortify defenses",
      description: "Invest labor and materials in walls, watchtowers, and weapons.",
    });
  }

  // === Conditional: Relationship-Gated ===

  const allies = state.clan_relationships.filter((r) => r.score >= 2);
  if (allies.length > 0) {
    actions.push({
      type: "request_aid",
      label: "Request aid from an ally",
      description: "Call upon the bonds of friendship to ask for help.",
      requiresTarget: true,
      validTargets: allies.map((a) => a.clan_name),
    });
  }

  // === Conditional: Year-Gated ===

  if (state.current_year >= 4 && state.world.looming_threat) {
    actions.push({
      type: "prepare_threat",
      label: `Prepare for the ${state.world.looming_threat.name}`,
      description: `Take specific steps to ready the clan for the coming ${state.world.looming_threat.name}. Preparation axes: ${state.world.looming_threat.preparation_axes.join(", ")}.`,
    });
  }

  // === Conditional: Flag/Storyline-Unlocked ===

  for (const unlocked of state.unlocked_actions) {
    actions.push({
      type: "custom",
      label: unlocked.label,
      description: unlocked.description,
    });
  }

  return actions;
}
