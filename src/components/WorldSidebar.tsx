import { useState } from "react";
import { Sprout, Sun, Leaf, Snowflake, X, ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  WorldGeneration,
  ClanRelationship,
  ActiveStoryline,
  GameFlag,
  HistoryEntry,
} from "../types/game";

interface WorldSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldGeneration;
  relationships: ClanRelationship[];
  flags: GameFlag[];
  storylines: ActiveStoryline[];
  eventHistory: HistoryEntry[];
  clanName?: string;
}

export const RELATIONSHIP_LABELS: Record<number, { label: string; color: string }> = {
  [-3]: { label: "Bitter Enemies", color: "text-blood" },
  [-2]: { label: "Hostile", color: "text-blood" },
  [-1]: { label: "Wary", color: "text-ember" },
  [0]: { label: "Neutral", color: "text-parchment-600" },
  [1]: { label: "Cordial", color: "text-forest" },
  [2]: { label: "Friendly", color: "text-forest" },
  [3]: { label: "Sworn Allies", color: "text-forest" },
};

export function getRelationshipDisplay(score: number) {
  const clamped = Math.max(-3, Math.min(3, score));
  return RELATIONSHIP_LABELS[clamped] ?? { label: "Unknown", color: "text-parchment-600" };
}

type SectionId = "chronicle" | "neighbors" | "geography" | "mythology" | "storylines" | "agreements";

const SEASON_ICONS: Record<string, LucideIcon> = {
  spring: Sprout,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
};

