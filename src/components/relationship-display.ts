const RELATIONSHIP_LABELS: Record<number, { label: string; color: string }> = {
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
