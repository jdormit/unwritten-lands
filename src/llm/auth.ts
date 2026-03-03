import {
  authenticate,
  LocalStorageTokenStorage,
  type Auth,
} from "ai-sdk-codex-oauth";

let authInstance: Auth | null = null;
let authPromise: Promise<Auth> | null = null;

export interface AuthCallbacks {
  onUserCode: (params: { userCode: string; verifyUrl: string }) => void;
  onStatus?: (status: string) => void;
  onAuthenticated?: () => void;
}

/**
 * Get or create an authenticated session.
 * Uses LocalStorageTokenStorage to persist tokens across page reloads.
 * If valid tokens exist, returns immediately without user interaction.
 */
export async function getAuth(callbacks: AuthCallbacks): Promise<Auth> {
  // Return cached instance if available
  if (authInstance) return authInstance;

  // Deduplicate concurrent calls
  if (authPromise) return authPromise;

  authPromise = authenticate({
    storage: new LocalStorageTokenStorage(),
    onUserCode: callbacks.onUserCode,
    onStatus: callbacks.onStatus,
    openBrowser: false,
  }).then((auth) => {
    authInstance = auth;
    callbacks.onAuthenticated?.();
    return auth;
  });

  try {
    return await authPromise;
  } finally {
    authPromise = null;
  }
}

/**
 * Check if we already have cached auth (no network call).
 */
export function getCachedAuth(): Auth | null {
  return authInstance;
}

/**
 * Clear the cached auth (for logout/reset).
 */
export function clearAuth(): void {
  authInstance = null;
}
