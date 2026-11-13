import {
  ZONES,
  type Addon,
  type Audit,
  type SiteType,
  type ZoneKey,
  type ZoneResult,
} from "./audit-types";
import type { SiteChecks } from "./site-detect.functions";

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

type Rule = { zone: ZoneKey; ok: (c: SiteChecks) => boolean; bad: string; good: string; weight: number };

/** Правила по реальной разметке сайта: каждая — понятная проблема или сильная сторона. */
const RULES: Rule[] = [
  { zone: "mobile", weight: 18, ok: (c) => c.viewport, bad: "Сайт не настроен под экран телефона — страница показывается уменьшенной копией десктопа", good: "Страница адаптирована под ширину экрана телефона" },
  { zone: "order", weight: 14, ok: (c) => c.forms > 0, bad: "На главной нет ни одной формы — оставить заявку можно только перейдя в другой раздел", good: "Форма для обращения есть прямо на главной" },
  { zone: "trust", weight: 10, ok: (c) => c.phone, bad: "Телефон не кликабельный — с мобильного нельзя позвонить в одно касание", good: "Телефон кликабельный, позвонить можно в одно касание" },
  { zone: "trust", weight: 10, ok: (c) => c.messengers, bad: "Нет ссылок на мессенджеры — тем, кто не любит звонить, неудобно связаться", good: "Есть быстрая связь через мессенджеры" },
  { zone: "trust", weight: 10, ok: (c) => c.reviews, bad: "На главной не видно отзывов и кейсов — новому посетителю не на что опереться", good: "Отзывы или кейсы видны уже на главной" },
  { zone: "trust", weight: 6, ok: (c) => c.legal, bad: "Не указаны реквизиты компании — это снижает доверие перед оплатой", good: "Указаны данные компании" },
  { zone: "speed", weight: 12, ok: (c) => c.htmlKb < 250, bad: "Главная страница очень тяжёлая — на мобильном интернете она открывается долго", good: "Главная страница лёгкая и быстро загружается" },
  { zone: "speed", weight: 8, ok: (c) => c.scripts < 35, bad: "На странице слишком много сторонних скриптов — они тормозят открытие", good: "Сторонних скриптов немного, страница не перегружена" },
  { zone: "speed", weight: 8, ok: (c) => c.images < 8 || c.lazyImages > 0, bad: "Все картинки грузятся сразу, даже те, до которых посетитель не долистал", good: "Картинки подгружаются по мере прокрутки" },
  { zone: "seo", weight: 8, ok: (c) => c.title && c.description, bad: "Нет понятного заголовка и описания — в поиске сайт выглядит невыразительно", good: "Заголовок и описание страницы заполнены" },
  { zone: "seo", weight: 6, ok: (c) => c.ogTags, bad: "При отправке ссылки в мессенджер не показывается красивое превью", good: "Ссылка на сайт красиво выглядит в мессенджерах" },
  { zone: "seo", weight: 5, ok: (c) => c.h1 === 1, bad: "Главный заголовок страницы оформлен неправильно — поиску сложно понять, о чём сайт", good: "Главный заголовок страницы оформлен правильно" },
  { zone: "order", weight: 6, ok: (c) => c.https, bad: "Сайт открывается без защищённого соединения — браузер предупреждает посетителя", good: "Сайт работает по защищённому соединению" },
];

/** Оценивает зону по реальным признакам: 100 минус вес проваленных правил. */
export function evaluateChecks(checks: SiteChecks, zone: ZoneKey) {
  const rules = RULES.filter((r) => r.zone === zone);
  const failed = rules.filter((r) => !r.ok(checks));
  const passed = rules.filter((r) => r.ok(checks));
  const penalty = failed.reduce((s, r) => s + r.weight, 0);
  return { penalty, findings: failed.map((r) => r.bad), strengths: passed.map((r) => r.good) };
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

const stem = (w: string) => w.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "").slice(0, 6);

/** Насколько описание доработки перекликается с конкретными проблемами зоны (общие корни слов). */
export function addonRelevance(addon: Addon, zone: ZoneResult): number {
  const words = new Set(
    `${addon.name} ${addon.description}`.split(/\s+/).map(stem).filter((w) => w.length >= 5),
  );
  const text = zone.findings.join(" ").split(/\s+/).map(stem).filter((w) => w.length >= 5);
  return new Set(text.filter((w) => words.has(w))).size;
}

/** Самые близкие доработке проблемы зоны — для объяснения «что решает». */
export function addonFindings(addon: Addon, zone: ZoneResult, n = 2): string[] {
  const words = new Set(
    `${addon.name} ${addon.description}`.split(/\s+/).map(stem).filter((w) => w.length >= 5),
  );
  return [...zone.findings]
    .map((f, i) => ({ f, i, s: f.split(/\s+/).map(stem).filter((w) => words.has(w)).length }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.f);
}

export function recommendAddons(
  zones: ZoneResult[],
  siteType: SiteType,
  catalog: Addon[],
  limit = 8,
): string[] {
  const active = catalog.filter((a) => !a.archived && addonSiteTypes(a).includes(siteType));
  const weak = weakZones(zones);
  const out: string[] = [];
  const perZone = (zone: ZoneResult, n: number) => {
    const matches = active
      .filter((a) => addonZones(a).includes(zone.key) && !out.includes(a.id))
      .sort((a, b) => {
        const bonus = (x: Addon) =>
          (siteType === "ecommerce" && x.category === "Интернет-магазин" ? -2 : 0) +
          (siteType !== "ecommerce" && x.category === "Интернет-магазин" ? 2 : 0) -
          addonRelevance(x, zone) * 3;
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
  options: {
    siteTypeHint?: SiteType | undefined;
    attempt?: number | undefined;
    detect?: Audit["detect"] | undefined;
  } = {},
): Audit {
  const url = normalizeUrl(input);
  const host = hostOf(url);
  const attempt = options.attempt ?? 1;
  const siteType = detectSiteType(url, options.siteTypeHint);
  const rand = rng(hash(`${host}|${siteType}|${attempt}`));
  const improvement = (attempt - 1) * 7;

  const checks = options.detect?.checks;
  const zones: ZoneResult[] = ZONES.map((z) => {
    const real = checks ? evaluateChecks(checks, z.key) : undefined;
    // С реальными данными оценка опирается на найденное, без них — на типичную картину для формата.
    const base = real
      ? 88 - real.penalty - Math.floor(rand() * 14) + improvement
      : 38 + Math.floor(rand() * 48) + improvement;
    const score = Math.max(24, Math.min(96, base));
    const pool = [...FINDINGS[z.key][siteType], ...FINDINGS[z.key].any];
    const findingCount = score >= 80 ? 2 : score >= 60 ? 3 : 5;
    const findings = [...(real?.findings ?? [])];
    for (const f of pick(pool, findingCount, rand)) if (findings.length < findingCount) findings.push(f);
    const strengths = (real?.strengths.length ? real.strengths : pick(STRENGTHS[z.key], 2, rand)).slice(
      0,
      score >= 70 ? 3 : 2,
    );
    return { key: z.key, score, findings, strengths };
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
    ...(options.detect ? { detect: options.detect } : {}),
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
