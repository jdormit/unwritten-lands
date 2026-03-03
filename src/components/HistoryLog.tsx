import { useState } from "react";
import type { HistoryEntry } from "../types/game";

interface HistoryLogProps {
  entries: HistoryEntry[];
  clanName?: string;
}

const SEASON_ICONS: Record<string, string> = {
  spring: "🌱",
  summer: "☀",
  autumn: "🍂",
  winter: "❄",
};

export function HistoryLog({ entries, clanName }: HistoryLogProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="parchment-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer
          hover:bg-parchment-100 transition-colors rounded-lg"
      >
        <span className="text-sm font-sans font-bold text-parchment-700">
          {clanName ? `Chronicle of the ${clanName}` : "Chronicle"}
          <span className="font-normal text-parchment-500 ml-2">
            ({entries.length} events)
          </span>
        </span>
        <span className="text-parchment-500 text-sm">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-3 max-h-64 overflow-y-auto">
          <div className="space-y-2 border-l-2 border-parchment-300 pl-4">
            {entries.slice().reverse().map((entry, i) => (
              <div key={i} className="text-sm">
                <span className="font-sans text-parchment-500">
                  {SEASON_ICONS[entry.season] ?? ""} Year {entry.year}, {entry.season}
                </span>
                <p className="text-parchment-800 mt-0.5">{entry.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
