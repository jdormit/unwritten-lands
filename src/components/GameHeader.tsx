import { BookOpen } from "lucide-react";
import type { Resources, Season, ResourceKey } from "../types/game";
import { ResourceBarGroup } from "./ResourceBar";

type DisplaySeason = Season | "sacred_time";

interface GameHeaderProps {
  clanName: string;
  year: number;
  season: DisplaySeason;
  resources: Resources;
  previousResources?: Resources;
  onOpenLore?: () => void;
}

const SEASON_DISPLAY: Record<DisplaySeason, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
  sacred_time: "Sacred Time",
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
              className="text-sm font-sans text-parchment-700 hover:text-parchment-900
                bg-parchment-100 hover:bg-parchment-200 border border-parchment-300
                rounded px-2 py-1 transition-colors cursor-pointer"
              title="Chronicle & Lore"
              aria-label="Open chronicle and lore"
            >
              <BookOpen size={14} className="inline -mt-0.5" /> Lore
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
