import type { AddonPriceResult } from "./addon-prices.functions";
import type { DetectResult } from "./site-detect.functions";

/**
 * Адрес бэкенда. Пусто — фронтенд и бэкенд на одном домене (Lovable).
 * Задан (например https://megaaudit.lovable.app) — статичная сборка на внешнем
 * хостинге обращается к тому же самому бэкенду через публичные эндпоинты.
 */
export const API_BASE = (import.meta.env["VITE_API_BASE_URL"] ?? "").replace(/\/+$/, "");

export const usesRemoteApi = API_BASE.length > 0;

export async function detectSiteFormatViaApi(url: string): Promise<DetectResult> {
  const response = await fetch(`${API_BASE}/api/public/detect-site?url=${encodeURIComponent(url)}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`detect-site failed: ${response.status}`);
  return (await response.json()) as DetectResult;
}

export async function getAddonPricesViaApi(
  addons: { id: string; pageUrl: string }[],
): Promise<AddonPriceResult[]> {
  const response = await fetch(`${API_BASE}/api/public/addon-prices`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ addons }),
  });
  if (!response.ok) throw new Error(`addon-prices failed: ${response.status}`);
  return (await response.json()) as AddonPriceResult[];
}
