import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge, Card, Input, ScoreBar } from "@/components/ui-bits";
import { SITE_TYPE_LABEL, type Audit, type SiteType } from "@/lib/audit-types";
import { scoreTone } from "@/lib/audit-engine";
import { getAudits, useStore } from "@/lib/store";

export const Route = createFileRoute("/staff/")({
  component: StaffJournal,
});

const TYPE_FILTERS: (SiteType | "all")[] = ["all", "ecommerce", "services", "landing"];

function StaffJournal() {
  const [audits] = useStore<Audit[]>(() => getAudits());
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SiteType | "all">("all");
  const [minScore, setMinScore] = useState("");

  const list = useMemo(() => {
    return (audits ?? [])
      .filter((a) => a.host.toLowerCase().includes(query.trim().toLowerCase()))
      .filter((a) => type === "all" || a.siteType === type)
      .filter((a) => !minScore || a.overall >= Number(minScore))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [audits, query, type, minScore]);

  const avg = list.length ? Math.round(list.reduce((s, a) => s + a.overall, 0) / list.length) : 0;
  const hosts = new Set((audits ?? []).map((a) => a.host)).size;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Журнал аудитов</h1>
      <p className="mt-1 text-muted-foreground">
        Все проверки клиентов с историей, фильтрами и служебной аналитикой.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Всего аудитов</p>
          <p className="mt-2 text-2xl font-bold">{audits?.length ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Уникальных сайтов</p>
          <p className="mt-2 text-2xl font-bold">{hosts}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Средний скор</p>
          <p className="mt-2 text-2xl font-bold">{avg}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-52 flex-1">
            <Input value={query} onChange={setQuery} placeholder="Поиск по домену" />
          </div>
          <div className="w-40">
            <Input value={minScore} onChange={setMinScore} placeholder="Скор от" type="number" />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={
                  t === type
                    ? "rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground"
                    : "rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {t === "all" ? "Все типы" : SITE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Пока нет аудитов по заданным фильтрам.
            </p>
          ) : null}
          {list.map((a) => {
            const tone = scoreTone(a.overall);
            return (
              <Link
                key={a.id}
                to="/staff/audits/$auditId"
                params={{ auditId: a.id }}
                className="block rounded-xl border border-border/70 bg-background p-4 transition-colors hover:border-brand"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{a.host}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString("ru-RU")} · проверка №{a.attempt}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="brand">{SITE_TYPE_LABEL[a.siteType]}</Badge>
                    <Badge tone={tone === "good" ? "good" : tone === "warn" ? "warn" : "bad"}>
                      скор {a.overall}
                    </Badge>
                    <Badge tone={a.staff.upsell > 60 ? "good" : "neutral"}>
                      апсейл {a.staff.upsell}%
                    </Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <ScoreBar score={a.overall} />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
