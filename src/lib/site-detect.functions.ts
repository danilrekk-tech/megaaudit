import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SiteType } from "./audit-types";

export type DetectResult = {
  siteType: SiteType;
  reached: boolean;
  pages: number;
  shopSignals: string[];
  reason: string;
  checks?: SiteChecks;
};

/** Реальные признаки, найденные в разметке главной страницы. */
export type SiteChecks = {
  https: boolean;
  viewport: boolean;
  title: boolean;
  description: boolean;
  ogTags: boolean;
  forms: number;
  phone: boolean;
  messengers: boolean;
  reviews: boolean;
  legal: boolean;
  images: number;
  lazyImages: number;
  scripts: number;
  htmlKb: number;
  h1: number;
  schema: boolean;
};

function collectChecks(html: string, url: string): SiteChecks {
  const count = (re: RegExp) => (html.match(re) ?? []).length;
  return {
    https: url.startsWith("https://"),
    viewport: /<meta[^>]+name=["']viewport/i.test(html),
    title: /<title>[^<]{5,}<\/title>/i.test(html),
    description: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{30,}/i.test(html),
    ogTags: /property=["']og:(title|image)/i.test(html),
    forms: count(/<form\b/gi),
    phone: /href=["']tel:/i.test(html),
    messengers: /(wa\.me|whatsapp|t\.me\/|telegram|viber|vk\.me|max\.ru)/i.test(html),
    reviews: /(отзыв|review|рейтинг|кейс)/i.test(html),
    legal: /(ИНН|ОГРН|ООО|ИП\s)/.test(html),
    images: count(/<img\b/gi),
    lazyImages: count(/loading=["']lazy/gi),
    scripts: count(/<script\b/gi),
    htmlKb: Math.round(html.length / 1024),
    h1: count(/<h1\b/gi),
    schema: /application\/ld\+json|itemscope/i.test(html),
  };
}

const SHOP_MARKERS: { re: RegExp; label: string }[] = [
  { re: /(в\s*корзину|добавить\s*в\s*корзину|add\s*to\s*cart)/i, label: "кнопка «В корзину»" },
  { re: /(корзина|\/cart|\/basket|shopping-cart)/i, label: "корзина" },
  { re: /(каталог|\/catalog|\/shop|\/category)/i, label: "каталог" },
  { re: /(\/product|\/tovar|карточк\w*\s*товар|артикул)/i, label: "карточки товаров" },
  { re: /(\bкупить\b|оформить\s*заказ|checkout)/i, label: "покупка и оформление заказа" },
  { re: /(руб|₽|\bцена\b|itemprop=["']price)/i, label: "цены на товары" },
];

function countInternalPages(html: string, host: string): number {
  const paths = new Set<string>();
  const re = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1];
    if (!raw) continue;
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) continue;
    let path = raw;
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        if (!u.hostname.replace(/^www\./, "").endsWith(host)) continue;
        path = u.pathname;
      } catch {
        continue;
      }
    }
    path = path.split("?")[0] ?? path;
    path = path.replace(/\/+$/, "");
    if (!path || path === "/" || /\.(jpg|jpeg|png|svg|webp|pdf|css|js|ico)$/i.test(path)) continue;
    paths.add(path.toLowerCase());
  }
  return paths.size + 1;
}

export const detectSiteInputSchema = z.object({ url: z.string().min(1) });

/** Определяет формат сайта по его разметке: 1 страница — лендинг, корзина и каталог — магазин. */
export async function detectFormat(rawUrl: string): Promise<DetectResult> {
  {
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return { siteType: "landing", reached: false, pages: 1, shopSignals: [], reason: "Некорректный адрес" };
    }

    let html = "";
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (compatible; MegaAuditBot/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      html = (await res.text()).slice(0, 400_000);
    } catch {
      return {
        siteType: "services",
        reached: false,
        pages: 0,
        shopSignals: [],
        reason: "Сайт не ответил, формат определён по адресу",
      };
    }

    const shopSignals = SHOP_MARKERS.filter((m) => m.re.test(html)).map((m) => m.label);
    const pages = countInternalPages(html, host);
    const checks = collectChecks(html, url);

    if (shopSignals.length >= 3) {
      return {
        siteType: "ecommerce",
        reached: true,
        pages,
        shopSignals,
        checks,
        reason: `Найдены признаки магазина: ${shopSignals.slice(0, 3).join(", ")}`,
      };
    }
    if (pages <= 2) {
      return {
        siteType: "landing",
        reached: true,
        pages,
        shopSignals,
        checks,
        reason: "Весь контент на одной странице — это лендинг",
      };
    }
    return {
      siteType: "services",
      reached: true,
      pages,
      shopSignals,
      checks,
      reason: `Многостраничный сайт без корзины (${pages} разделов) — сайт услуг`,
    };
  }
}

export const detectSiteFormat = createServerFn({ method: "GET" })
  .inputValidator((data) => detectSiteInputSchema.parse(data))
  .handler(({ data }): Promise<DetectResult> => detectFormat(data.url));
