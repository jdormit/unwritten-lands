import type { DirectorOption, ResourceKey } from "../types/game";

interface ChoiceButtonsProps {
  optionTexts: [string, string, string];
  options: [DirectorOption, DirectorOption, DirectorOption];
  onChoose: (index: number) => void;
  disabled?: boolean;
}

const TONE_STYLES: Record<string, string> = {
  cautious: "hover:border-sky hover:bg-sky/5",
  bold: "hover:border-ember hover:bg-ember/5",
  diplomatic: "hover:border-forest hover:bg-forest/5",
  ruthless: "hover:border-blood hover:bg-blood/5",
  pious: "hover:border-resource-magic hover:bg-resource-magic/5",
  pragmatic: "hover:border-gold hover:bg-gold/5",
};

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  people: "people",
  wealth: "wealth",
  magic: "magic",
  reputation: "reputation",
};

function formatResourceEffects(effects: Partial<Record<ResourceKey, number | null>>): string {
  const parts: string[] = [];
  for (const key of ["people", "wealth", "magic", "reputation"] as ResourceKey[]) {
    const val = effects[key];
    if (val == null || val === 0) continue;
    const label = RESOURCE_LABELS[key];
    if (val >= 2) parts.push(`++${label}`);
    else if (val === 1) parts.push(`+${label}`);
    else if (val === -1) parts.push(`-${label}`);
    else if (val <= -2) parts.push(`--${label}`);
  }
  return parts.join(", ");
}

export function ChoiceButtons({
  optionTexts,
  options,
  onChoose,
  disabled = false,
}: ChoiceButtonsProps) {
  return (
    <div className="space-y-3">
      {optionTexts.map((text, index) => {
        const option = options[index];
        const toneStyle = TONE_STYLES[option.tone] ?? "hover:border-parchment-500";
        const effectsStr = formatResourceEffects(option.resource_effects);

        return (
          <button
            key={index}
            onClick={() => onChoose(index)}
            disabled={disabled}
            className={`w-full text-left px-5 py-4 parchment-card border-2 border-parchment-300
              transition-all duration-200 cursor-pointer
              ${toneStyle}
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.99]`}
          >
            <p className="text-parchment-900 text-base leading-snug">
              {text}
            </p>
            {effectsStr && (
              <p className="mt-1.5 text-xs font-sans font-semibold text-parchment-500 tracking-wide">
                {effectsStr}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
