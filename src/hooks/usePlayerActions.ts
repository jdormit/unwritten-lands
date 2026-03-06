import type { GameState, PlayerAction, ActionRequirement } from "../types/game";

/**
 * Evaluate an array of requirements against the current game state.
 * Returns { locked: true, lockReasons: [...] } if any requirement is unmet.
 * All requirements use AND logic — every one must be satisfied.
 */
function evaluateRequirements(
  requirements: ActionRequirement[] | undefined,
  state: GameState,
): { locked: boolean; lockReasons: string[] } {
  if (!requirements || requirements.length === 0) {
    return { locked: false, lockReasons: [] };
  }

  const lockReasons: string[] = [];

  for (const req of requirements) {
    switch (req.type) {
      case "min_resource": {
        if (req.resource != null && req.value != null) {
          if (state.resources[req.resource] < req.value) {
            lockReasons.push(req.unmet_hint);
          }
        }
        break;
      }
      case "max_resource": {
        if (req.resource != null && req.value != null) {
          if (state.resources[req.resource] > req.value) {
            lockReasons.push(req.unmet_hint);
          }
        }
        break;
      }
      case "season": {
        if (req.season != null && state.current_season !== req.season) {
          lockReasons.push(req.unmet_hint);
        }
        break;
      }
      case "min_relationship": {
        if (req.clan_name != null && req.value != null) {
          const rel = state.clan_relationships.find(
            (r) => r.clan_name === req.clan_name,
          );
          if (!rel || rel.score < req.value) {
            lockReasons.push(req.unmet_hint);
          }
        }
        break;
      }
      case "max_relationship": {
        if (req.clan_name != null && req.value != null) {
          const rel = state.clan_relationships.find(
            (r) => r.clan_name === req.clan_name,
          );
          if (!rel || rel.score > req.value) {
            lockReasons.push(req.unmet_hint);
          }
        }
        break;
      }
    }
  }

  return { locked: lockReasons.length > 0, lockReasons };
}

/**
 * Derive the list of player actions from game state.
 * All actions are always included — those with unmet requirements
 * are marked as locked with thematic explanations.
 */
export function getAvailableActions(state: GameState): PlayerAction[] {
  if (!state.world) return [];

  const actions: PlayerAction[] = [];
  const clanNames = state.world.neighboring_clans.map((c) => c.name);

  // === Always Available (no requirements) ===

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
    description:
      "Send scouts into the wilderness to discover what lies beyond your lands.",
  });

  // === Resource-Gated ===

  {
    const reqs: ActionRequirement[] = [
      {
        type: "min_resource",
        resource: "wealth",
        value: 3,
        unmet_hint:
          "The storehouses are too bare for a gathering of this scale.",
      },
    ];
    const { locked, lockReasons } = evaluateRequirements(reqs, state);
    actions.push({
      type: "feast",
      label: "Hold a feast",
      description:
        "Spend wealth on a grand gathering to lift spirits and impress neighbors.",
      locked,
      lockReasons,
    });
  }

  {
    const reqs: ActionRequirement[] = [
      {
        type: "min_resource",
        resource: "magic",
        value: 3,
        unmet_hint:
          "The spirits are distant; the clan lacks the spiritual strength for such a rite.",
      },
    ];
    const { locked, lockReasons } = evaluateRequirements(reqs, state);
    actions.push({
      type: "ritual",
      label: "Perform a ritual",
      description:
        "Call upon the gods and spirits for guidance, protection, or power.",
      locked,
      lockReasons,
    });
  }

  {
    const reqs: ActionRequirement[] = [
      {
        type: "min_resource",
        resource: "reputation",
        value: 3,
        unmet_hint:
          "The clan's name carries too little weight to send envoys who will be received.",
      },
    ];
    const { locked, lockReasons } = evaluateRequirements(reqs, state);
    actions.push({
      type: "emissaries",
      label: "Send emissaries",
      description:
        "Send diplomats to strengthen ties with a neighboring clan.",
      requiresTarget: true,
      validTargets: clanNames,
      locked,
      lockReasons,
    });
  }

  {
    const reqs: ActionRequirement[] = [
      {
        type: "min_resource",
        resource: "wealth",
        value: 2,
        unmet_hint: "There are not enough materials to build with.",
      },
      {
        type: "min_resource",
        resource: "people",
        value: 3,
        unmet_hint: "Too few hands remain for such labor.",
      },
    ];
    const { locked, lockReasons } = evaluateRequirements(reqs, state);
    actions.push({
      type: "fortify",
      label: "Fortify defenses",
      description:
        "Invest labor and materials in walls, watchtowers, and weapons.",
      locked,
      lockReasons,
    });
  }

  // === Relationship-Gated ===

  {
    const allies = state.clan_relationships.filter((r) => r.score >= 2);
    const locked = allies.length === 0;
    actions.push({
      type: "request_aid",
      label: "Request aid from an ally",
      description: "Call upon the bonds of friendship to ask for help.",
      requiresTarget: true,
      validTargets: allies.map((a) => a.clan_name),
      locked,
      lockReasons: locked
        ? [
            "The clan has no bonds strong enough to call upon for aid.",
          ]
        : undefined,
    });
  }

  // === Year-Gated (hidden entirely until narratively revealed) ===

  if (state.current_year >= 4 && state.world.looming_threat) {
    actions.push({
      type: "prepare_threat",
      label: `Prepare for the ${state.world.looming_threat.name}`,
      description: `Take steps to ready the clan against the ${state.world.looming_threat.name}.`,
    });
  }

  // === Flag/Storyline-Unlocked (with optional requirements) ===

  for (const unlocked of state.unlocked_actions) {
    const { locked, lockReasons } = evaluateRequirements(
      unlocked.requirements,
      state,
    );
    actions.push({
      type: "custom",
      label: unlocked.label,
      description: unlocked.description,
      locked,
      lockReasons,
    });
  }

  // Sort: available actions first, locked actions last
  actions.sort((a, b) => {
    if (a.locked && !b.locked) return 1;
    if (!a.locked && b.locked) return -1;
    return 0;
  });

  return actions;
}
