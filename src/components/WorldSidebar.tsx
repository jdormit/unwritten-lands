import { useState } from "react";
import type {
  WorldGeneration,
  ClanRelationship,
  ActiveStoryline,
  GameFlag,
} from "../types/game";

interface WorldSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldGeneration;
  relationships: ClanRelationship[];
  flags: GameFlag[];
  storylines: ActiveStoryline[];
}

const RELATIONSHIP_LABELS: Record<number, { label: string; color: string }> = {
  [-3]: { label: "Bitter Enemies", color: "text-blood" },
  [-2]: { label: "Hostile", color: "text-blood" },
  [-1]: { label: "Wary", color: "text-ember" },
  [0]: { label: "Neutral", color: "text-parchment-600" },
  [1]: { label: "Cordial", color: "text-forest" },
  [2]: { label: "Friendly", color: "text-forest" },
  [3]: { label: "Sworn Allies", color: "text-forest" },
};

function getRelationshipDisplay(score: number) {
  const clamped = Math.max(-3, Math.min(3, score));
  return RELATIONSHIP_LABELS[clamped] ?? { label: "Unknown", color: "text-parchment-600" };
}

type SectionId = "neighbors" | "geography" | "mythology" | "storylines" | "agreements";

export function WorldSidebar({
  isOpen,
  onClose,
  world,
  relationships,
  flags,
  storylines,
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
          <h2 className="text-lg font-bold text-parchment-900">Clan Lore</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-parchment-500 hover:text-parchment-800
              transition-colors cursor-pointer text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
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
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 px-1 text-left cursor-pointer
        hover:bg-parchment-100 rounded transition-colors"
    >
      <span className="text-sm font-sans font-bold text-parchment-700 uppercase tracking-wide">
        {title}
      </span>
      <span className="text-parchment-500 text-xs">{isOpen ? "▼" : "▶"}</span>
    </button>
  );
}
