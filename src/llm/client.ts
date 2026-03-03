import { createCodexOAuth } from "ai-sdk-codex-oauth";
import type { Auth } from "ai-sdk-codex-oauth";

const MODEL_ID = "gpt-5.3-codex";

/**
 * Create a language model instance from an Auth object.
 */
export function createModel(auth: Auth) {
  const codex = createCodexOAuth({
    auth,
    originator: "unwritten-lands",
  });
  return codex(MODEL_ID);
}
