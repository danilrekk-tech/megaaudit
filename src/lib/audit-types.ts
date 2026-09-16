export type SiteType = "ecommerce" | "services" | "landing";

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  ecommerce: "Интернет-магазин",
  services: "Корпоративный сайт / услуги",
  landing: "Лендинг",
};

export type ZoneKey = "order" | "mobile" | "trust" | "speed" | "seo";

export const ZONES: { key: ZoneKey; label: string; hint: string }[] = [
  { key: "order", label: "Удобство заказа и корзины", hint: "путь до заявки, корзина, оплата" },
  { key: "mobile", label: "Мобильная адаптивность", hint: "верстка и удобство на телефоне" },
  { key: "trust", label: "Доверие и контакты", hint: "контакты, отзывы, гарантии" },
  { key: "speed", label: "Скорость и вовлечение", hint: "загрузка, интерактив, возвраты" },
  { key: "seo", label: "SEO и коммерческие факторы", hint: "видимость в поиске и продающие блоки" },
];

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
