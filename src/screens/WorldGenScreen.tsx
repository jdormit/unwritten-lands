import { useEffect, useState, useRef, useCallback } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import { generateWorld } from "../llm/calls";
import { useGame } from "../state/game-context";
import { LoadingState } from "../components/LoadingState";

interface WorldGenScreenProps {
  auth: Auth;
}

export function WorldGenScreen({ auth }: WorldGenScreenProps) {
  const { dispatch } = useGame();
  const [error, setError] = useState<string | null>(null);
  const generationTriggered = useRef(false);
  const cancelledRef = useRef(false);

  const generate = useCallback(async () => {
    cancelledRef.current = false;

    try {
      const world = await generateWorld(auth);
      if (!cancelledRef.current) {
        dispatch({ type: "INIT_WORLD", world });
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : "World generation failed");
      }
    }
  }, [auth, dispatch]);

  useEffect(() => {
    if (generationTriggered.current) return;
    generationTriggered.current = true;

    generate();
    return () => { cancelledRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-blood text-lg">The world refuses to take shape.</p>
          <p className="text-parchment-600 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
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

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h2 className="text-3xl font-bold text-parchment-900">
          The World Takes Shape
        </h2>
        <LoadingState message="The gods carve the land from chaos..." />
        <p className="text-parchment-500 text-sm">
          Creating your world, mythology, advisors, and neighbors...
        </p>
      </div>
    </div>
  );
}
