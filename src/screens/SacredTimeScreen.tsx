import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import { generateSacredTime } from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";
import { ResourceBarGroup } from "../components/ResourceBar";
import { EventNarrative } from "../components/EventNarrative";
import type { MagicAllocation, ResourceKey } from "../types/game";

interface SacredTimeScreenProps {
  auth: Auth;
}

export function SacredTimeScreen({ auth }: SacredTimeScreenProps) {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(!state.sacred_time);
  const [error, setError] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<MagicAllocation>({
    war: 1,
    harvest: 1,
    diplomacy: 1,
  });
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);

  const TOTAL_POINTS = 5;
  const pointsUsed = allocation.war + allocation.harvest + allocation.diplomacy;
  const pointsRemaining = TOTAL_POINTS - pointsUsed;

  const generate = useCallback(async () => {
    cancelledRef.current = false;

    try {
      const result = await generateSacredTime(auth, state);
      if (!cancelledRef.current) {
        dispatch({ type: "SET_SACRED_TIME", sacredTime: result });
        setLoading(false);
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : "Failed to read the omens");
        setLoading(false);
      }
    }
  }, [auth, state, dispatch]);

  // Generate sacred time narrative
  useEffect(() => {
    if (state.sacred_time || generationTriggered.current) {
      setLoading(false);
      return;
    }

    generationTriggered.current = true;
    generate();

    return () => { cancelledRef.current = true; };
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

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <LoadingState message="The stars align for Sacred Time..." />
      </div>
    );
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
              setLoading(true);
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

  const sacred = state.sacred_time!;

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-parchment-900">
            Sacred Time
          </h2>
          <p className="text-parchment-600 font-sans">
            Year {state.current_year} of the {state.world?.clan.name ?? "Clan"}
          </p>
        </div>

        {/* Resources Overview */}
        <div className="parchment-card px-6 py-4">
          <ResourceBarGroup resources={state.resources as Record<ResourceKey, number>} />
        </div>

        {/* Year Recap */}
        <div className="parchment-card px-6 py-5 space-y-4">
          <h3 className="text-sm font-sans font-bold text-parchment-600 uppercase tracking-wide">
            {state.current_year === 1 ? "The Beginning" : "The Past Year"}
          </h3>
          <EventNarrative text={sacred.year_recap} />
        </div>

        {/* Omens */}
        <div className="parchment-card px-6 py-5 space-y-4">
          <h3 className="text-sm font-sans font-bold text-resource-magic uppercase tracking-wide">
            Omens
          </h3>
          <p className="italic text-parchment-800">{sacred.omens}</p>
        </div>

        {/* Threat Status — hidden in early years when there's nothing to show */}
        {sacred.threat_status && sacred.threat_status.trim() !== "" && (
          <div className="parchment-card px-6 py-5 space-y-4 border-l-4 border-l-ember">
            <h3 className="text-sm font-sans font-bold text-ember uppercase tracking-wide">
              {state.world?.looming_threat.name ?? "Threat"}
            </h3>
            <p className="text-parchment-800">{sacred.threat_status}</p>
          </div>
        )}

        {/* Magic Allocation */}
        <div className="parchment-card px-6 py-5 space-y-5">
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
      </div>
    </div>
  );
}
