import { useState, useEffect } from "react";

const FLAVOR_TEXTS = [
  "The spirits deliberate...",
  "The wind carries whispers...",
  "The elders consult the bones...",
  "A raven circles overhead...",
  "The fire crackles and shifts...",
  "Shadows move in the smoke...",
  "The ancestors stir...",
  "The stars rearrange themselves...",
  "A distant drum beats steadily...",
  "The river murmurs old names...",
];

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  const [flavorIndex, setFlavorIndex] = useState(
    () => Math.floor(Math.random() * FLAVOR_TEXTS.length),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setFlavorIndex((prev) => (prev + 1) % FLAVOR_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="w-64 h-2 rounded-full overflow-hidden loading-shimmer" />
      <p className="text-parchment-700 text-lg italic">
        {message ?? FLAVOR_TEXTS[flavorIndex]}
      </p>
    </div>
  );
}
