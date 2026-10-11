import { useSyncExternalStore } from "react";
import { useGame } from "../state/game-context";
import { getGenerationRecords, isDebugEnabled, subscribeDebug } from "../debug/generation-debug";

export function GenerationDebug() {
  const enabled = useSyncExternalStore(subscribeDebug, isDebugEnabled);
  const records = useSyncExternalStore(subscribeDebug, getGenerationRecords);
  const { state } = useGame();
  if (!enabled) return null;

  const hiddenState = {
    resources: state.resources,
    magic_allocation: state.magic_allocation,
    clan_relationships: state.clan_relationships,
    flags: state.flags,
    active_storylines: state.active_storylines,
    resolved_storylines: state.resolved_storylines,
    unlocked_actions: state.unlocked_actions,
    last_event_type: state.last_event_type,
    current_director: state.current_event?.director ?? null,
  };

  return (
    <section aria-label="Generation debug" className="parchment-card p-4 space-y-3 font-sans text-sm text-left">
      <h3 className="font-bold text-parchment-900">Generation debug</h3>
      <details>
        <summary className="cursor-pointer font-semibold">Current hidden game state</summary>
        <pre className="text-xs whitespace-pre-wrap break-words mt-2">{JSON.stringify(hiddenState, null, 2)}</pre>
      </details>
      {records.length === 0 && <p>No requests recorded in this session yet.</p>}
      {[...records].reverse().map((record) => (
        <details key={record.id} className="border-t border-parchment-300 pt-2">
          <summary className="cursor-pointer">
            #{record.id} {record.label}{record.year !== null ? ` — Year ${record.year}, ${record.season}` : ""} ({record.status})
          </summary>
          <p className="text-xs text-parchment-500 mt-2">{record.time}</p>
          <h4 className="font-semibold mt-2">Seeds and theme inputs</h4>
          {Object.keys(record.seeds).length === 0 ? <p>No abstract seeds for this request.</p> : (
            <dl className="text-xs space-y-2 mt-2">
              {Object.entries(record.seeds).map(([name, value]) => (
                <div key={name}><dt className="font-semibold">{name}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          )}
          <h4 className="font-semibold mt-3">Literary inspiration</h4>
          <pre className="text-xs whitespace-pre-wrap break-words mt-2">{record.inspiration}</pre>
          <details className="mt-3">
            <summary className="cursor-pointer">Original request</summary>
            <pre className="text-xs whitespace-pre-wrap break-words mt-2">{record.prompt}</pre>
          </details>
          {record.attempts.map((attempt) => (
            <details key={attempt.number} className="mt-3">
              <summary className="cursor-pointer">Attempt {attempt.number} — {attempt.kind} ({attempt.status})</summary>
              <h4 className="font-semibold mt-2">Actual request</h4>
              <pre className="text-xs whitespace-pre-wrap break-words mt-2">{attempt.prompt}</pre>
              <h4 className="font-semibold mt-2">Response</h4>
              <pre className="text-xs whitespace-pre-wrap break-words mt-2">{attempt.raw_response ?? JSON.stringify(attempt.output, null, 2)}</pre>
              {attempt.validation_feedback && <pre className="text-xs whitespace-pre-wrap break-words mt-2">{attempt.validation_feedback}</pre>}
              {attempt.error && <p className="text-blood mt-2">{attempt.error}</p>}
            </details>
          ))}
          <details className="mt-3">
            <summary className="cursor-pointer">System prompt and input state</summary>
            <pre className="text-xs whitespace-pre-wrap break-words mt-2">{record.system}</pre>
            {record.input_state && (
              <pre className="text-xs whitespace-pre-wrap break-words mt-2">{JSON.stringify(record.input_state, null, 2)}</pre>
            )}
          </details>
          <details className="mt-3">
            <summary className="cursor-pointer">Structured output (including hidden Director decisions)</summary>
            <pre className="text-xs whitespace-pre-wrap break-words mt-2">{JSON.stringify(record.output, null, 2)}</pre>
          </details>
          {record.error && <p className="text-blood mt-2">{record.error}</p>}
        </details>
      ))}
    </section>
  );
}
