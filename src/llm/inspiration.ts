import { pickRandom } from "./theme-seeds";

export interface InspirationQuote {
  id: string;
  text: string;
  title: string;
  author: string;
  translator: string | null;
}

let corpus: Promise<readonly InspirationQuote[]> | undefined;

/** Load the corpus once, then select a uniformly random passage. */
export async function pickInspiration(): Promise<InspirationQuote> {
  corpus ??= import("./inspiration-quotes.json")
    .then((module) => module.default)
    .catch((error) => {
      corpus = undefined;
      throw error;
    });
  const quotes = await corpus;
  if (quotes.length === 0) throw new Error("The inspiration corpus is empty");
  return pickRandom(quotes);
}

/** Append a randomly chosen inspiration passage to a user prompt. */
export async function withInspiration(prompt: string): Promise<string> {
  const quote = await pickInspiration();
  return `${prompt}

INSPIRATION:
This passage of older literature was chosen at random. Let it steer your ideas, imagery and mood somewhere you would not otherwise go. Do not quote it, imitate its old-fashioned wording, or borrow its names, places or culture. It never overrides the rules or the established world.

Source: ${quote.title} — ${quote.author}${quote.translator ? `; translated by ${quote.translator}` : ""} (${quote.id})

"""
${quote.text}
"""`;
}
