import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const addonPricesInputSchema = z.object({
  addons: z
    .array(
      z.object({
        id: z.string().min(1),
        pageUrl: z.string().url(),
      }),
    )
    .max(12),
});

export type AddonPriceResult = {
  id: string;
  price: number | null;
};

function safeAddonUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "megagroup.shop") return null;
    if (!/^\/addon\/\d+\/?$/.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

function parsePrice(html: string): number | null {
  const patterns = [
    /data-client-price=["']\s*([\d\s\u00a0]+)\s*₽/i,
    /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["'][^"']*?за\s+([\d\s\u00a0]+)\s*₽/i,
    /<meta[^>]+content=["'][^"']*?за\s+([\d\s\u00a0]+)\s*₽[^"']*["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const digits = match?.[1]?.replace(/[\s\u00a0]/g, "");
    if (!digits) continue;
    const price = Number(digits);
    if (Number.isSafeInteger(price) && price > 0 && price < 10_000_000) return price;
  }
  return null;
}

async function fetchPrice(id: string, pageUrl: string): Promise<AddonPriceResult> {
  const url = safeAddonUrl(pageUrl);
  if (!url) return { id, price: null };

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; MegaAuditBot/1.0)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { id, price: null };
    return { id, price: parsePrice((await response.text()).slice(0, 500_000)) };
  } catch {
    return { id, price: null };
  }
}

export async function fetchAddonPrices(
  addons: { id: string; pageUrl: string }[],
): Promise<AddonPriceResult[]> {
  return Promise.all(addons.map((addon) => fetchPrice(addon.id, addon.pageUrl)));
}

export const getAddonPrices = createServerFn({ method: "POST" })
  .inputValidator((data) => addonPricesInputSchema.parse(data))
  .handler(({ data }): Promise<AddonPriceResult[]> => fetchAddonPrices(data.addons));