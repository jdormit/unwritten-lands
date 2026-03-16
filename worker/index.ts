// ============================================================
// Cloudflare Worker — AI Gateway Proxy
// ============================================================
// Proxies requests from /api/ai/* to the Vercel AI Gateway,
// injecting the API key from a secret binding. Enforces strict
// origin checks and CORS to prevent unauthorized usage.
// ============================================================

interface Env {
  AI_GATEWAY_API_KEY: string;
}

/** Allowed origins for CORS and request validation. */
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://unwritten.land",
];

/** The upstream AI Gateway base URL. */
const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

/** Path prefix that triggers the proxy. */
const API_PREFIX = "/api/ai/";

// ============================================================
// Origin validation
// ============================================================

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

// ============================================================
// CORS headers
// ============================================================

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// ============================================================
// Request handler
// ============================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only handle /api/ai/* requests
    if (!url.pathname.startsWith(API_PREFIX)) {
      return new Response(null, { status: 404 });
    }

    // --- Origin & Referer validation ---
    const origin = request.headers.get("Origin");
    const referer = request.headers.get("Referer");

    // For non-preflight requests, require a valid Origin header.
    // Also validate Referer as a secondary check when present.
    if (request.method !== "OPTIONS") {
      if (!isAllowedOrigin(origin)) {
        return new Response("Forbidden", { status: 403 });
      }

      if (referer) {
        const refererOrigin = new URL(referer).origin;
        if (!ALLOWED_ORIGINS.includes(refererOrigin)) {
          return new Response("Forbidden", { status: 403 });
        }
      }

      // Reject requests that aren't from a browser fetch/XHR context.
      // Sec-Fetch-Site will be "same-origin" or "same-site" for legit requests.
      const secFetchSite = request.headers.get("Sec-Fetch-Site");
      if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site") {
        return new Response("Forbidden", { status: 403 });
      }
    }

    // --- CORS preflight ---
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // --- Only allow POST (chat completions, etc.) ---
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // --- Proxy to AI Gateway ---
    const upstreamPath = url.pathname.slice(API_PREFIX.length);
    const upstreamUrl = `${GATEWAY_BASE_URL}/${upstreamPath}`;

    const proxyHeaders = new Headers(request.headers);
    // Inject the API key
    proxyHeaders.set("Authorization", `Bearer ${env.AI_GATEWAY_API_KEY}`);
    // Remove browser-specific headers that shouldn't go upstream
    proxyHeaders.delete("Origin");
    proxyHeaders.delete("Referer");
    proxyHeaders.delete("Cookie");
    proxyHeaders.delete("Host");

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: proxyHeaders,
      body: request.body,
    });

    // Build response with CORS headers
    // origin is guaranteed non-null here — we returned 403 above if it wasn't allowed
    const responseHeaders = new Headers(upstreamResponse.headers);
    const cors = corsHeaders(origin!);
    for (const [key, value] of Object.entries(cors)) {
      responseHeaders.set(key, value);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler<Env>;
