import { useSyncExternalStore } from "react";
import { Bug } from "lucide-react";
import { isDebugEnabled, setDebugEnabled, subscribeDebug } from "../debug/generation-debug";

export function DebugToggle() {
  const enabled = useSyncExternalStore(subscribeDebug, isDebugEnabled);

  return (
    <button
      type="button"
      aria-label="Toggle generation debug"
      aria-pressed={enabled}
      onClick={() => setDebugEnabled(!enabled)}
      className={`fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))]
        z-[60] min-h-11 min-w-11 inline-flex items-center justify-center gap-1.5 rounded-full px-3
        border border-parchment-300 bg-parchment-50/95 font-sans text-xs shadow-sm cursor-pointer
        hover:bg-parchment-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember
        ${enabled ? "text-ember-dark" : "text-parchment-700 hover:text-parchment-900"}`}
    >
      <Bug size={14} aria-hidden="true" />
      Debug
    </button>
  );
}
