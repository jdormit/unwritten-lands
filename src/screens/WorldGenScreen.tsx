import { useEffect, useState, useRef, useCallback } from "react";
import type { DeepPartial } from "ai";
import {
  generateThemeWithSeeds,
  generateSacredTime,
  streamWorldGeneration,
} from "../llm/calls";
import type { ThemeSeed } from "../types/schemas";
import type { WorldGeneration, SacredTimeOutput, GameState } from "../types/game";
import { useGame } from "../state/game-context";
import { INITIAL_RESOURCES, initialGameState } from "../state/game-reducer";
import { LoadingState } from "../components/LoadingState";
import { getRelationshipDisplay } from "../components/WorldSidebar";

export function WorldGenScreen() {
  const { dispatch } = useGame();
  const [error, setError] = useState<string | null>(null);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);
  const abortRef = useRef<(() => void) | null>(null);

  // Phase tracking for progressive reveal
  const [themeReady, setThemeReady] = useState(false);
  const [theme, setTheme] = useState<ThemeSeed | null>(null);
  const [partialWorld, setPartialWorld] = useState<DeepPartial<WorldGeneration> | null>(null);
  const [completedWorld, setCompletedWorld] = useState<WorldGeneration | null>(null);

  // Background sacred time pre-generation
  const sacredTimeRef = useRef<SacredTimeOutput | null>(null);
  const [sacredTimeReady, setSacredTimeReady] = useState(false);
  const sacredTimeTriggered = useRef(false);

  const generate = useCallback(async () => {
    cancelledRef.current = false;
    setError(null);
    setThemeReady(false);
    setTheme(null);
    setPartialWorld(null);
    setCompletedWorld(null);

    try {
      // Step 1: Generate theme
      const themeResult = await generateThemeWithSeeds();
      if (cancelledRef.current) return;

      setThemeReady(true);
      setTheme(themeResult.theme);

      // Step 2: Stream world generation
      const stream = streamWorldGeneration(themeResult.theme);
      abortRef.current = stream.abort;

      // Consume partial stream
      (async () => {
        try {
          for await (const partial of stream.partialStream) {
            if (cancelledRef.current) return;
            setPartialWorld(partial);
          }
        } catch {
          // Errors handled by finalOutput
        }
      })();

      // Wait for final output
      const world = await stream.finalOutput;
      if (cancelledRef.current) return;

      // Store completed world locally — don't dispatch yet
      setCompletedWorld(world);

      // Start background sacred time generation
      if (!sacredTimeTriggered.current) {
        sacredTimeTriggered.current = true;

        // Build a synthetic state matching what INIT_WORLD would produce
        const syntheticState: GameState = {
          ...initialGameState,
          phase: "sacred_time",
          world,
          resources: { ...INITIAL_RESOURCES },
          clan_relationships: world.neighboring_clans.map((c) => ({
            clan_name: c.name,
            score: c.initial_relationship,
          })),
        };

        generateSacredTime(syntheticState)
          .then((result) => {
            if (cancelledRef.current) return;
            sacredTimeRef.current = result;
            setSacredTimeReady(true);
          })
          .catch((err) => {
            // If background generation fails, SacredTimeScreen will retry
            console.warn("Background sacred time generation failed:", err);
          });
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : "World generation failed");
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (generationTriggered.current) return;
    generationTriggered.current = true;

    generate();
    return () => {
      cancelledRef.current = true;
      abortRef.current?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBeginSaga() {
    if (!completedWorld) return;

    // Dispatch INIT_WORLD (transitions to sacred_time phase)
    dispatch({ type: "INIT_WORLD", world: completedWorld });

    // If sacred time was pre-generated, inject it immediately
    if (sacredTimeRef.current) {
      dispatch({ type: "SET_SACRED_TIME", sacredTime: sacredTimeRef.current });
    }
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-blood text-lg">The world refuses to take shape.</p>
          <p className="text-parchment-600 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              generationTriggered.current = false;
              generate();
            }}
            className="px-6 py-2 parchment-card hover:bg-parchment-100 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Phase 0: Theme not ready yet — initial loading
  if (!themeReady) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <h2 className="text-3xl font-bold text-parchment-900">
            The World Takes Shape
          </h2>
          <LoadingState message="The gods carve the land from chaos..." />
        </div>
      </div>
    );
  }

  // Use completed world or partial world for display
  const world = completedWorld ?? partialWorld;
  const isStreaming = !completedWorld;

  // Phase 1+: Seeds and/or theme available, possibly streaming world
  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Title */}
        <h2 className="text-3xl font-bold text-parchment-900 text-center">
          The World Takes Shape
        </h2>

        {/* Theme Description — atmospheric intro while world streams in */}
        {theme && (
          <div className="parchment-card px-6 py-5 animate-fade-in">
            <p className="narrative-text">{theme.description}</p>
          </div>
        )}

        {/* World Sections — shown both during streaming and after completion */}
        {world && (
          <div className="space-y-4">
            {/* Setting */}
            {world.setting?.name && (
              <div className="parchment-card px-6 py-5 space-y-3 animate-fade-in">
                <h3 className="text-sm font-sans font-bold text-parchment-600 uppercase tracking-wide">
                  The Land
                </h3>
                <p className="text-xl font-bold text-parchment-900">
                  {world.setting.name}
                </p>
                {world.setting.geography && (
                  <p className="text-sm text-parchment-700">
                    {world.setting.geography}
                  </p>
                )}
              </div>
            )}

            {/* Mythology */}
            {world.mythology?.pantheon_summary && (
              <div className="parchment-card px-6 py-5 space-y-4 animate-fade-in">
                <h3 className="text-sm font-sans font-bold text-resource-magic uppercase tracking-wide">
                  Gods & Spirits
                </h3>
                <p className="text-sm text-parchment-700">
                  {world.mythology.pantheon_summary}
                </p>
                {world.mythology.creation_myth && (
                  <div className="border-l-4 border-parchment-300 pl-4">
                    <p className="text-sm text-parchment-700 italic">
                      {world.mythology.creation_myth}
                    </p>
                  </div>
                )}
                {world.mythology.key_deities && world.mythology.key_deities.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {world.mythology.key_deities.map((deity, i) =>
                      deity?.name ? (
                        <div key={i} className="space-y-0.5">
                          <span className="font-bold text-sm text-parchment-900">
                            {deity.name}
                          </span>
                          <p className="text-xs text-parchment-600">
                            {deity.domain}
                            {deity.personality ? ` \u00B7 ${deity.personality}` : ""}
                          </p>
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Clan */}
            {world.clan?.name && (
              <div className="parchment-card px-6 py-5 space-y-3 animate-fade-in">
                <h3 className="text-sm font-sans font-bold text-parchment-600 uppercase tracking-wide">
                  Your Clan
                </h3>
                <p className="text-xl font-bold text-parchment-900">
                  {world.clan.name}
                </p>
                {world.clan.backstory && (
                  <p className="text-sm text-parchment-700">
                    {world.clan.backstory}
                  </p>
                )}
              </div>
            )}

            {/* Advisors */}
            {world.advisors && world.advisors.length > 0 && world.advisors[0]?.name && (
              <div className="parchment-card px-6 py-5 space-y-3 animate-fade-in">
                <h3 className="text-sm font-sans font-bold text-parchment-600 uppercase tracking-wide">
                  Your Advisors
                </h3>
                <div className="space-y-3">
                  {world.advisors.map((advisor, i) => {
                    if (!advisor?.name) return null;
                    const borderColors: Record<string, string> = {
                      warrior: "border-l-ember",
                      mystic: "border-l-resource-magic",
                      diplomat: "border-l-sky",
                    };
                    return (
                      <div
                        key={i}
                        className={`border-l-4 ${borderColors[advisor.archetype ?? ""] ?? "border-l-parchment-400"} pl-4 py-1`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm text-parchment-900">
                            {advisor.name}
                          </span>
                          {advisor.archetype && (
                            <span className="text-xs font-sans text-parchment-500">
                              ({advisor.archetype})
                            </span>
                          )}
                        </div>
                        {advisor.patron_deity && (
                          <p className="text-xs text-parchment-500">
                            Patron: {advisor.patron_deity}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Neighboring Clans */}
            {world.neighboring_clans && world.neighboring_clans.length > 0 && world.neighboring_clans[0]?.name && (
              <div className="parchment-card px-6 py-5 space-y-4 animate-fade-in">
                <h3 className="text-sm font-sans font-bold text-parchment-600 uppercase tracking-wide">
                  Neighbors
                </h3>
                <div className="space-y-3">
                  {world.neighboring_clans.map((clan, i) => {
                    if (!clan?.name) return null;
                    const display = clan.initial_relationship != null
                      ? getRelationshipDisplay(clan.initial_relationship)
                      : null;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-sm text-parchment-900">
                            {clan.name}
                          </span>
                          {display && (
                            <span className={`text-xs font-sans font-semibold ${display.color}`}>
                              {display.label}
                            </span>
                          )}
                        </div>
                        {clan.reputation && (
                          <p className="text-sm text-parchment-700 italic">
                            {clan.reputation}
                          </p>
                        )}
                        {clan.detail && (
                          <p className="text-sm text-parchment-600">
                            {clan.detail}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Still streaming indicator */}
        {isStreaming && world && (
          <div className="flex justify-center py-4">
            <div className="w-32 h-1 rounded-full overflow-hidden loading-shimmer" />
          </div>
        )}

        {/* Begin Saga Button — only after world generation completes */}
        {!isStreaming && completedWorld && (
          <div className="pt-4 pb-8 animate-fade-in">
            <button
              onClick={handleBeginSaga}
              className="w-full py-4 bg-parchment-900 text-parchment-50 rounded-lg text-lg font-bold
                hover:bg-parchment-800 transition-colors cursor-pointer active:scale-[0.99]
                flex items-center justify-center gap-3"
            >
              Begin the Saga of the {completedWorld.clan.name}
              {!sacredTimeReady && (
                <span className="inline-block w-4 h-4 border-2 border-parchment-300 border-t-parchment-50 rounded-full animate-spin" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
