function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}
const SERVER_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_BUDGET_API_URL?.trim());
export default SERVER_URL;
