interface EventNarrativeProps {
  text: string;
}

export function EventNarrative({ text }: EventNarrativeProps) {
  // Split on double newlines for paragraph support
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="narrative-text">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