export function WorldSidebar({
  isOpen,
  onClose,
  world,
  relationships,
  flags,
  storylines,
  eventHistory,
  clanName,
}: WorldSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set(["neighbors"]),
  );

  function toggleSection(id: SectionId) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-parchment-950/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-parchment-50 border-l border-parchment-300 shadow-lg
          z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-parchment-50 border-b border-parchment-300 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-parchment-900">Chronicle &amp; Lore</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-parchment-500 hover:text-parchment-800
              transition-colors cursor-pointer text-xl leading-none"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {/* Chronicle Section */}
          <SectionHeader
            title={clanName ? `Chronicle of the ${clanName}` : "Chronicle"}
            isOpen={expandedSections.has("chronicle")}
            onToggle={() => toggleSection("chronicle")}
            count={eventHistory.length > 0 ? eventHistory.length : undefined}
          />
          {expandedSections.has("chronicle") && (
            <div className="pb-3">
              {eventHistory.length === 0 ? (
                <p className="text-sm text-parchment-500 italic px-1">
                  No events yet recorded.
                </p>
              ) : (
                <div className="space-y-2 border-l-2 border-parchment-300 pl-4 max-h-80 overflow-y-auto">
                  {eventHistory.slice().reverse().map((entry, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-sans text-parchment-500 whitespace-nowrap inline-flex items-center gap-1">
                          {(() => {
                            const SeasonIcon = SEASON_ICONS[entry.season];
                            return SeasonIcon ? <SeasonIcon size={12} /> : null;
                          })()}
                          Year {entry.year}, {entry.season}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-parchment-800">
                        {entry.title}
                      </p>
                      <p className="text-sm text-parchment-700">
                        {entry.summary}
                      </p>
                      <p className="text-xs text-parchment-500 italic">
                        You chose: {entry.chosenOption}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Neighbors Section */}
          <SectionHeader
            title="Neighbors"
            isOpen={expandedSections.has("neighbors")}
            onToggle={() => toggleSection("neighbors")}
          />
          {expandedSections.has("neighbors") && (
            <div className="space-y-3 pb-3">
              {world.neighboring_clans.map((clan) => {
                const rel = relationships.find(
                  (r) => r.clan_name === clan.name,
                );
                const display = getRelationshipDisplay(rel?.score ?? 0);
                return (
                  <div
                    key={clan.name}
                    className="parchment-card px-4 py-3 space-y-1.5"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-parchment-900">
                        {clan.name}
                      </span>
                      <span
                        className={`text-xs font-sans font-semibold ${display.color}`}
                      >
                        {display.label}
                      </span>
                    </div>
                    <p className="text-sm text-parchment-700 italic">
                      {clan.reputation}
                    </p>
                    <p className="text-sm text-parchment-600">{clan.detail}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Agreements & Flags Section */}
          <SectionHeader
            title="Agreements & Pacts"
            isOpen={expandedSections.has("agreements")}
            onToggle={() => toggleSection("agreements")}
          />
          {expandedSections.has("agreements") && (
            <div className="pb-3">
              {flags.length === 0 ? (
                <p className="text-sm text-parchment-500 italic px-1">
                  No active agreements or pacts.
                </p>
              ) : (
                <div className="space-y-2">
                  {flags.map((flag) => (
                    <div
                      key={flag.id}
                      className="parchment-card px-4 py-2.5"
                    >
                      <p className="text-sm text-parchment-800">
                        {flag.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Storylines Section */}
          <SectionHeader
            title="Unfolding Events"
            isOpen={expandedSections.has("storylines")}
            onToggle={() => toggleSection("storylines")}
          />
          {expandedSections.has("storylines") && (
            <div className="pb-3">
              {storylines.length === 0 ? (
                <p className="text-sm text-parchment-500 italic px-1">
                  No ongoing events.
                </p>
              ) : (
                <div className="space-y-2">
                  {storylines.map((s) => (
                    <div
                      key={s.id}
                      className="parchment-card px-4 py-2.5 space-y-1"
                    >
                      <p className="text-sm text-parchment-800">
                        {s.description}
                      </p>
                      <p className="text-xs font-sans text-parchment-500 capitalize">
                        {s.state}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Geography Section */}
          <SectionHeader
            title="The Land"
            isOpen={expandedSections.has("geography")}
            onToggle={() => toggleSection("geography")}
          />
          {expandedSections.has("geography") && (
            <div className="pb-3 space-y-3">
              <div className="parchment-card px-4 py-3">
                <p className="text-sm text-parchment-800">
                  {world.setting.geography}
                </p>
              </div>
              <div className="parchment-card px-4 py-3 space-y-1">
                <p className="text-xs font-sans font-semibold text-parchment-500 uppercase tracking-wide">
                  Your Clan
                </p>
                <p className="text-sm text-parchment-800">
                  {world.clan.backstory}
                </p>
              </div>
            </div>
          )}

          {/* Mythology Section */}
          <SectionHeader
            title="Gods & Spirits"
            isOpen={expandedSections.has("mythology")}
            onToggle={() => toggleSection("mythology")}
          />
          {expandedSections.has("mythology") && (
            <div className="pb-3 space-y-3">
              <div className="parchment-card px-4 py-3">
                <p className="text-sm text-parchment-800">
                  {world.mythology.pantheon_summary}
                </p>
              </div>
              {world.mythology.creation_myth && (
                <div className="parchment-card px-4 py-3 space-y-1">
                  <p className="text-xs font-sans font-semibold text-parchment-500 uppercase tracking-wide">
                    Creation Myth
                  </p>
                  <p className="text-sm text-parchment-800 italic">
                    {world.mythology.creation_myth}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {world.mythology.key_deities.map((deity) => (
                  <div
                    key={deity.name}
                    className="parchment-card px-4 py-2.5"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-sm text-parchment-900">
                        {deity.name}
                      </span>
                      <span className="text-xs font-sans text-parchment-500">
                        {deity.domain}
                      </span>
                    </div>
                    <p className="text-sm text-parchment-600 mt-0.5">
                      {deity.personality}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SectionHeader({
  title,
  isOpen,
  onToggle,
  count,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 px-1 text-left cursor-pointer
        hover:bg-parchment-100 rounded transition-colors"
    >
      <span className="text-sm font-sans font-bold text-parchment-700 uppercase tracking-wide">
        {title}
        {count !== undefined && (
          <span className="font-normal text-parchment-500 ml-2 normal-case tracking-normal">
            ({count})
          </span>
        )}
      </span>
      <span className="text-parchment-500">
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </span>
    </button>
  );
}
