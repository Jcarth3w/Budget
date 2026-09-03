function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

// Empty string = same origin (Docker/nginx proxy). Set EXPO_PUBLIC_BUDGET_API_URL for Netlify or LAN API.
const raw = process.env.EXPO_PUBLIC_BUDGET_API_URL?.trim() ?? "";
const SERVER_URL = raw ? normalizeBaseUrl(raw) : "";

export default SERVER_URL;
