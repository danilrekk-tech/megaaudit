import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageShell } from "@/components/Shell";
import { LogoMark } from "@/components/Logo";
import { Badge, Button, Card, Input } from "@/components/ui-bits";
import { ZONES, SITE_TYPE_LABEL, type SiteType } from "@/lib/audit-types";
import { hostOf, runAudit } from "@/lib/audit-engine";
import { detectSiteFormat } from "@/lib/site-detect.functions";
import { auditsForHost, getCatalog, saveAudit } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mega.Audit — проверка сайта: где он теряет клиентов" },
      {
        name: "description",
        content:
          "Mega.Audit проверяет сайт и показывает слабые места: путь до заказа, удобство на телефоне, доверие, скорость. Вы видите, сколько обращений теряется, и что исправить.",
      },
      { property: "og:title", content: "Mega.Audit — где ваш сайт теряет клиентов" },
      {
        property: "og:description",
        content: "Понятный отчёт о слабых местах сайта, оценка потерь и список конкретных доработок.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PRESETS: { url: string; type: SiteType; label: string }[] = [
  { url: "shop-elektro.ru", type: "ecommerce", label: "Интернет-магазин" },
  { url: "stroy-partner.ru", type: "services", label: "Сайт услуг" },
  { url: "promo-kursy.ru", type: "landing", label: "Лендинг" },
];

const HOW = [
  {
    title: "1. Указываете адрес сайта",
    text: "Mega.Audit сам определяет формат: одна страница — лендинг, есть корзина и карточки товаров — магазин, много разделов без корзины — сайт услуг.",
  },
  {
    title: "2. Смотрите слабые места",
    text: "По каждой зоне видно, что мешает клиенту дойти до заказа, и чем это грозит вашей выручке.",
  },
  {
    title: "3. Получаете список решений",
    text: "К каждому слабому месту подбираются доработки, подходящие именно вашему формату сайта, с ценами в готовом предложении.",
  },
];

function Index() {
  const navigate = useNavigate();
  const detect = useServerFn(detectSiteFormat);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async (value: string, siteTypeHint?: SiteType) => {
    const clean = value.trim();
    if (!clean || busy) return;
    setBusy(true);
    let detected: SiteType | undefined = siteTypeHint;
    let info: { reason: string; pages: number; reached: boolean } | undefined;
    if (!siteTypeHint) {
      try {
        const res = await detect({ data: { url: clean } });
        detected = res.siteType;
        info = { reason: res.reason, pages: res.pages, reached: res.reached };
      } catch {
        detected = undefined;
      }
    }
    const host = hostOf(clean);
    const attempt = auditsForHost(host).length + 1;
    const audit = runAudit(clean, getCatalog(), {
      siteTypeHint: detected,
      attempt,
      detect: info,
    });
    saveAudit(audit);
    setBusy(false);
    void navigate({ to: "/audit/$auditId", params: { auditId: audit.id } });
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-10">
        <Badge tone="brand">Проверка сайта за одну минуту</Badge>
        <div className="mt-5 flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <span className="text-2xl font-bold tracking-tight">
            Mega<span className="text-brand">.Audit</span>
          </span>
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Найдите слабые места своего сайта — там, где уходят клиенты
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Введите адрес сайта, и Mega.Audit покажет понятным языком: где посетителю сложно оформить
          заказ, что мешает на телефоне, чего не хватает для доверия и почему люди уходят с первого
          экрана. Плюс — сколько обращений вы теряете и какие доработки это исправят.
        </p>

        <Card className="mt-9 max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start(url);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input value={url} onChange={setUrl} placeholder="Адрес вашего сайта, например shop-elektro.ru" />
            <Button type="submit" disabled={busy} className="sm:w-auto">
              {busy ? "Проверяем сайт…" : "Проверить сайт"}
            </Button>
          </form>
          <p className="mt-3 text-sm text-muted-foreground">
            Формат сайта определяется автоматически — отчёт и доработки подбираются под него.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Посмотреть на примере:</span>
            {PRESETS.map((p) => (
              <button
                key={p.url}
                type="button"
                disabled={busy}
                onClick={() => {
                  setUrl(p.url);
                  void start(p.url, p.type);
                }}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        <h2 className="mt-16 text-2xl font-bold tracking-tight">Как это работает</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {HOW.map((h) => (
            <Card key={h.title} className="p-5">
              <p className="font-semibold">{h.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{h.text}</p>
            </Card>
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-bold tracking-tight">Что проверяем</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Пять зон, от которых напрямую зависит, дойдёт ли посетитель до заказа.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZONES.map((z) => (
            <Card key={z.key} className="p-5">
              <p className="font-semibold">{z.label}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{z.hint}</p>
            </Card>
          ))}
          <Card className="p-5">
            <p className="font-semibold">Что вы получите</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Отчёт с оценкой, разбором слабых мест, оценкой потерь и готовым предложением по
              доработкам — можно распечатать или сохранить.
            </p>
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap gap-2 text-sm text-muted-foreground">
          Работаем с сайтами:
          {Object.values(SITE_TYPE_LABEL).map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
