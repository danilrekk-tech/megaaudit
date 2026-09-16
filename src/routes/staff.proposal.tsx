import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui-bits";
import type { Addon, Proposal, ProposalItem } from "@/lib/audit-types";
import { getAudits, getCatalog, getProposal, getProposals, saveProposal, useStore } from "@/lib/store";

export const Route = createFileRoute("/staff/proposal")({
  validateSearch: (search: Record<string, unknown>): { kp?: string } => ({
    ...(typeof search["kp"] === "string" ? { kp: search["kp"] } : {}),
  }),
  component: StaffProposal,
});

const money = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

function StaffProposal() {
  const { kp } = Route.useSearch();
  const navigate = useNavigate();
  const [catalog] = useStore<Addon[]>(() => getCatalog());
  const [proposals, refreshProposals] = useStore<Proposal[]>(() => getProposals());
  const [draft, setDraft] = useState<Proposal | null>(null);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (kp) {
      const existing = getProposal(kp);
      if (existing) {
        setDraft(existing);
        return;
      }
    }
    setDraft((current) =>
      current ??
      {
        id: `kp-${Date.now().toString(36)}`,
        auditId: null,
        host: "",
        client: "",
        createdAt: new Date().toISOString(),
        items: [],
        discountPct: 0,
        notes: "",
      },
    );
  }, [kp]);

  const audits = getAudits();
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (catalog ?? [])
      .filter((a) => !a.archived && `${a.name} ${a.category}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalog, query]);

  if (!draft) return null;

  const rows = draft.items
    .map((item) => ({ item, addon: catalog?.find((a) => a.id === item.addonId) }))
    .filter((r): r is { item: ProposalItem; addon: Addon } => Boolean(r.addon));
  const subtotal = rows.reduce((s, r) => s + (r.item.price || 0), 0);
  const total = subtotal - Math.round((subtotal * draft.discountPct) / 100);

  const setItem = (addonId: string, patch: Partial<ProposalItem>) =>
    setDraft({
      ...draft,
      items: draft.items.map((i) => (i.addonId === addonId ? { ...i, ...patch } : i)),
    });

  const addItem = (addon: Addon) => {
    if (draft.items.some((i) => i.addonId === addon.id)) return;
    setDraft({
      ...draft,
      items: [...draft.items, { addonId: addon.id, price: addon.price ?? 0, stage: 1 }],
    });
    setQuery("");
  };

  const save = () => {
    saveProposal(draft);
    refreshProposals();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Конструктор коммерческого предложения</h1>
      <p className="mt-1 text-muted-foreground">
        Комплектация доработок, цены, скидка и этапы внедрения.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={draft.client}
                onChange={(v) => setDraft({ ...draft, client: v })}
                placeholder="Клиент / компания"
              />
              <Input
                value={draft.host}
                onChange={(v) => setDraft({ ...draft, host: v })}
                placeholder="Сайт клиента"
              />
            </div>
            <div className="mt-3">
              <select
                value={draft.auditId ?? ""}
                onChange={(e) => {
                  const audit = audits.find((a) => a.id === e.target.value);
                  setDraft({
                    ...draft,
                    auditId: audit ? audit.id : null,
                    host: audit ? audit.host : draft.host,
                    client: draft.client || (audit?.host ?? ""),
                  });
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">Без привязки к аудиту</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.host} · проверка №{a.attempt} · скор {a.overall}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <Textarea
                value={draft.notes}
                onChange={(v) => setDraft({ ...draft, notes: v })}
                placeholder="Вступление для клиента"
                rows={3}
              />
            </div>
          </Card>

          <Card>
            <p className="font-semibold">Добавить доработку</p>
            <div className="mt-3">
              <Input value={query} onChange={setQuery} placeholder="Поиск по базе доработок" />
            </div>
            {found.length ? (
              <div className="mt-3 space-y-2">
                {found.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => addItem(a)}
                    className="w-full rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-brand"
                  >
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.category}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {rows.map((r) => (
                <div key={r.addon.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-lg">
                      <p className="text-sm font-semibold">{r.addon.name}</p>
                      <Badge tone="brand" className="mt-2">
                        {r.addon.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDraft({ ...draft, items: draft.items.filter((i) => i.addonId !== r.addon.id) })
                      }
                    >
                      Убрать
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      value={r.item.price}
                      onChange={(v) => setItem(r.addon.id, { price: Number(v) || 0 })}
                      placeholder="Цена, ₽"
                      type="number"
                    />
                    <Input
                      value={r.item.stage}
                      onChange={(v) => setItem(r.addon.id, { stage: Math.max(1, Number(v) || 1) })}
                      placeholder="Этап"
                      type="number"
                    />
                  </div>
                </div>
              ))}
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Доработки ещё не выбраны.</p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <p className="font-semibold">Смета</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Позиции</span>
                <span>{rows.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Сумма</span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground">Скидка, %</p>
                <Input
                  value={draft.discountPct}
                  onChange={(v) => setDraft({ ...draft, discountPct: Math.min(90, Number(v) || 0) })}
                  type="number"
                />
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <span>Итого</span>
                <span className="tabular-nums">{money(total)}</span>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <Button className="w-full" onClick={save}>
                Сохранить КП
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  saveProposal(draft);
                  void navigate({ to: "/proposal/$proposalId", params: { proposalId: draft.id } });
                }}
              >
                Открыть печатную версию
              </Button>
              {saved ? <p className="text-center text-sm text-success">Сохранено</p> : null}
            </div>
          </Card>

          <Card>
            <p className="font-semibold">Сохранённые КП</p>
            <div className="mt-3 space-y-2 text-sm">
              {(proposals ?? []).length === 0 ? (
                <p className="text-muted-foreground">Пока пусто.</p>
              ) : null}
              {(proposals ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(p)}
                    className="text-left hover:text-brand"
                  >
                    {p.host || "без сайта"} · {new Date(p.createdAt).toLocaleDateString("ru-RU")}
                  </button>
                  <Link
                    to="/proposal/$proposalId"
                    params={{ proposalId: p.id }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    печать
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
