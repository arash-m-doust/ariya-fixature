const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";
const LOCALHOST_API_BASE_URL = "http://localhost:8787";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

function isLocalApiBaseUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function buildApiUrlWithBase(baseUrl, path) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function buildApiUrl(path) {
  return buildApiUrlWithBase(API_BASE_URL, path);
}

function buildCandidateBaseUrls() {
  const candidates = [API_BASE_URL];

  if (isLocalApiBaseUrl(API_BASE_URL) || !import.meta.env.VITE_API_BASE_URL) {
    candidates.push(DEFAULT_API_BASE_URL);
    candidates.push(LOCALHOST_API_BASE_URL);
  }

  return [...new Set(candidates)];
}

export async function postJson(path, payload) {
  const candidateBaseUrls = buildCandidateBaseUrls();
  let lastNetworkError = null;

  for (const baseUrl of candidateBaseUrls) {
    try {
      const response = await fetch(buildApiUrlWithBase(baseUrl, path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let body = null;

      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          body?.error ||
          body?.details ||
          `Request failed with status ${response.status}`;

        throw new Error(message);
      }

      return body;
    } catch (error) {
      if (error instanceof TypeError) {
        lastNetworkError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error(
      "Cannot reach backend API. Start backend on http://127.0.0.1:8787 (or set VITE_API_BASE_URL).",
    );
  }

  throw new Error("Request failed.");
}
