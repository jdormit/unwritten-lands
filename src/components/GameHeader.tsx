import type { Resources, Season, ResourceKey } from "../types/game";
import { ResourceBarGroup } from "./ResourceBar";

interface GameHeaderProps {
  clanName: string;
  year: number;
  season: Season;
  resources: Resources;
  previousResources?: Resources;
  onOpenLore?: () => void;
}

const SEASON_DISPLAY: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

export function GameHeader({
  clanName,
  year,
  season,
  resources,
  previousResources,
  onOpenLore,
}: GameHeaderProps) {
  return (
    <div className="parchment-card px-6 py-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-parchment-900">
          {clanName}
        </h1>
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-sans text-parchment-600">
            Year {year}, {SEASON_DISPLAY[season]}
          </span>
          {onOpenLore && (
            <button
              onClick={onOpenLore}
              className="text-sm font-sans text-parchment-500 hover:text-parchment-800
                transition-colors cursor-pointer"
              title="Clan Lore"
              aria-label="Open clan lore"
            >
              &#x1F4DC;
            </button>
          )}
        </div>
      </div>
      <ResourceBarGroup
        resources={resources as Record<ResourceKey, number>}
        previousResources={previousResources as Record<ResourceKey, number> | undefined}
      />
    </div>
  );
}
