import type { GameState, GameFlag } from "../types/game";

const SAVE_KEY = "unwritten-lands-save";

/**
 * Migrate old save data to current format.
 */
function migrateSave(state: GameState): GameState {
  // Migrate flags from old string[] format to GameFlag[] format
  if (state.flags && state.flags.length > 0 && typeof state.flags[0] === "string") {
    state.flags = (state.flags as unknown as string[]).map(
      (f): GameFlag => ({ id: f, description: f.replace(/_/g, " ") }),
    );
  }
  return state;
}

/**
 * Save the current game state to localStorage.
 */
export function saveGame(state: GameState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, serialized);
  } catch (e) {
    console.error("Failed to save game:", e);
  }
}

/**
 * Load a saved game state from localStorage.
 * Returns null if no save exists or if the save is corrupted.
 */
export function loadGame(): GameState | null {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) return null;
    const state = JSON.parse(serialized) as GameState;
    // Basic validation — ensure it has the expected shape
    if (state.world && state.resources && state.current_year) {
      return migrateSave(state);
    }
    return null;
  } catch (e) {
    console.error("Failed to load save:", e);
    return null;
  }
}

/**
 * Check if a saved game exists.
 */
export function hasSavedGame(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/**
 * Delete the saved game.
 */
export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
