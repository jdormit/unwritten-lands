import { useState, useCallback, useEffect } from "react";
import { getAuth, getCachedAuth } from "../llm/auth";
import type { Auth } from "ai-sdk-codex-oauth";

interface AuthFlowProps {
  onAuthenticated: (auth: Auth) => void;
}

export function AuthFlow({ onAuthenticated }: AuthFlowProps) {
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Checking authentication...");
  const [error, setError] = useState<string | null>(null);

  const startAuth = useCallback(async () => {
    // Check for cached auth first
    const cached = getCachedAuth();
    if (cached) {
      onAuthenticated(cached);
      return;
    }

    try {
      const auth = await getAuth({
        onUserCode: ({ userCode, verifyUrl }) => {
          setUserCode(userCode);
          setVerifyUrl(verifyUrl);
          setStatus("Waiting for authentication...");
        },
        onStatus: (s) => setStatus(s),
        onAuthenticated: () => {
          setStatus("Authenticated!");
        },
      });
      onAuthenticated(auth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    }
  }, [onAuthenticated]);

  useEffect(() => {
    startAuth();
  }, [startAuth]);

  if (error) {
    return (
      <div className="text-center space-y-4">
        <p className="text-blood text-lg">The spirits refuse your entry.</p>
        <p className="text-parchment-700 text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            startAuth();
          }}
          className="px-6 py-2 parchment-card hover:bg-parchment-100 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (userCode && verifyUrl) {
    return (
      <div className="text-center space-y-6">
        <p className="text-parchment-800 text-lg">
          To begin your journey, you must prove your identity.
        </p>
        <div className="parchment-card px-8 py-6 inline-block">
          <p className="text-sm text-parchment-600 mb-2">
            Go to this address:
          </p>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-dark hover:text-sky underline font-sans text-sm block mb-4"
          >
            {verifyUrl}
          </a>
          <p className="text-sm text-parchment-600 mb-2">
            And enter this code:
          </p>
          <p className="text-3xl font-bold font-sans tracking-widest text-parchment-900">
            {userCode}
          </p>
        </div>
        <p className="text-parchment-500 text-sm italic">{status}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-parchment-700 text-lg italic">{status}</p>
    </div>
  );
}
