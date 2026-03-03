import type { AdvisorOpinion, Advisor } from "../types/game";

interface AdvisorPanelProps {
  opinions: AdvisorOpinion[];
  advisors: Advisor[];
}

const ARCHETYPE_STYLE: Record<string, string> = {
  warrior: "border-l-ember",
  mystic: "border-l-resource-magic",
  diplomat: "border-l-sky",
};

export function AdvisorPanel({ opinions, advisors }: AdvisorPanelProps) {
  return (
    <div className="space-y-3">
      {opinions.map((opinion) => {
        const advisor = advisors.find((a) => a.name === opinion.advisor_name);
        const borderColor = advisor
          ? ARCHETYPE_STYLE[advisor.archetype] ?? "border-l-parchment-400"
          : "border-l-parchment-400";

        return (
          <div
            key={opinion.advisor_name}
            className={`parchment-card border-l-4 ${borderColor} px-4 py-3`}
          >
            <span className="font-bold text-parchment-900 text-sm font-sans">
              {opinion.advisor_name}
              {advisor && (
                <span className="text-parchment-500 font-normal ml-1">
                  ({advisor.archetype})
                </span>
              )}
            </span>
            <p className="advisor-speech mt-1">
              &ldquo;{opinion.opinion}&rdquo;
            </p>
          </div>
        );
      })}
    </div>
  );
}
