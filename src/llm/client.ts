import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const MODEL_ID = "google/gemini-3-flash-preview";

/**
 * OpenAI-compatible provider pointing at our Cloudflare Worker proxy.
 * The worker injects the AI Gateway API key, so no key is needed client-side.
 * Must use a full URL because the SDK constructs URLs via `new URL()`.
 */
const gateway = createOpenAICompatible({
  name: "ai-gateway",
  baseURL: `${window.location.origin}/api/ai`,
  supportsStructuredOutputs: true,
});

/**
 * Create a language model instance routed through our AI Gateway proxy.
 */
export function createModel() {
  return gateway.chatModel(MODEL_ID);
}
