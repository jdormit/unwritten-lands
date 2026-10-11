import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";

const DIRECTOR_MODEL_ID = "meta/muse-glimmer-30b";
const STORYTELLING_MODEL_ID = "meta/muse-glimmer-30b";

/**
 * OpenAI-compatible provider pointing at our Cloudflare Worker proxy.
 * The worker injects the OpenRouter API key, so no key is needed client-side.
 * Must use a full URL because the SDK constructs URLs via `new URL()`.
 */
const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: `${window.location.origin}/api/ai`,
  supportsStructuredOutputs: true,
});

/**
 * Create a language model instance routed through our OpenRouter proxy.
 */
export function createModel(role: "director" | "storytelling") {
  const isStorytelling = role === "storytelling";

  return wrapLanguageModel({
    model: openrouter.chatModel(isStorytelling ? STORYTELLING_MODEL_ID : DIRECTOR_MODEL_ID),
    middleware: defaultSettingsMiddleware({
      settings: isStorytelling
        ? { providerOptions: { openrouter: { reasoning: { effort: "low" } } } }
        : {},
    }),
  });
}
