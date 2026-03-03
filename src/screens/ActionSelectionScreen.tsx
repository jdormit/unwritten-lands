import { useState } from "react";
import { useGame } from "../state/game-context";
import { getAvailableActions } from "../hooks/usePlayerActions";
import { GameHeader } from "../components/GameHeader";
import { WorldSidebar } from "../components/WorldSidebar";
import type { PlayerAction } from "../types/game";

interface ActionSelectionScreenProps {
  onSelectAction: (actionType: string, targetClan?: string) => void;
  onSkip: () => void;
}

export function ActionSelectionScreen({
  onSelectAction,
  onSkip,
}: ActionSelectionScreenProps) {
  const { state } = useGame();
  const [selectedAction, setSelectedAction] = useState<PlayerAction | null>(null);
  const [, setSelectedTarget] = useState<string | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);

  const actions = getAvailableActions(state);

  function handleActionClick(action: PlayerAction) {
    if (action.requiresTarget) {
      setSelectedAction(action);
      setSelectedTarget(null);
    } else {
      onSelectAction(action.type);
    }
  }

  function handleTargetSelect(target: string) {
    if (selectedAction) {
      onSelectAction(selectedAction.type, target);
    }
  }

  if (!state.world) return null;

  // Target selection sub-screen
  if (selectedAction?.requiresTarget) {
    const targets = selectedAction.validTargets ?? [];
    return (
      <div className="min-h-dvh flex flex-col px-4 py-4 gap-4">
        <GameHeader
          clanName={state.world.clan.name}
          year={state.current_year}
          season={state.current_season}
          resources={state.resources}
          onOpenLore={() => setLoreOpen(true)}
        />
        <WorldSidebar
          isOpen={loreOpen}
          onClose={() => setLoreOpen(false)}
          world={state.world}
          relationships={state.clan_relationships}
          flags={state.flags}
          storylines={state.active_storylines}
        />

        <div className="flex-1 w-full max-w-2xl mx-auto space-y-5">
          <div className="parchment-card px-6 py-5 space-y-4">
            <h3 className="text-xl font-bold text-parchment-900">
              {selectedAction.label}
            </h3>
            <p className="text-parchment-700">Choose a target clan:</p>
          </div>

          <div className="space-y-3">
            {targets.map((target) => {
              const rel = state.clan_relationships.find(
                (r) => r.clan_name === target,
              );
              const clan = state.world!.neighboring_clans.find(
                (c) => c.name === target,
              );

              return (
                <button
                  key={target}
                  onClick={() => handleTargetSelect(target)}
                  className="w-full text-left px-5 py-4 parchment-card border-2 border-parchment-300
                    hover:border-parchment-500 hover:bg-parchment-100 transition-all cursor-pointer"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-parchment-900">
                      {target}
                    </span>
                    {rel && (
                      <span
                        className={`text-sm font-sans ${
                          rel.score > 0
                            ? "text-forest"
                            : rel.score < 0
                              ? "text-blood"
                              : "text-parchment-500"
                        }`}
                      >
                        Relationship: {rel.score > 0 ? "+" : ""}
                        {rel.score}
                      </span>
                    )}
                  </div>
                  {clan && (
                    <p className="text-sm text-parchment-600 mt-1">
                      {clan.reputation} — {clan.detail}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setSelectedAction(null)}
            className="w-full py-3 text-parchment-600 hover:text-parchment-800 transition-colors cursor-pointer text-sm"
          >
            Back to actions
          </button>
        </div>
      </div>
    );
  }

  // Main action selection
  return (
    <div className="min-h-dvh flex flex-col px-4 py-4 gap-4">
      <GameHeader
        clanName={state.world.clan.name}
        year={state.current_year}
        season={state.current_season}
        resources={state.resources}
        onOpenLore={() => setLoreOpen(true)}
      />
      <WorldSidebar
        isOpen={loreOpen}
        onClose={() => setLoreOpen(false)}
        world={state.world}
        relationships={state.clan_relationships}
        flags={state.flags}
        storylines={state.active_storylines}
      />

      <div className="flex-1 w-full max-w-2xl mx-auto space-y-5">
        <div className="parchment-card px-6 py-5 space-y-2">
          <h3 className="text-xl font-bold text-parchment-900">
            The season stretches before you.
          </h3>
          <p className="text-parchment-700">
            What will the {state.world.clan.name} do?
          </p>
        </div>

        <div className="space-y-3">
          {actions.map((action) => (
            <button
              key={action.type + (action.label)}
              onClick={() => handleActionClick(action)}
              className="w-full text-left px-5 py-4 parchment-card border-2 border-parchment-300
                hover:border-parchment-500 hover:bg-parchment-100 transition-all cursor-pointer"
            >
              <p className="font-bold text-parchment-900">{action.label}</p>
              {action.description && (
                <p className="text-sm text-parchment-600 mt-1">
                  {action.description}
                </p>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          className="w-full py-4 parchment-card text-parchment-600 hover:text-parchment-800 
            hover:bg-parchment-100 transition-all cursor-pointer"
        >
          Let the season pass quietly
        </button>
      </div>
    </div>
  );
}
