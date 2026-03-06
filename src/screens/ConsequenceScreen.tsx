import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import type { DeepPartial } from "ai";
import { streamConsequence } from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";
import { GameHeader } from "../components/GameHeader";
import { EventNarrative } from "../components/EventNarrative";
import { WorldSidebar } from "../components/WorldSidebar";
import { saveGame } from "../persistence/save";
import type { ConsequenceOutput } from "../types/game";

interface ConsequenceScreenProps {
  auth: Auth;
}

export function ConsequenceScreen({ auth }: ConsequenceScreenProps) {
  const { state, dispatch } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);
  const abortRef = useRef<(() => void) | null>(null);

  // Streaming state
  const [partial, setPartial] = useState<DeepPartial<ConsequenceOutput> | null>(null);
  const [complete, setComplete] = useState<ConsequenceOutput | null>(state.consequence ?? null);

  const choiceResult = state.last_choice_result;

  const generate = useCallback(() => {
    if (!choiceResult) return;
    cancelledRef.current = false;
    setError(null);
    setPartial(null);
    setComplete(null);

    const stream = streamConsequence(auth, state, choiceResult);
    abortRef.current = stream.abort;

    // Consume partial stream
    (async () => {
      try {
        for await (const partialObj of stream.partialStream) {
          if (cancelledRef.current) return;
          setPartial(partialObj);
        }
      } catch {
        // Errors handled by finalOutput
      }
    })();

    // Wait for final output
    stream.finalOutput
      .then((output) => {
        if (cancelledRef.current) return;
        setComplete(output);
        dispatch({ type: "SET_CONSEQUENCE", consequence: output });
      })
      .catch((e) => {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : "The outcome is unclear...");
        }
      });
  }, [auth, state, choiceResult, dispatch]);

  useEffect(() => {
    if (state.consequence || generationTriggered.current) {
      if (state.consequence) {
        setComplete(state.consequence);
      }
      return;
    }

    generationTriggered.current = true;
    generate();

    return () => {
      cancelledRef.current = true;
      abortRef.current?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save once consequence is loaded
  useEffect(() => {
    if (state.consequence) {
      saveGame(state);
    }
  }, [state.consequence]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    if (state.phase === "event_resolved") {
      dispatch({ type: "SET_PHASE", phase: "action_selection" });
    } else if (state.phase === "action_resolved") {
      dispatch({ type: "ADVANCE_SEASON" });
    }
  }

  function handleRetry() {
    setError(null);
    generationTriggered.current = false;
    generate();
  }

  if (!choiceResult || !state.world) return null;

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-4">
        <GameHeader
          clanName={state.world.clan.name}
          year={state.current_year}
          season={state.current_season}
          resources={state.resources}
          previousResources={choiceResult.previous_resources}
          onOpenLore={() => setLoreOpen(true)}
        />
        <WorldSidebar
          isOpen={loreOpen}
          onClose={() => setLoreOpen(false)}
          world={state.world}
          relationships={state.clan_relationships}
          flags={state.flags}
          storylines={state.active_storylines}
          eventHistory={state.event_history}
          clanName={state.world.clan.name}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-blood text-lg">The outcome is unclear...</p>
            <p className="text-parchment-600 text-sm">{error}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-2 parchment-card hover:bg-parchment-100 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use complete or partial data
  const consequence = complete ?? partial;
  const isStreaming = !complete;

  // Nothing yet — initial loading
  if (!consequence) {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-4">
        <GameHeader
          clanName={state.world.clan.name}
          year={state.current_year}
          season={state.current_season}
          resources={state.resources}
          previousResources={choiceResult.previous_resources}
          onOpenLore={() => setLoreOpen(true)}
        />
        <WorldSidebar
          isOpen={loreOpen}
          onClose={() => setLoreOpen(false)}
          world={state.world}
          relationships={state.clan_relationships}
          flags={state.flags}
          storylines={state.active_storylines}
          eventHistory={state.event_history}
          clanName={state.world.clan.name}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="The dust settles..." />
        </div>
      </div>
    );
  }

  // Build relationship change descriptions
  const relationshipDescriptions: string[] = [];
  if (choiceResult.relationship_effects) {
    for (const effect of choiceResult.relationship_effects) {
      if (effect.change > 0) {
        const intensity = effect.change >= 2 ? "greatly strengthened" : "strengthened";
        relationshipDescriptions.push(
          `Your bond with the ${effect.clan_name} has ${intensity}.`,
        );
      } else if (effect.change < 0) {
        const intensity = effect.change <= -2 ? "badly damaged" : "strained";
        relationshipDescriptions.push(
          `Your standing with the ${effect.clan_name} has been ${intensity}.`,
        );
      }
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-4 gap-4">
      {/* Header with animated resource changes */}
      <GameHeader
        clanName={state.world.clan.name}
        year={state.current_year}
        season={state.current_season}
        resources={state.resources}
        previousResources={choiceResult.previous_resources}
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
        eventHistory={state.event_history}
        clanName={state.world.clan.name}
      />

      {/* Main content */}
      <div className="flex-1 w-full max-w-2xl mx-auto space-y-5">
        {/* Event Title */}
        <h2 className="text-3xl font-bold text-parchment-900 text-center">
          {choiceResult.event_title}
        </h2>

        {/* The choice the player made */}
        <div className="border-l-4 border-parchment-400 pl-4 py-2">
          <p className="text-parchment-700 italic text-base leading-relaxed">
            {choiceResult.chosen_option_text}
          </p>
        </div>

        {/* Consequence narrative — streams in */}
        {consequence.consequence_narrative && (
          <div className="parchment-card px-6 py-5 animate-fade-in">
            <EventNarrative text={consequence.consequence_narrative} />
          </div>
        )}

        {/* Still streaming indicator */}
        {isStreaming && (
          <div className="flex justify-center py-4">
            <div className="w-32 h-1 rounded-full overflow-hidden loading-shimmer" />
          </div>
        )}

        {/* Relationship changes — show once streaming complete */}
        {!isStreaming && relationshipDescriptions.length > 0 && (
          <div className="text-center space-y-1 animate-fade-in">
            {relationshipDescriptions.map((desc, i) => (
              <p key={i} className="text-sm text-parchment-600 italic">
                {desc}
              </p>
            ))}
          </div>
        )}

        {/* Continue button — only when complete */}
        {!isStreaming && consequence.continue_text && (
          <div className="pt-2 pb-8 animate-fade-in">
            <button
              onClick={handleContinue}
              className="w-full px-6 py-4 parchment-card border-2 border-parchment-300
                hover:border-parchment-500 hover:bg-parchment-100
                transition-all duration-200 cursor-pointer
                text-center text-parchment-800 text-lg italic"
            >
              {consequence.continue_text}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
