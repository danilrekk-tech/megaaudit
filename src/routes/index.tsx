import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/Shell";
import { Badge, Button, Card, Input } from "@/components/ui-bits";
import { ZONES, SITE_TYPE_LABEL, type SiteType } from "@/lib/audit-types";
import { hostOf, runAudit } from "@/lib/audit-engine";
import { auditsForHost, getCatalog, saveAudit } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI-аудит сайта: оценка удобства и конверсии за 40 секунд" },
      {
        name: "description",
        content:
          "Проверьте сайт по 5 зонам: заказ и корзина, мобильная версия, доверие, скорость, SEO. Получите отчёт, оценку потерь и подбор доработок.",
      },
      { property: "og:title", content: "AI-аудит сайта: оценка удобства и конверсии" },
      {
        property: "og:description",
        content: "Отчёт по 5 зонам, влияние на бизнес и подбор доработок из каталога megagroup.shop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PRESETS: { url: string; type: SiteType; label: string }[] = [
  { url: "shop-elektro.ru", type: "ecommerce", label: "Интернет-магазин" },
  { url: "stroy-partner.ru", type: "services", label: "Корпоративный сайт" },
  { url: "promo-kursy.ru", type: "landing", label: "Лендинг" },
];

function Index() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [hint, setHint] = useState<SiteType | undefined>(undefined);

  const start = (value: string, siteTypeHint?: SiteType) => {
    const clean = value.trim();
    if (!clean) return;
    const host = hostOf(clean);
    const attempt = auditsForHost(host).length + 1;
    const audit = runAudit(clean, getCatalog(), { siteTypeHint, attempt });
    saveAudit(audit);
    void navigate({ to: "/audit/$auditId", params: { auditId: audit.id } });
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-10">
        <Badge tone="brand">AI-анализ по 5 зонам конверсии</Badge>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Узнайте, где сайт теряет заявки и деньги
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Сервис проверяет удобство заказа, мобильную версию, доверие, скорость и коммерческие
          факторы, показывает влияние проблем на выручку и подбирает конкретные доработки.
        </p>

        <Card className="mt-9 max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(url, hint);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input value={url} onChange={setUrl} placeholder="Адрес сайта, например shop-elektro.ru" />
            <Button type="submit" className="sm:w-auto">
              Запустить аудит
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Примеры для теста:</span>
            {PRESETS.map((p) => (
              <button
                key={p.url}
                type="button"
                onClick={() => {
                  setUrl(p.url);
                  setHint(p.type);
                  start(p.url, p.type);
                }}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZONES.map((z) => (
            <Card key={z.key} className="p-5">
              <p className="font-semibold">{z.label}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{z.hint}</p>
            </Card>
          ))}
          <Card className="p-5">
            <p className="font-semibold">Что в отчёте</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Оценка, узкие места, потери в заявках и готовое коммерческое предложение.
            </p>
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap gap-2 text-sm text-muted-foreground">
          Поддерживаемые типы сайтов:
          {Object.values(SITE_TYPE_LABEL).map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
