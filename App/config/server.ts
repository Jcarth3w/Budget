/**
 * Base URL for the Budget backend (no trailing slash; hooks append paths like `/budget`).
 *
 * Netlify / any HTTPS host: set `EXPO_PUBLIC_BUDGET_API_URL` at build time to your API’s
 * HTTPS origin (e.g. `https://budget-api.yourdomain.com`). Browsers will not load `http://`
 * from an HTTPS page, and LAN IPs are not reachable from the public internet.
 *
 * Local: defaults to `http://localhost:3001`. For Expo on a physical device, add
 * `App/.env.local` with `EXPO_PUBLIC_BUDGET_API_URL=http://<your-LAN-IP>:3001`.
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

const fromEnv = process.env.EXPO_PUBLIC_BUDGET_API_URL?.trim();
const SERVER_URL = normalizeBaseUrl(
  fromEnv && fromEnv.length > 0 ? fromEnv : "http://localhost:3001"
);

export default SERVER_URL;
