import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/Shell";
import { Badge, Button, Card, ScoreBar, ScoreRing, Stat } from "@/components/ui-bits";
import { ZONES, ZONE_LOSS, SITE_TYPE_LABEL, type Addon, type Audit } from "@/lib/audit-types";
import { scoreTone, weakZones } from "@/lib/audit-engine";
import { getAudit, getCatalog, saveProposal, useStore } from "@/lib/store";

export const Route = createFileRoute("/audit/$auditId")({
  head: () => ({
    meta: [
      { title: "Отчёт Mega.Audit — слабые места вашего сайта" },
      {
        name: "description",
        content:
          "Что мешает клиентам оформить заказ на вашем сайте: слабые места по зонам, оценка потерянных обращений и список доработок.",
      },
      { property: "og:title", content: "Отчёт Mega.Audit по сайту" },
      {
        property: "og:description",
        content: "Слабые места сайта, потери обращений и конкретные доработки под ваш формат сайта.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

const STEPS = ZONES.map((z) => z.label);

function AuditPage() {
  const { auditId } = Route.useParams();
  const navigate = useNavigate();
  const [audit] = useStore<Audit | undefined>(() => getAudit(auditId));
  const [catalog] = useStore<Addon[]>(() => getCatalog());
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 750);
    return () => clearTimeout(timer);
  }, [step]);

  const scanning = step < STEPS.length;

  if (!audit) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="text-2xl font-bold">Аудит не найден</h1>
          <p className="mt-2 text-muted-foreground">
            Возможно, отчёт был создан в другом браузере. Запустите проверку заново.
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button>На главную</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  if (scanning) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-5 py-24">
          <Card>
            <p className="text-sm text-muted-foreground">Анализируем сайт</p>
            <h1 className="mt-1 text-2xl font-bold">{audit.host}</h1>
            <div className="mt-8 space-y-4">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <span
                    className={
                      i < step
                        ? "grid h-6 w-6 place-items-center rounded-full bg-success text-xs text-white"
                        : i === step
                          ? "h-6 w-6 animate-pulse rounded-full border-2 border-brand"
                          : "h-6 w-6 rounded-full border-2 border-border"
                    }
                  >
                    {i < step ? "✓" : ""}
                  </span>
                  <span className={i <= step ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <ScoreBar score={Math.round(((step + 1) / STEPS.length) * 100)} />
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  const addons = audit.addonIds
    .map((id) => catalog?.find((a) => a.id === id))
    .filter((a): a is Addon => Boolean(a));
  const weakest = [...audit.zones].sort((a, b) => a.score - b.score).slice(0, 2);
  const strengths = audit.zones.flatMap((z) => (z.score >= 70 ? z.strengths : []));

  const createProposal = () => {
    const id = `kp-${audit.id}-${Date.now().toString(36)}`;
    saveProposal({
      id,
      auditId: audit.id,
      host: audit.host,
      client: audit.host,
      createdAt: new Date().toISOString(),
      items: addons.map((a, i) => ({ addonId: a.id, price: a.price ?? 0, stage: i < 3 ? 1 : 2 })),
      discountPct: 0,
      notes: "Предложение сформировано по результатам AI-аудита сайта.",
    });
    void navigate({ to: "/proposal/$proposalId", params: { proposalId: id } });
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="brand">{SITE_TYPE_LABEL[audit.siteType]}</Badge>
          <Badge>Проверка №{audit.attempt}</Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(audit.createdAt).toLocaleString("ru-RU")}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Отчёт по сайту {audit.host}</h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-[auto_1fr]">
          <Card className="flex flex-col items-center gap-4">
            <ScoreRing score={audit.overall} />
            <div className="text-center">
              <p className="font-semibold">Общий скор удобства</p>
              <p className="text-sm text-muted-foreground">
                Потенциал конверсии: {audit.conversionScore}/100
              </p>
            </div>
          </Card>
          <Card>
            <p className="font-semibold">Оценки по зонам</p>
            <div className="mt-5 space-y-4">
              {audit.zones.map((z) => {
                const meta = ZONES.find((x) => x.key === z.key)!;
                const tone = scoreTone(z.score);
                return (
                  <div key={z.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{meta.label}</span>
                      <Badge tone={tone === "good" ? "good" : tone === "warn" ? "warn" : "bad"}>
                        {z.score}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <ScoreBar score={z.score} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card>
            <p className="font-semibold text-success">Сильные стороны</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {(strengths.length ? strengths : ["Базовая функциональность сайта работает"]).map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <p className="font-semibold text-danger">Узкие места</p>
            <ul className="mt-4 space-y-3 text-sm">
              {weakest.map((z) => (
                <li key={z.key}>
                  <p className="font-medium">{ZONES.find((x) => x.key === z.key)!.label}</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {z.findings.map((f, i) => (
                      <li key={i}>— {f}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <h2 className="mt-12 text-2xl font-bold tracking-tight">Как это влияет на бизнес</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Потери заявок"
            value={`~${audit.impact.lostLeadsPerMonth}/мес`}
            hint="обращения, которые не доходят до менеджера"
            tone="bad"
          />
          <Stat
            label="Брошенные корзины"
            value={`${audit.impact.abandonedCartsPct}%`}
            hint="уходят на этапе оформления"
            tone="bad"
          />
          <Stat
            label="Отток мобильных"
            value={`${audit.impact.mobileChurnPct}%`}
            hint="закрывают сайт с телефона"
            tone="bad"
          />
          <Stat
            label="Недополученная выручка"
            value={`${audit.impact.revenueLossPct}%`}
            hint="оценка при текущем трафике"
            tone="bad"
          />
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Рекомендуемые доработки</h2>
            <p className="mt-1 text-muted-foreground">
              Подобраны под тип сайта и самые слабые зоны аудита.
            </p>
          </div>
          <Button onClick={createProposal}>Сформировать КП</Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {addons.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold leading-snug">{a.name}</p>
                <Badge tone="brand">{a.category}</Badge>
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{a.description}</p>
              <div className="mt-5 flex gap-4 text-sm font-medium">
                <a href={a.page_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  Страница услуги
                </a>
                <a
                  href={a.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Демо
                </a>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Нужен повторный аудит после доработок? Запустите проверку снова — сервис сравнит результаты.
          </p>
          <Link to="/">
            <Button variant="outline">Новый аудит</Button>
          </Link>
        </Card>
      </section>
    </PageShell>
  );
}
