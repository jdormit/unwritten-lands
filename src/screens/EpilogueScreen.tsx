import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import type { DeepPartial } from "ai";
import { streamEpilogue } from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";
import { EventNarrative } from "../components/EventNarrative";
import { deleteSave } from "../persistence/save";
import type { EpilogueOutput } from "../types/game";

interface EpilogueScreenProps {
  auth: Auth;
  isCollapse: boolean;
}

const OUTCOME_LABELS: Record<string, string> = {
  triumph: "A Glorious Triumph",
  survival: "Survival Against the Odds",
  pyrrhic_victory: "A Pyrrhic Victory",
  defeat: "A Noble Defeat",
  collapse: "The Fall of the Clan",
};

const OUTCOME_STYLES: Record<string, string> = {
  triumph: "text-gold",
  survival: "text-forest",
  pyrrhic_victory: "text-ember",
  defeat: "text-parchment-700",
  collapse: "text-blood",
};

export function EpilogueScreen({ auth, isCollapse }: EpilogueScreenProps) {
  const { state, dispatch } = useGame();
  const [error, setError] = useState<string | null>(null);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);
  const abortRef = useRef<(() => void) | null>(null);

  // Streaming state
  const [partial, setPartial] = useState<DeepPartial<EpilogueOutput> | null>(null);
  const [complete, setComplete] = useState<EpilogueOutput | null>(state.epilogue ?? null);

  const generate = useCallback(() => {
    cancelledRef.current = false;
    setError(null);
    setPartial(null);
    setComplete(null);

    const stream = streamEpilogue(auth, state);
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
        dispatch({ type: "SET_EPILOGUE", epilogue: output });
      })
      .catch((e) => {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : "The saga cannot be told");
        }
      });
  }, [auth, state, dispatch]);

  useEffect(() => {
    if (state.epilogue || generationTriggered.current) {
      if (state.epilogue) {
        setComplete(state.epilogue);
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

  function handleNewGame() {
    deleteSave();
    dispatch({ type: "RESET" });
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-blood text-lg">The saga-keeper's voice falters.</p>
          <p className="text-parchment-600 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              generationTriggered.current = false;
              generate();
            }}
            className="px-6 py-2 parchment-card hover:bg-parchment-100 transition-colors cursor-pointer"
          >
            Ask them to try again
          </button>
        </div>
      </div>
    );
  }

  // Use complete or partial data
  const epilogue = complete ?? partial;
  const isStreaming = !complete;

  // Nothing yet — initial loading
  if (!epilogue) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <LoadingState
          message={
            isCollapse
              ? "The wind carries the last whispers of your name..."
              : "The saga-keepers gather to tell your tale..."
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Outcome Badge + Title */}
        <div className="text-center space-y-3">
          {epilogue.outcome && (
            <p
              className={`text-sm font-sans font-bold uppercase tracking-widest animate-fade-in ${
                OUTCOME_STYLES[epilogue.outcome] ?? "text-parchment-600"
              }`}
            >
              {OUTCOME_LABELS[epilogue.outcome] ?? epilogue.outcome}
            </p>
          )}
          {epilogue.saga_title && (
            <h1 className="text-4xl font-bold text-parchment-900 animate-fade-in">
              {epilogue.saga_title}
            </h1>
          )}
          <div className="w-32 mx-auto border-t-2 border-parchment-400" />
        </div>

        {/* Final Resources — show immediately if we have title */}
        {epilogue.saga_title && (
          <div className="parchment-card px-6 py-4 animate-fade-in">
            <p className="text-sm font-sans text-parchment-500 mb-2">
              Final State of the {state.world?.clan.name ?? "Clan"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {(["people", "wealth", "magic", "reputation"] as const).map((r) => (
                <div key={r}>
                  <p className="text-2xl font-bold text-parchment-900">
                    {state.resources[r]}
                  </p>
                  <p className="text-xs font-sans text-parchment-500 capitalize">
                    {r}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saga Text — streams in */}
        {epilogue.saga_text && (
          <div className="parchment-card px-6 py-6 sm:px-8 animate-fade-in">
            <EventNarrative text={epilogue.saga_text} />
          </div>
        )}

        {/* Still streaming indicator */}
        {isStreaming && (
          <div className="flex justify-center py-4">
            <div className="w-32 h-1 rounded-full overflow-hidden loading-shimmer" />
          </div>
        )}

        {/* Relationships + New Game — only when complete */}
        {!isStreaming && (
          <>
            {state.clan_relationships.length > 0 && (
              <div className="parchment-card px-6 py-4 animate-fade-in">
                <p className="text-sm font-sans text-parchment-500 mb-3">
                  Final Relationships
                </p>
                <div className="space-y-2">
                  {state.clan_relationships.map((rel) => (
                    <div
                      key={rel.clan_name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-parchment-800">{rel.clan_name}</span>
                      <span
                        className={`font-sans font-bold ${
                          rel.score > 0
                            ? "text-forest"
                            : rel.score < 0
                              ? "text-blood"
                              : "text-parchment-500"
                        }`}
                      >
                        {rel.score > 0 ? "+" : ""}
                        {rel.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-4 pb-8 animate-fade-in">
              <button
                onClick={handleNewGame}
                className="px-8 py-4 bg-parchment-900 text-parchment-50 rounded-lg text-lg font-bold
                  hover:bg-parchment-800 transition-colors cursor-pointer"
              >
                Begin a New Saga
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
