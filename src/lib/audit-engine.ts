import {
  ZONES,
  type Addon,
  type Audit,
  type SiteType,
  type ZoneKey,
  type ZoneResult,
} from "./audit-types";

export function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function hostOf(input: string): string {
  const url = normalizeUrl(input);
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHOP_HINTS = ["shop", "store", "market", "магазин", "tovar", "goods", "buy", "cart"];
const LANDING_HINTS = ["land", "promo", "lp", "start", "go", "offer", "kurs", "webinar"];

export function detectSiteType(url: string, hint?: SiteType): SiteType {
  if (hint) return hint;
  const h = hostOf(url).toLowerCase() + normalizeUrl(url).toLowerCase();
  if (SHOP_HINTS.some((k) => h.includes(k))) return "ecommerce";
  if (LANDING_HINTS.some((k) => h.includes(k))) return "landing";
  const r = rng(hash(h))();
  return r > 0.62 ? "ecommerce" : r > 0.3 ? "services" : "landing";
}

const FINDINGS: Record<ZoneKey, Record<SiteType | "any", string[]>> = {
  order: {
    ecommerce: [
      "Оформление заказа занимает больше 4 шагов — часть покупателей уходит на середине",
      "Нет быстрой покупки в один клик прямо из карточки товара",
      "В корзине не видно итоговой суммы доставки до последнего шага",
      "Нельзя поделиться корзиной или избранным — теряются совместные покупки",
    ],
    services: [
      "Форма заявки одна на весь сайт и не привязана к конкретной услуге",
      "Нет расчёта стоимости — клиент вынужден звонить, чтобы узнать цену",
      "Кнопка заявки не закреплена при прокрутке длинных страниц",
    ],
    landing: [
      "Форма заявки находится только внизу страницы",
      "Слишком много обязательных полей в форме — заполняют не все",
      "Нет альтернативы форме: мессенджеры и обратный звонок отсутствуют",
    ],
    any: ["Ошибки в форме показываются только после отправки"],
  },
  mobile: {
    ecommerce: [
      "На телефоне карточки товара обрезаются, кнопка «В корзину» уходит за экран",
      "Фильтры каталога неудобно открывать на мобильном",
    ],
    services: [
      "Меню на телефоне перекрывает первый экран",
      "Таблицы и прайсы не помещаются в ширину экрана",
    ],
    landing: [
      "Первый экран на телефоне занят большой картинкой, оффер не виден",
      "Кнопки меньше комфортного размера нажатия",
    ],
    any: ["Часть текста мельче 14px и плохо читается на телефоне"],
  },
  trust: {
    ecommerce: [
      "Нет отзывов и оценок в карточках товара",
      "Условия оплаты и возврата спрятаны глубоко в разделах",
    ],
    services: [
      "Нет кейсов и подтверждения опыта на видном месте",
      "Контакты только на отдельной странице, нет быстрой связи",
    ],
    landing: [
      "Нет социальных доказательств: отзывов, логотипов клиентов, цифр",
      "Не указано юридическое лицо и реквизиты",
    ],
    any: ["Не хватает мессенджеров для быстрой связи"],
  },
  speed: {
    ecommerce: [
      "Изображения товаров тяжёлые, каталог грузится медленно",
      "Нет удержания уходящего посетителя и напоминаний о брошенной корзине",
    ],
    services: [
      "Первый экран отрисовывается медленно на мобильной сети",
      "Нет интерактивных блоков — посетитель уходит с первой страницы",
    ],
    landing: [
      "Тяжёлые анимации замедляют первый экран",
      "Нет вовлекающих элементов: квиза, калькулятора, подбора",
    ],
    any: ["Скрипты сторонних сервисов заметно тормозят страницу"],
  },
  seo: {
    ecommerce: [
      "У части товарных страниц дублируются заголовки и описания",
      "Не заполнены продающие блоки: акции, хиты, сопутствующие товары",
    ],
    services: [
      "Заголовки страниц не отражают запросы клиентов",
      "Нет посадочных страниц под отдельные услуги",
    ],
    landing: [
      "Один заголовок на всю страницу, нет структуры под запросы",
      "Нет микроразметки и корректного превью при отправке ссылки",
    ],
    any: ["Не хватает уникальных описаний для соцсетей и мессенджеров"],
  },
};

const STRENGTHS: Record<ZoneKey, string[]> = {
  order: ["Основной путь до заявки работает без ошибок", "Корзина сохраняется между визитами"],
  mobile: ["Сайт корректно масштабируется на планшете", "Навигация понятна на любом экране"],
  trust: ["Контакты и график работы указаны", "Есть страница о компании"],
  speed: ["Сервер отвечает быстро", "Основные страницы кешируются"],
  seo: ["Базовые метатеги заполнены", "Структура разделов логична"],
};

const ZONE_CATEGORIES: Record<ZoneKey, string[]> = {
  order: ["Интернет-магазин", "Активные продажи"],
  mobile: ["Комфорт пользователя", "Разработка мобильного приложения"],
  trust: ["Оформление сайта", "Логотипы"],
  speed: ["Комфорт пользователя", "Новинки"],
  seo: ["Активные продажи", "Калькуляторы"],
};

const ZONE_KEYWORDS: Record<ZoneKey, string[]> = {
  order: ["заказ", "корзин", "куп", "оплат", "форм", "заявк"],
  mobile: ["мобиль", "адаптив", "телефон", "приложен"],
  trust: ["отзыв", "контакт", "довер", "виджет", "лого", "сертификат"],
  speed: ["скорост", "ускор", "поп-ап", "всплыв", "анимац", "квиз", "вовлеч"],
  seo: ["seo", "поиск", "калькулятор", "акци", "подбор", "сравн", "хит"],
};

export function addonZones(addon: Addon): ZoneKey[] {
  if (addon.zones?.length) return addon.zones;
  const text = `${addon.name} ${addon.description}`.toLowerCase();
  const byKeyword = (Object.keys(ZONE_KEYWORDS) as ZoneKey[]).filter((z) =>
    ZONE_KEYWORDS[z].some((k) => text.includes(k)),
  );
  const byCategory = (Object.keys(ZONE_CATEGORIES) as ZoneKey[]).filter((z) =>
    ZONE_CATEGORIES[z].includes(addon.category),
  );
  const all = Array.from(new Set([...byKeyword, ...byCategory]));
  return all.length ? all : ["seo"];
}

function pick<T>(list: T[], count: number, rand: () => number): T[] {
  const copy = [...list];
  const out: T[] = [];
  while (copy.length && out.length < count) {
    const [item] = copy.splice(Math.floor(rand() * copy.length), 1);
    if (item !== undefined) out.push(item);
  }
  return out;
}

const ECOM_ONLY = [
  "корзин",
  "товар",
  "артикул",
  "магазин",
  "склад",
  "прайс-лист",
  "каталог",
  "оформление заказа",
  "доставк",
  "оплат",
  "чек",
  "маркетплейс",
  "остатк",
  "1с",
];
const MULTIPAGE_ONLY = ["раздел", "меню сайта", "навигац", "личный кабинет", "блог", "фильтр", "поиск по сайту"];

/** Для каких форматов сайта доработка вообще применима. */
export function addonSiteTypes(addon: Addon): SiteType[] {
  const text = `${addon.name} ${addon.description}`.toLowerCase();
  if (addon.category === "Интернет-магазин") return ["ecommerce"];
  if (ECOM_ONLY.some((k) => text.includes(k))) return ["ecommerce"];
  if (MULTIPAGE_ONLY.some((k) => text.includes(k))) return ["ecommerce", "services"];
  return ["ecommerce", "services", "landing"];
}

/** Слабые зоны без акцента на продающих блоках — сначала то, где сайт реально теряет клиентов. */
export function weakZones(zones: ZoneResult[]): ZoneResult[] {
  return [...zones].sort((a, b) => {
    const w = (z: ZoneResult) => z.score + (z.key === "seo" ? 10 : 0);
    return w(a) - w(b);
  });
}

export function recommendAddons(
  zones: ZoneResult[],
  siteType: SiteType,
  catalog: Addon[],
  limit = 8,
): string[] {
  const active = catalog.filter((a) => !a.archived && addonSiteTypes(a).includes(siteType));
  const weak = [...zones].sort((a, b) => a.score - b.score);
  const out: string[] = [];
  const perZone = (zone: ZoneResult, n: number) => {
    const matches = active
      .filter((a) => addonZones(a).includes(zone.key) && !out.includes(a.id))
      .sort((a, b) => {
        const bonus = (x: Addon) =>
          (siteType === "ecommerce" && x.category === "Интернет-магазин" ? -2 : 0) +
          (siteType !== "ecommerce" && x.category === "Интернет-магазин" ? 2 : 0);
        return bonus(a) - bonus(b) || a.name.localeCompare(b.name);
      });
    matches.slice(0, n).forEach((a) => out.push(a.id));
  };
  weak.forEach((z, i) => perZone(z, i < 2 ? 3 : 1));
  return out.slice(0, limit);
}

export function runAudit(
  input: string,
  catalog: Addon[],
  options: { siteTypeHint?: SiteType | undefined; attempt?: number | undefined } = {},
): Audit {
  const url = normalizeUrl(input);
  const host = hostOf(url);
  const attempt = options.attempt ?? 1;
  const siteType = detectSiteType(url, options.siteTypeHint);
  const rand = rng(hash(`${host}|${siteType}|${attempt}`));
  const improvement = (attempt - 1) * 7;

  const zones: ZoneResult[] = ZONES.map((z) => {
    const base = 38 + Math.floor(rand() * 48) + improvement;
    const score = Math.max(24, Math.min(96, base));
    const pool = [...FINDINGS[z.key][siteType], ...FINDINGS[z.key].any];
    const findingCount = score >= 80 ? 1 : score >= 60 ? 2 : 3;
    return {
      key: z.key,
      score,
      findings: pick(pool, findingCount, rand),
      strengths: pick(STRENGTHS[z.key], score >= 70 ? 2 : 1, rand),
    };
  });

  const overall = Math.round(zones.reduce((s, z) => s + z.score, 0) / zones.length);
  const orderScore = zones.find((z) => z.key === "order")!.score;
  const mobileScore = zones.find((z) => z.key === "mobile")!.score;
  const conversionScore = Math.round(overall * 0.5 + orderScore * 0.3 + mobileScore * 0.2);

  const gap = 100 - overall;
  const impact = {
    lostLeadsPerMonth: Math.round((gap * (siteType === "ecommerce" ? 3.4 : 1.9)) / 1) + 6,
    abandonedCartsPct: Math.min(84, Math.round(100 - orderScore * 0.75)),
    mobileChurnPct: Math.min(78, Math.round(100 - mobileScore * 0.8)),
    revenueLossPct: Math.min(45, Math.round(gap * 0.42)),
  };

  return {
    id: `${host.replace(/[^a-z0-9]/gi, "-")}-${attempt}-${hash(host + attempt).toString(36)}`,
    url,
    host,
    siteType,
    createdAt: new Date().toISOString(),
    attempt,
    overall,
    conversionScore,
    zones,
    impact,
    addonIds: recommendAddons(zones, siteType, catalog),
    staff: {
      notes: "",
      managerComment: "",
      upsell: Math.max(12, Math.min(95, 108 - overall + Math.floor(rand() * 12))),
    },
  };
}

export function scoreTone(score: number): "good" | "warn" | "bad" {
  return score >= 75 ? "good" : score >= 55 ? "warn" : "bad";
}
