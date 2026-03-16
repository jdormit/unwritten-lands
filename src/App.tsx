import { useState, useCallback, useEffect } from "react";
import { useGame } from "./state/game-context";
import { loadGame, saveGame } from "./persistence/save";
import { TitleScreen } from "./screens/TitleScreen";
import { WorldGenScreen } from "./screens/WorldGenScreen";
import { SacredTimeScreen } from "./screens/SacredTimeScreen";
import { EventScreen } from "./screens/EventScreen";
import { ConsequenceScreen } from "./screens/ConsequenceScreen";
import { ActionSelectionScreen } from "./screens/ActionSelectionScreen";
import { EpilogueScreen } from "./screens/EpilogueScreen";

function App() {
  const { state, dispatch } = useGame();
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    target?: string;
  } | null>(null);

  // Handle new game
  const handleNewGame = useCallback(() => {
    dispatch({ type: "RESET" });
    dispatch({ type: "SET_PHASE", phase: "world_gen" });
  }, [dispatch]);

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

    case "world_gen":
      return <WorldGenScreen />;

    case "sacred_time":
      return <SacredTimeScreen />;

    case "event_loading":
    case "event":
      return <EventScreen key={`${state.current_year}-${state.current_season}`} />;

    case "event_resolved":
      return <ConsequenceScreen />;

    case "action_selection":
      return (
        <ActionSelectionScreen
          onSelectAction={handleSelectAction}
          onSkip={handleSkipAction}
        />
      );

    case "action_loading":
    case "action":
      return (
        <EventScreen
          key={`action-${state.current_year}-${state.current_season}`}
          actionType={pendingAction?.type}
          actionTarget={pendingAction?.target}
        />
      );

    case "action_resolved":
      return <ConsequenceScreen />;

    case "climax_loading":
    case "climax":
      return <EpilogueScreen isCollapse={false} />;

    case "epilogue_loading":
    case "epilogue":
      return <EpilogueScreen isCollapse={false} />;

    case "game_over_loading":
    case "game_over":
      return <EpilogueScreen isCollapse={true} />;

    default:
      return null;
  }
}

export default App;
