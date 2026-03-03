import { useState, useEffect, useRef } from "react";
import type { ResourceKey } from "../types/game";

const RESOURCE_CONFIG: Record<ResourceKey, { label: string; color: string; icon: string }> = {
  people: { label: "People", color: "bg-resource-people", icon: "👤" },
  wealth: { label: "Wealth", color: "bg-resource-wealth", icon: "◆" },
  magic: { label: "Magic", color: "bg-resource-magic", icon: "✦" },
  reputation: { label: "Reputation", color: "bg-resource-reputation", icon: "⚐" },
};

interface ResourceBarProps {
  resource: ResourceKey;
  value: number;
  previousValue?: number;
}

export function ResourceBar({ resource, value, previousValue }: ResourceBarProps) {
  const config = RESOURCE_CONFIG[resource];
  const [showChange, setShowChange] = useState(false);
  const changeAmount = previousValue !== undefined ? value - previousValue : 0;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (changeAmount !== 0) {
      setShowChange(true);
      timeoutRef.current = setTimeout(() => setShowChange(false), 1500);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [changeAmount, value]);

  const percentage = (value / 10) * 100;
  const isLow = value <= 2;

  return (
    <div className="flex items-center gap-2 relative">
      <span className="w-6 text-center text-sm">{config.icon}</span>
      <span className={`w-24 text-sm font-sans ${isLow ? "text-blood font-bold" : "text-parchment-800"}`}>
        {config.label}
      </span>
      <div className="flex-1 h-3 bg-parchment-200 rounded-full overflow-hidden border border-parchment-300">
        <div
          className={`h-full resource-bar-fill rounded-full ${config.color} ${isLow ? "animate-pulse" : ""}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Change indicator */}
      {showChange && changeAmount !== 0 && (
        <span
          className={`absolute right-0 resource-change font-sans text-sm font-bold ${
            changeAmount > 0 ? "text-forest" : "text-blood"
          }`}
        >
          {changeAmount > 0 ? `+${changeAmount}` : changeAmount}
        </span>
      )}
    </div>
  );
}

interface ResourceBarGroupProps {
  resources: Record<ResourceKey, number>;
  previousResources?: Record<ResourceKey, number>;
}

export function ResourceBarGroup({ resources, previousResources }: ResourceBarGroupProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {(["people", "wealth", "magic", "reputation"] as ResourceKey[]).map((key) => (
        <ResourceBar
          key={key}
          resource={key}
          value={resources[key]}
          previousValue={previousResources?.[key]}
        />
      ))}
    </div>
  );
}
