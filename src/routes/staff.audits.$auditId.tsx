import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge, Button, Card, ScoreBar, ScoreRing, Textarea } from "@/components/ui-bits";
import { ZONES, SITE_TYPE_LABEL, type Addon, type Audit } from "@/lib/audit-types";
import { runAudit } from "@/lib/audit-engine";
import { auditsForHost, getAudit, getCatalog, saveAudit, saveProposal, useStore } from "@/lib/store";

export const Route = createFileRoute("/staff/audits/$auditId")({
  component: StaffAudit,
});

function StaffAudit() {
  const { auditId } = Route.useParams();
  const navigate = useNavigate();
  const [audit, refresh] = useStore<Audit | undefined>(() => getAudit(auditId));
  const [catalog] = useStore<Addon[]>(() => getCatalog());
  const [notes, setNotes] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!audit) return;
    setNotes(audit.staff.notes);
    setComment(audit.staff.managerComment);
  }, [audit?.id]);

  if (!audit) {
    return (
      <Card>
        <p>Аудит не найден.</p>
        <Link to="/staff" className="mt-4 inline-block text-brand">
          ← В журнал
        </Link>
      </Card>
    );
  }

  const history = auditsForHost(audit.host);
  const previous = history.filter((a) => a.attempt < audit.attempt).pop();
  const addons = audit.addonIds
    .map((id) => catalog?.find((a) => a.id === id))
    .filter((a): a is Addon => Boolean(a));

  const save = () => {
    saveAudit({ ...audit, staff: { ...audit.staff, notes, managerComment: comment } });
    setSaved(true);
    refresh();
    setTimeout(() => setSaved(false), 2000);
  };

  const repeat = () => {
    const next = runAudit(audit.url, getCatalog(), {
      siteTypeHint: audit.siteType,
      attempt: history.length + 1,
    });
    saveAudit(next);
    void navigate({ to: "/staff/audits/$auditId", params: { auditId: next.id } });
  };

  const buildProposal = () => {
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
    void navigate({ to: "/staff/proposal", search: { kp: id } });
  };

  return (
    <div>
      <Link to="/staff" className="text-sm text-muted-foreground hover:text-foreground">
        ← Журнал аудитов
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{audit.host}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(audit.createdAt).toLocaleString("ru-RU")} · проверка №{audit.attempt} ·{" "}
            {SITE_TYPE_LABEL[audit.siteType]}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/audit/$auditId" params={{ auditId: audit.id }}>
            <Button variant="outline">Клиентский отчёт</Button>
          </Link>
          <Button variant="outline" onClick={repeat}>
            Повторный аудит
          </Button>
          <Button onClick={buildProposal}>Собрать КП</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center gap-3">
          <ScoreRing score={audit.overall} />
          <Badge tone={audit.staff.upsell > 60 ? "good" : "warn"}>
            вероятность апсейла {audit.staff.upsell}%
          </Badge>
        </Card>
        <Card>
          <p className="font-semibold">Технические заметки по зонам</p>
          <div className="mt-4 space-y-4">
            {audit.zones.map((z) => (
              <div key={z.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{ZONES.find((x) => x.key === z.key)!.label}</span>
                  <span className="tabular-nums text-muted-foreground">{z.score}/100</span>
                </div>
                <div className="mt-2">
                  <ScoreBar score={z.score} />
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {z.findings.map((f, i) => (
                    <li key={i}>— {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {previous ? (
        <Card className="mt-5">
          <p className="font-semibold">Сравнение с проверкой №{previous.attempt}</p>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2">Зона</th>
                <th className="pb-2">Было</th>
                <th className="pb-2">Стало</th>
                <th className="pb-2">Динамика</th>
              </tr>
            </thead>
            <tbody>
              {audit.zones.map((z) => {
                const before = previous.zones.find((p) => p.key === z.key)?.score ?? 0;
                const delta = z.score - before;
                return (
                  <tr key={z.key} className="border-t border-border/70">
                    <td className="py-2">{ZONES.find((x) => x.key === z.key)!.label}</td>
                    <td className="py-2 tabular-nums">{before}</td>
                    <td className="py-2 tabular-nums">{z.score}</td>
                    <td
                      className={
                        delta > 0
                          ? "py-2 font-semibold text-success"
                          : delta < 0
                            ? "py-2 font-semibold text-danger"
                            : "py-2 text-muted-foreground"
                      }
                    >
                      {delta > 0 ? `+${delta}` : delta || "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-border">
                <td className="py-2 font-semibold">Общий скор</td>
                <td className="py-2 tabular-nums">{previous.overall}</td>
                <td className="py-2 tabular-nums">{audit.overall}</td>
                <td className="py-2 font-semibold">
                  {audit.overall - previous.overall > 0
                    ? `+${audit.overall - previous.overall}`
                    : audit.overall - previous.overall || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="font-semibold">Комментарий для менеджера</p>
          <div className="mt-3 space-y-3">
            <Textarea value={comment} onChange={setComment} placeholder="Что говорить клиенту на созвоне" />
            <p className="text-sm font-semibold">Служебные заметки</p>
            <Textarea value={notes} onChange={setNotes} placeholder="Технические детали, доступы, сроки" />
            <div className="flex items-center gap-3">
              <Button onClick={save}>Сохранить</Button>
              {saved ? <span className="text-sm text-success">Сохранено</span> : null}
            </div>
          </div>
        </Card>
        <Card>
          <p className="font-semibold">Подобранные доработки ({addons.length})</p>
          <ul className="mt-3 space-y-3 text-sm">
            {addons.map((a) => (
              <li key={a.id} className="border-b border-border/60 pb-3 last:border-0">
                <p className="font-medium">{a.name}</p>
                <p className="mt-1 text-muted-foreground">{a.category}</p>
                <div className="mt-1 flex gap-3 text-xs">
                  <a href={a.page_url} target="_blank" rel="noreferrer" className="text-brand">
                    услуга
                  </a>
                  <a href={a.demo_url} target="_blank" rel="noreferrer" className="text-muted-foreground">
                    демо
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
