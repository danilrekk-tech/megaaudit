export type SiteType = "ecommerce" | "services" | "landing";

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  ecommerce: "Интернет-магазин",
  services: "Корпоративный сайт / услуги",
  landing: "Лендинг",
};

export type ZoneKey = "order" | "mobile" | "trust" | "speed" | "seo";

export const ZONES: { key: ZoneKey; label: string; hint: string }[] = [
  { key: "order", label: "Путь до заказа и заявки", hint: "сколько шагов до покупки и где клиент бросает" },
  { key: "mobile", label: "Удобство на телефоне", hint: "как сайт работает у большинства посетителей" },
  { key: "trust", label: "Доверие и связь", hint: "отзывы, гарантии, быстрые способы связаться" },
  { key: "speed", label: "Скорость и вовлечение", hint: "не уходит ли клиент с первой секунды" },
  { key: "seo", label: "Продающие блоки", hint: "акции, подборки, поводы вернуться" },
];

/** Чем грозит слабая оценка зоны — простыми словами для клиента. */
export const ZONE_LOSS: Record<ZoneKey, string> = {
  order: "Каждый лишний шаг в заказе отсекает часть покупателей: они уходят, уже выбрав товар или услугу.",
  mobile: "С телефона приходит большинство посетителей — неудобный экран превращает их в отказы.",
  trust: "Если непонятно, кому платить и как связаться, клиент уходит сравнивать вас с конкурентами.",
  speed: "Медленный или скучный первый экран теряет посетителя раньше, чем он увидит предложение.",
  seo: "Без акций, подборок и поводов вернуться сайт продаёт только тем, кто уже готов купить.",
};

export type ZoneResult = {
  key: ZoneKey;
  score: number;
  findings: string[];
  strengths: string[];
};

export type AuditImpact = {
  lostLeadsPerMonth: number;
  abandonedCartsPct: number;
  mobileChurnPct: number;
  revenueLossPct: number;
};

export type Audit = {
  id: string;
  url: string;
  host: string;
  siteType: SiteType;
  createdAt: string;
  attempt: number;
  overall: number;
  conversionScore: number;
  zones: ZoneResult[];
  impact: AuditImpact;
  detect?: { reason: string; pages: number; reached: boolean };
  addonIds: string[];
  staff: {
    notes: string;
    managerComment: string;
    upsell: number;
  };
};

export type Addon = {
  id: string;
  name: string;
  description: string;
  category: string;
  page_url: string;
  demo_url: string;
  zones?: ZoneKey[];
  price?: number;
  archived?: boolean;
};

export type ProposalItem = {
  addonId: string;
  price: number;
  stage: number;
};

export type Proposal = {
  id: string;
  auditId: string | null;
  host: string;
  client: string;
  createdAt: string;
  items: ProposalItem[];
  discountPct: number;
  notes: string;
};
