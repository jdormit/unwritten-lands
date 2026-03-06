import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import type { DeepPartial } from "ai";
import { streamSacredTime } from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";
import { GameHeader } from "../components/GameHeader";
import { EventNarrative } from "../components/EventNarrative";
import { WorldSidebar } from "../components/WorldSidebar";
import type { MagicAllocation, SacredTimeOutput } from "../types/game";

interface SacredTimeScreenProps {
  auth: Auth;
}

export function SacredTimeScreen({ auth }: SacredTimeScreenProps) {
  const { state, dispatch } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<MagicAllocation>({
    war: 1,
    harvest: 1,
    diplomacy: 1,
  });
  const [loreOpen, setLoreOpen] = useState(false);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);
  const abortRef = useRef<(() => void) | null>(null);

  // Streaming state
  const [partial, setPartial] = useState<DeepPartial<SacredTimeOutput> | null>(null);
  const [complete, setComplete] = useState<SacredTimeOutput | null>(state.sacred_time ?? null);

  const TOTAL_POINTS = 5;
  const pointsUsed = allocation.war + allocation.harvest + allocation.diplomacy;
  const pointsRemaining = TOTAL_POINTS - pointsUsed;

  const generate = useCallback(() => {
    cancelledRef.current = false;
    setError(null);
    setPartial(null);
    setComplete(null);

    const stream = streamSacredTime(auth, state);
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
        dispatch({ type: "SET_SACRED_TIME", sacredTime: output });
      })
      .catch((e) => {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : "Failed to read the omens");
        }
      });
  }, [auth, state, dispatch]);

  // Generate sacred time narrative
  useEffect(() => {
    if (state.sacred_time || generationTriggered.current) {
      if (state.sacred_time) {
        setComplete(state.sacred_time);
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

  function adjustAllocation(category: keyof MagicAllocation, delta: number) {
    setAllocation((prev) => {
      const newVal = prev[category] + delta;
      if (newVal < 0 || newVal > 3) return prev;

      const newTotal =
        (category === "war" ? newVal : prev.war) +
        (category === "harvest" ? newVal : prev.harvest) +
        (category === "diplomacy" ? newVal : prev.diplomacy);

      if (newTotal > TOTAL_POINTS) return prev;

      return { ...prev, [category]: newVal };
    });
  }

  function beginYear() {
    dispatch({ type: "SET_MAGIC_ALLOCATION", allocation });
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-blood text-lg">The omens are unclear.</p>
          <p className="text-parchment-600 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              generationTriggered.current = false;
              generate();
            }}
            className="px-6 py-2 parchment-card hover:bg-parchment-100 transition-colors cursor-pointer"
          >
            Consult the spirits again
          </button>
        </div>
      </div>
    );
  }

  // Use complete or partial data for display
  const sacred = complete ?? partial;
  const isStreaming = !complete;

  // Nothing yet — initial loading
  if (!sacred) {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-4 gap-4">
        {state.world && (
          <>
            <GameHeader
              clanName={state.world.clan.name}
              year={state.current_year}
              season="sacred_time"
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
          <LoadingState message="The stars align for Sacred Time..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-4 gap-4">
      <GameHeader
        clanName={state.world?.clan.name ?? "Clan"}
        year={state.current_year}
        season="sacred_time"
        resources={state.resources}
        onOpenLore={() => setLoreOpen(true)}
      />

      {state.world && (
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
      )}

      <div className="flex-1 w-full max-w-2xl mx-auto space-y-5">
        {/* Screen Title */}
        <h2 className="text-3xl font-bold text-parchment-900 text-center">
          Sacred Time
        </h2>

        {/* Year Recap */}
        {sacred.year_recap && (
          <div className="parchment-card px-6 py-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-sans font-bold text-parchment-600 uppercase tracking-wide">
              {state.current_year === 1 ? "The Beginning" : "The Past Year"}
            </h3>
            <EventNarrative text={sacred.year_recap} />
          </div>
        )}

        {/* Omens */}
        {sacred.omens && (
          <div className="parchment-card px-6 py-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-sans font-bold text-resource-magic uppercase tracking-wide">
              Omens
            </h3>
            <p className="italic text-parchment-800">{sacred.omens}</p>
          </div>
        )}

        {/* Threat Status */}
        {sacred.threat_status && typeof sacred.threat_status === "string" && sacred.threat_status.trim() !== "" && (
          <div className="parchment-card px-6 py-5 space-y-4 border-l-4 border-l-ember animate-fade-in">
            <h3 className="text-sm font-sans font-bold text-ember uppercase tracking-wide">
              {state.world?.looming_threat.name ?? "Threat"}
            </h3>
            <p className="text-parchment-800">{sacred.threat_status}</p>
          </div>
        )}

        {/* Still streaming indicator */}
        {isStreaming && (
          <div className="flex justify-center py-4">
            <div className="w-32 h-1 rounded-full overflow-hidden loading-shimmer" />
          </div>
        )}

        {/* Magic Allocation — only show when generation is complete */}
        {!isStreaming && (
          <>
            <div className="parchment-card px-6 py-5 space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-sans font-bold text-parchment-600 uppercase tracking-wide">
                  Allocate the Clan's Magic
                </h3>
                <p className="text-sm text-parchment-500 mt-1">
                  Distribute {TOTAL_POINTS} points across war, harvest, and diplomacy.
                  Points remaining: <strong>{pointsRemaining}</strong>
                </p>
              </div>

              {(["war", "harvest", "diplomacy"] as const).map((category) => (
                <div key={category} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-sans font-bold text-parchment-700 capitalize">
                    {category}
                  </span>
                  <button
                    onClick={() => adjustAllocation(category, -1)}
                    disabled={allocation[category] <= 0}
                    className="w-8 h-8 flex items-center justify-center parchment-card
                      hover:bg-parchment-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed
                      font-sans font-bold text-lg"
                  >
                    -
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded ${
                          i < allocation[category]
                            ? "bg-resource-magic"
                            : "bg-parchment-200"
                        } transition-colors`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => adjustAllocation(category, 1)}
                    disabled={allocation[category] >= 3 || pointsRemaining <= 0}
                    className="w-8 h-8 flex items-center justify-center parchment-card
                      hover:bg-parchment-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed
                      font-sans font-bold text-lg"
                  >
                    +
                  </button>
                  <span className="text-sm font-sans text-parchment-500">
                    {allocation[category]}/{3}
                  </span>
                </div>
              ))}
            </div>

            {/* Begin Year Button */}
            <button
              onClick={beginYear}
              className="w-full py-4 bg-parchment-900 text-parchment-50 rounded-lg text-lg font-bold
                hover:bg-parchment-800 transition-colors cursor-pointer active:scale-[0.99]"
            >
              Begin Year {state.current_year}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
