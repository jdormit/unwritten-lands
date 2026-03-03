import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import {
  generateDirectorEvent,
  generateDirectorAction,
  generateNarration,
} from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";
import { GameHeader } from "../components/GameHeader";
import { EventNarrative } from "../components/EventNarrative";
import { AdvisorPanel } from "../components/AdvisorPanel";
import { ChoiceButtons } from "../components/ChoiceButtons";
import { HistoryLog } from "../components/HistoryLog";
import { WorldSidebar } from "../components/WorldSidebar";
import { saveGame } from "../persistence/save";
import type { Resources } from "../types/game";

interface EventScreenProps {
  auth: Auth;
  actionType?: string;
  actionTarget?: string;
}

export function EventScreen({ auth, actionType, actionTarget }: EventScreenProps) {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousResources, setPreviousResources] = useState<Resources | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [loreOpen, setLoreOpen] = useState(false);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);

  const isPlayerAction = !!actionType;

  const generate = useCallback(async () => {
    cancelledRef.current = false;

    try {
      // Step 1: Director
      const directorOutput = isPlayerAction
        ? await generateDirectorAction(auth, state, actionType!, actionTarget)
        : await generateDirectorEvent(auth, state);

      if (cancelledRef.current) return;

      // Step 2: Narrator
      const narratorOutput = await generateNarration(
        auth,
        state,
        directorOutput,
        isPlayerAction,
      );

      if (cancelledRef.current) return;

      dispatch({
        type: "SET_CURRENT_EVENT",
        event: {
          director: directorOutput,
          narrator: narratorOutput,
          isPlayerAction,
        },
      });
      setLoading(false);
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : "The spirits are silent");
        setLoading(false);
      }
    }
  }, [auth, state, dispatch, isPlayerAction, actionType, actionTarget]);

  // Generate event via Director → Narrator pipeline
  useEffect(() => {
    if (state.current_event || generationTriggered.current) {
      setLoading(false);
      return;
    }

    generationTriggered.current = true;
    generate();

    return () => { cancelledRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRetry() {
    setError(null);
    setLoading(true);
    generate();
  }

  function handleChoice(optionIndex: number) {
    if (choosing) return;
    setChoosing(true);

    // Store current resources before applying changes
    setPreviousResources({ ...state.resources });

    // Apply the choice
    dispatch({ type: "APPLY_CHOICE", optionIndex });
  }

  // Auto-save after choice is applied
  useEffect(() => {
    if (
      state.phase === "event_resolved" ||
      state.phase === "action_resolved" ||
      state.phase === "game_over_loading"
    ) {
      saveGame(state);
    }
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-4">
        {state.world && (
          <>
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
          </>
        )}
        <div className="flex-1 flex items-center justify-center">
          <LoadingState
            message={
              isPlayerAction
                ? "Your clan sets forth..."
                : "Fate turns its gaze upon you..."
            }
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-blood text-lg">The spirits are silent...</p>
          <p className="text-parchment-600 text-sm">{error}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-2 parchment-card hover:bg-parchment-100 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const event = state.current_event;
  if (!event || !state.world) return null;

  return (
    <div className="min-h-dvh flex flex-col px-4 py-4 gap-4">
      {/* Header with resources */}
      <GameHeader
        clanName={state.world.clan.name}
        year={state.current_year}
        season={state.current_season}
        resources={state.resources}
        previousResources={previousResources ?? undefined}
        onOpenLore={() => setLoreOpen(true)}
      />

      {/* World Lore Sidebar */}
      <WorldSidebar
        isOpen={loreOpen}
        onClose={() => setLoreOpen(false)}
        world={state.world}
        relationships={state.clan_relationships}
        flags={state.flags}
        storylines={state.active_storylines}
      />

      {/* Main content */}
      <div className="flex-1 w-full max-w-2xl mx-auto space-y-5">
        {/* Event Narrative */}
        <div className="parchment-card px-6 py-5">
          <EventNarrative text={event.narrator.event_narrative} />
        </div>

        {/* Advisor Opinions */}
        <AdvisorPanel
          opinions={event.narrator.advisor_opinions}
          advisors={state.world.advisors}
        />

        {/* Choices */}
        <ChoiceButtons
          optionTexts={event.narrator.option_texts}
          options={event.director.options}
          onChoose={handleChoice}
          disabled={choosing}
        />

        {/* History */}
        <HistoryLog
          entries={state.event_history}
          clanName={state.world.clan.name}
        />
      </div>
    </div>
  );
}
