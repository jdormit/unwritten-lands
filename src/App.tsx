import { useState, useCallback, useEffect } from "react";
import type { Auth } from "ai-sdk-codex-oauth";
import { useGame } from "./state/game-context";
import { loadGame, saveGame } from "./persistence/save";
import { TitleScreen } from "./screens/TitleScreen";
import { WorldGenScreen } from "./screens/WorldGenScreen";
import { SacredTimeScreen } from "./screens/SacredTimeScreen";
import { EventScreen } from "./screens/EventScreen";
import { ConsequenceScreen } from "./screens/ConsequenceScreen";
import { ActionSelectionScreen } from "./screens/ActionSelectionScreen";
import { EpilogueScreen } from "./screens/EpilogueScreen";
import { AuthFlow } from "./components/AuthFlow";

function App() {
  const { state, dispatch } = useGame();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    target?: string;
  } | null>(null);

  // Handle auth completion
  const handleAuthenticated = useCallback((auth: Auth) => {
    setAuth(auth);
    // If we were waiting for auth to start a game, proceed to world gen
    if (state.phase === "authenticating") {
      dispatch({ type: "SET_PHASE", phase: "world_gen" });
    }
  }, [state.phase, dispatch]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    dispatch({ type: "RESET" });
    if (auth) {
      dispatch({ type: "SET_PHASE", phase: "world_gen" });
    } else {
      dispatch({ type: "SET_PHASE", phase: "authenticating" });
    }
  }, [auth, dispatch]);

  // Handle continue
  const handleContinue = useCallback(() => {
    const saved = loadGame();
    if (saved) {
      dispatch({ type: "LOAD_GAME", state: saved });
    }
  }, [dispatch]);

  // Handle action selection
  const handleSelectAction = useCallback(
    (actionType: string, targetClan?: string) => {
      setPendingAction({ type: actionType, target: targetClan });
      dispatch({ type: "SET_PHASE", phase: "action_loading" });
    },
    [dispatch],
  );

  // Handle skip action
  const handleSkipAction = useCallback(() => {
    dispatch({ type: "ADVANCE_SEASON" });
  }, [dispatch]);

  // Auto-save on meaningful state transitions
  useEffect(() => {
    if (
      state.world &&
      (state.phase === "sacred_time" ||
        state.phase === "event_loading" ||
        state.phase === "action_selection")
    ) {
      saveGame(state);
    }
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render based on game phase
  switch (state.phase) {
    case "title":
      return (
        <TitleScreen
          onNewGame={handleNewGame}
          onContinue={handleContinue}
        />
      );

    case "authenticating":
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-4">
          <div className="max-w-md w-full">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        </div>
      );

    case "world_gen":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <WorldGenScreen auth={auth} />;

    case "sacred_time":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <SacredTimeScreen auth={auth} />;

    case "event_loading":
    case "event":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <EventScreen key={`${state.current_year}-${state.current_season}`} auth={auth} />;

    case "event_resolved":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <ConsequenceScreen auth={auth} />;

    case "action_selection":
      return (
        <ActionSelectionScreen
          onSelectAction={handleSelectAction}
          onSkip={handleSkipAction}
        />
      );

    case "action_loading":
    case "action":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return (
        <EventScreen
          key={`action-${state.current_year}-${state.current_season}`}
          auth={auth}
          actionType={pendingAction?.type}
          actionTarget={pendingAction?.target}
        />
      );

    case "action_resolved":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <ConsequenceScreen auth={auth} />;

    case "climax_loading":
    case "climax":
      // For the climax, we run the event pipeline one more time with special context
      // For now, go directly to epilogue
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <EpilogueScreen auth={auth} isCollapse={false} />;

    case "epilogue_loading":
    case "epilogue":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <EpilogueScreen auth={auth} isCollapse={false} />;

    case "game_over_loading":
    case "game_over":
      if (!auth) {
        return (
          <div className="min-h-dvh flex flex-col items-center justify-center px-4">
            <AuthFlow onAuthenticated={handleAuthenticated} />
          </div>
        );
      }
      return <EpilogueScreen auth={auth} isCollapse={true} />;

    default:
      return null;
  }
}

export default App;
