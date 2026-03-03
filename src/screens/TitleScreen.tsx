import { hasSavedGame } from "../persistence/save";

interface TitleScreenProps {
  onNewGame: () => void;
  onContinue: () => void;
}

export function TitleScreen({ onNewGame, onContinue }: TitleScreenProps) {
  const savedGame = hasSavedGame();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-lg">
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-6xl font-bold text-parchment-900 tracking-tight">
            Unwritten Lands
          </h1>
          <p className="text-parchment-600 text-lg italic">
            A saga yet to be told
          </p>
        </div>

        <div className="w-32 mx-auto border-t-2 border-parchment-400" />

        <p className="text-parchment-700 leading-relaxed">
          Lead your clan through ten years of trial, wonder, and peril.
          Every choice writes the saga. Every season brings a new reckoning.
          An ancient threat stirs — and the land remembers.
        </p>

        <div className="space-y-3 pt-4">
          <button
            onClick={onNewGame}
            className="w-full max-w-xs mx-auto block px-8 py-4 bg-parchment-900 text-parchment-50 
              rounded-lg text-lg font-bold hover:bg-parchment-800 transition-colors cursor-pointer
              active:scale-[0.98]"
          >
            Begin a New Saga
          </button>

          {savedGame && (
            <button
              onClick={onContinue}
              className="w-full max-w-xs mx-auto block px-8 py-3 parchment-card 
                text-parchment-800 hover:bg-parchment-100 transition-colors cursor-pointer
                active:scale-[0.98]"
            >
              Continue Your Journey
            </button>
          )}
        </div>

        <p className="text-parchment-400 text-xs font-sans">
          Powered by the whispers of spirits and large language models
        </p>
      </div>
    </div>
  );
}
