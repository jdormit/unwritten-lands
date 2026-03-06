import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import type { DeepPartial } from "ai";
import {
  generateDirectorEvent,
  generateDirectorAction,
  streamNarration,
} from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";
import { GameHeader } from "../components/GameHeader";
import { EventNarrative } from "../components/EventNarrative";
import { AdvisorPanel } from "../components/AdvisorPanel";
import { ChoiceButtons } from "../components/ChoiceButtons";
import { WorldSidebar } from "../components/WorldSidebar";
import { saveGame } from "../persistence/save";
import type {
  Resources,
  DirectorOutput,
  NarratorOutput,
} from "../types/game";

interface EventScreenProps {
  auth: Auth;
  actionType?: string;
  actionTarget?: string;
}

export function EventScreen({ auth, actionType, actionTarget }: EventScreenProps) {
  const { state, dispatch } = useGame();
  const [directorLoading, setDirectorLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousResources, setPreviousResources] = useState<Resources | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [loreOpen, setLoreOpen] = useState(false);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);
  const abortRef = useRef<(() => void) | null>(null);

  // Streaming narrator state
  const [directorOutput, setDirectorOutput] = useState<DirectorOutput | null>(null);
  const [partialNarrator, setPartialNarrator] = useState<DeepPartial<NarratorOutput> | null>(null);
  const [narratorComplete, setNarratorComplete] = useState<NarratorOutput | null>(null);

  const isPlayerAction = !!actionType;

  const generate = useCallback(async () => {
    cancelledRef.current = false;
    setDirectorLoading(true);
    setError(null);
    setDirectorOutput(null);
    setPartialNarrator(null);
    setNarratorComplete(null);

    try {
      // Step 1: Director (blocking — not user-facing)
      const director = isPlayerAction
        ? await generateDirectorAction(auth, state, actionType!, actionTarget)
        : await generateDirectorEvent(auth, state);

      if (cancelledRef.current) return;
      setDirectorOutput(director);
      setDirectorLoading(false);

      // Step 2: Stream Narrator
      const stream = streamNarration(auth, state, director, isPlayerAction);
      abortRef.current = stream.abort;

      // Consume partial stream
      (async () => {
        try {
          for await (const partial of stream.partialStream) {
            if (cancelledRef.current) return;
            setPartialNarrator(partial);
          }
        } catch {
          // Errors handled by finalOutput
        }
      })();

      // Wait for final output
      const narrator = await stream.finalOutput;
      if (cancelledRef.current) return;

      setNarratorComplete(narrator);
      dispatch({
        type: "SET_CURRENT_EVENT",
        event: {
          director,
          narrator,
          isPlayerAction,
        },
      });
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : "The spirits are silent");
        setDirectorLoading(false);
      }
    }
  }, [auth, state, dispatch, isPlayerAction, actionType, actionTarget]);

  // Generate event via Director → Narrator pipeline
  useEffect(() => {
    if (state.current_event || generationTriggered.current) {
      // Already have data
      if (state.current_event) {
        setDirectorOutput(state.current_event.director);
        setNarratorComplete(state.current_event.narrator);
        setDirectorLoading(false);
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

  function handleRetry() {
    setError(null);
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

  // Phase 0: Director still generating
  if (directorLoading) {
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
              eventHistory={state.event_history}
              clanName={state.world.clan.name}
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

  // Phase 1+: Director done, narrator streaming or complete
  const narrator = narratorComplete;
  const partial = partialNarrator;
  const director = directorOutput!;

  // Use either the complete narrator or the partial for display
  const displayTitle = narrator?.event_title ?? partial?.event_title;
  const displayNarrative = narrator?.event_narrative ?? partial?.event_narrative;
  const displayOpinions = narrator?.advisor_opinions ?? partial?.advisor_opinions;
  const displayOptionTexts = narrator?.option_texts ?? partial?.option_texts;

  // Determine what's ready to show
  const hasTitle = !!displayTitle;
  const hasNarrative = !!displayNarrative;
  const hasOpinions = displayOpinions && displayOpinions.length > 0 && displayOpinions[0]?.advisor_name;
  const hasOptions = narrator && displayOptionTexts && displayOptionTexts.length === 3 && displayOptionTexts.every(Boolean);

  return (
    <div className="min-h-dvh flex flex-col px-4 py-4 gap-4">
      {/* Header with resources */}
      {state.world && (
        <>
          <GameHeader
            clanName={state.world.clan.name}
            year={state.current_year}
            season={state.current_season}
            resources={state.resources}
            previousResources={previousResources ?? undefined}
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
        </>
      )}

      {/* Main content */}
      <div className="flex-1 w-full max-w-2xl mx-auto space-y-5">
        {/* Event Title */}
        {hasTitle && (
          <h2 className="text-3xl font-bold text-parchment-900 text-center animate-fade-in">
            {displayTitle}
          </h2>
        )}

        {/* Event Narrative */}
        {hasNarrative && (
          <div className="parchment-card px-6 py-5 animate-fade-in">
            <EventNarrative text={displayNarrative!} />
          </div>
        )}

        {/* Advisor Opinions — show each as it arrives */}
        {hasOpinions && state.world && (
          <div className="space-y-3">
            {(displayOpinions as { advisor_name?: string; opinion?: string }[]).map(
              (opinion, i) =>
                opinion?.advisor_name ? (
                  <div key={opinion.advisor_name} className="animate-fade-in">
                    <AdvisorOpinionCard
                      opinion={opinion as { advisor_name: string; opinion: string }}
                      advisor={state.world!.advisors.find(
                        (a) => a.name === opinion.advisor_name,
                      )}
                    />
                  </div>
                ) : null,
            )}
          </div>
        )}

        {/* Choices — only show when narrator is fully complete */}
        {hasOptions && state.world && (
          <div className="animate-fade-in">
            <ChoiceButtons
              optionTexts={displayOptionTexts as [string, string, string]}
              options={director.options as [any, any, any]}
              onChoose={handleChoice}
              disabled={choosing}
            />
          </div>
        )}

        {/* Still streaming indicator */}
        {!narrator && partial && (
          <div className="flex justify-center py-4">
            <div className="w-32 h-1 rounded-full overflow-hidden loading-shimmer" />
          </div>
        )}
      </div>
    </div>
  );
}

// Extracted advisor opinion card for individual rendering during streaming
function AdvisorOpinionCard({
  opinion,
  advisor,
}: {
  opinion: { advisor_name: string; opinion: string };
  advisor?: { name: string; archetype: string };
}) {
  const ARCHETYPE_STYLE: Record<string, string> = {
    warrior: "border-l-ember",
    mystic: "border-l-resource-magic",
    diplomat: "border-l-sky",
  };

  const borderColor = advisor
    ? ARCHETYPE_STYLE[advisor.archetype] ?? "border-l-parchment-400"
    : "border-l-parchment-400";

  return (
    <div className={`parchment-card border-l-4 ${borderColor} px-4 py-3`}>
      <span className="font-bold text-parchment-900 text-sm font-sans">
        {opinion.advisor_name}
        {advisor && (
          <span className="text-parchment-500 font-normal ml-1">
            ({advisor.archetype})
          </span>
        )}
      </span>
      {opinion.opinion && (
        <p className="advisor-speech mt-1">
          &ldquo;{opinion.opinion}&rdquo;
        </p>
      )}
    </div>
  );
}
