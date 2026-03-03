import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import { generateEpilogue } from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";
import { EventNarrative } from "../components/EventNarrative";
import { deleteSave } from "../persistence/save";

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
  const [loading, setLoading] = useState(!state.epilogue);
  const [error, setError] = useState<string | null>(null);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);

  const generate = useCallback(async () => {
    cancelledRef.current = false;

    try {
      const epilogue = await generateEpilogue(auth, state);
      if (!cancelledRef.current) {
        dispatch({ type: "SET_EPILOGUE", epilogue });
        setLoading(false);
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : "The saga cannot be told");
        setLoading(false);
      }
    }
  }, [auth, state, dispatch]);

  useEffect(() => {
    if (state.epilogue || generationTriggered.current) {
      setLoading(false);
      return;
    }

    generationTriggered.current = true;
    generate();

    return () => { cancelledRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNewGame() {
    deleteSave();
    dispatch({ type: "RESET" });
  }

  if (loading) {
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

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-blood text-lg">The saga-keeper's voice falters.</p>
          <p className="text-parchment-600 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
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

  const epilogue = state.epilogue!;

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Outcome Badge */}
        <div className="text-center space-y-3">
          <p
            className={`text-sm font-sans font-bold uppercase tracking-widest ${
              OUTCOME_STYLES[epilogue.outcome] ?? "text-parchment-600"
            }`}
          >
            {OUTCOME_LABELS[epilogue.outcome] ?? epilogue.outcome}
          </p>
          <h1 className="text-4xl font-bold text-parchment-900">
            {epilogue.saga_title}
          </h1>
          <div className="w-32 mx-auto border-t-2 border-parchment-400" />
        </div>

        {/* Final Resources */}
        <div className="parchment-card px-6 py-4">
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

        {/* Saga Text */}
        <div className="parchment-card px-6 py-6 sm:px-8">
          <EventNarrative text={epilogue.saga_text} />
        </div>

        {/* Relationships */}
        {state.clan_relationships.length > 0 && (
          <div className="parchment-card px-6 py-4">
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

        {/* New Game */}
        <div className="text-center pt-4 pb-8">
          <button
            onClick={handleNewGame}
            className="px-8 py-4 bg-parchment-900 text-parchment-50 rounded-lg text-lg font-bold
              hover:bg-parchment-800 transition-colors cursor-pointer"
          >
            Begin a New Saga
          </button>
        </div>
      </div>
    </div>
  );
}
