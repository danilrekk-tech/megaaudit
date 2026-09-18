import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, Button, Card } from "@/components/ui-bits";
import { getAudit, getCatalog, getProposal, useStore } from "@/lib/store";
import { SITE_TYPE_LABEL, type Addon, type Proposal } from "@/lib/audit-types";

export const Route = createFileRoute("/proposal/$proposalId")({
  head: () => ({
    meta: [
      { title: "Коммерческое предложение по доработкам сайта" },
      {
        name: "description",
        content: "Смета доработок сайта по результатам Mega.Audit: состав работ, этапы и стоимость.",
      },
      { property: "og:title", content: "Коммерческое предложение по доработкам сайта" },
      { property: "og:description", content: "Состав работ, этапы внедрения и стоимость доработок." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProposalPage,
});

const money = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

function ProposalPage() {
  const { proposalId } = Route.useParams();
  const [proposal] = useStore<Proposal | undefined>(() => getProposal(proposalId));
  const [catalog] = useStore<Addon[]>(() => getCatalog());

  if (!proposal) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold">Предложение не найдено</h1>
        <Link to="/" className="mt-6 inline-block">
          <Button>На главную</Button>
        </Link>
      </div>
    );
  }

  const audit = proposal.auditId ? getAudit(proposal.auditId) : undefined;
  const rows = proposal.items
    .map((item) => ({ item, addon: catalog?.find((a) => a.id === item.addonId) }))
    .filter((r): r is { item: typeof proposal.items[number]; addon: Addon } => Boolean(r.addon));
  const subtotal = rows.reduce((s, r) => s + (r.item.price || 0), 0);
  const discount = Math.round((subtotal * proposal.discountPct) / 100);
  const total = subtotal - discount;
  const stages = Array.from(new Set(rows.map((r) => r.item.stage))).sort();

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="mx-auto max-w-4xl px-5">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← На главную
          </Link>
          <Button onClick={() => window.print()}>Скачать / печать</Button>
        </div>

        <Card className="print-page">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-sm text-muted-foreground">Коммерческое предложение</p>
              <h1 className="mt-1 text-2xl font-bold">Доработки сайта {proposal.host}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                от {new Date(proposal.createdAt).toLocaleDateString("ru-RU")} · клиент:{" "}
                {proposal.client || proposal.host}
              </p>
            </div>
            {audit ? (
              <div className="text-right">
                <Badge tone="brand">{SITE_TYPE_LABEL[audit.siteType]}</Badge>
                <p className="mt-2 text-sm text-muted-foreground">
                  Скор аудита: <span className="font-semibold text-foreground">{audit.overall}/100</span>
                </p>
              </div>
            ) : null}
          </div>

          {proposal.notes ? <p className="mt-6 text-sm text-muted-foreground">{proposal.notes}</p> : null}

          {stages.map((stage) => (
            <div key={stage} className="mt-8">
              <p className="font-semibold">Этап {stage}</p>
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-2">Доработка</th>
                    <th className="pb-2">Категория</th>
                    <th className="pb-2 text-right">Стоимость</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((r) => r.item.stage === stage)
                    .map((r) => (
                      <tr key={r.addon.id} className="border-t border-border/70">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{r.addon.name}</p>
                          <p className="mt-1 text-muted-foreground">{r.addon.description}</p>
                          <div className="mt-1.5 flex gap-3 text-xs">
                            <a href={r.addon.page_url} className="text-brand">
                              {r.addon.page_url}
                            </a>
                            <a href={r.addon.demo_url} className="text-muted-foreground">
                              демо
                            </a>
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-top text-muted-foreground">{r.addon.category}</td>
                        <td className="py-3 text-right align-top tabular-nums">
                          {r.item.price ? money(r.item.price) : "по запросу"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="mt-8 border-t border-border pt-5 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Стоимость работ</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            {proposal.discountPct ? (
              <div className="flex justify-between py-1 text-success">
                <span>Скидка {proposal.discountPct}%</span>
                <span className="tabular-nums">−{money(discount)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Итого</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Предложение подготовлено по результатам проверки сайта в Mega.Audit. Каталог доработок:
            megagroup.shop
          </p>
        </Card>
      </div>
    </div>
  );
}
