import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui-bits";
import { ZONES, type Addon, type ZoneKey } from "@/lib/audit-types";
import { addonZones } from "@/lib/audit-engine";
import { getCatalog, resetCatalog, upsertAddon, useStore } from "@/lib/store";

export const Route = createFileRoute("/staff/catalog")({
  component: StaffCatalog,
});

const emptyAddon = (): Addon => ({
  id: `new-${Date.now().toString(36)}`,
  name: "",
  description: "",
  category: "Новинки",
  page_url: "",
  demo_url: "",
  zones: [],
  price: 0,
});

function StaffCatalog() {
  const [catalog, refresh] = useStore<Addon[]>(() => getCatalog());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState<Addon | null>(null);

  const categories = useMemo(
    () => Array.from(new Set((catalog ?? []).map((a) => a.category))).sort(),
    [catalog],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalog ?? [])
      .filter((a) => (showArchived ? true : !a.archived))
      .filter((a) => category === "all" || a.category === category)
      .filter((a) => !q || `${a.name} ${a.description}`.toLowerCase().includes(q));
  }, [catalog, query, category, showArchived]);

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    upsertAddon(draft);
    setDraft(null);
    refresh();
  };

  const toggleArchive = (addon: Addon) => {
    upsertAddon({ ...addon, archived: !addon.archived });
    refresh();
  };

  const toggleZone = (zone: ZoneKey) => {
    if (!draft) return;
    const current = draft.zones?.length ? draft.zones : addonZones(draft);
    setDraft({
      ...draft,
      zones: current.includes(zone) ? current.filter((z) => z !== zone) : [...current, zone],
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">База доработок</h1>
          <p className="mt-1 text-muted-foreground">
            {catalog?.length ?? 0} услуг из megagroup.shop · поиск, редактирование, привязка к зонам
            аудита
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetCatalog(); refresh(); }}>
            Сбросить к исходной базе
          </Button>
          <Button onClick={() => setDraft(emptyAddon())}>Добавить доработку</Button>
        </div>
      </div>

      {draft ? (
        <Card className="mt-6">
          <p className="font-semibold">{catalog?.some((a) => a.id === draft.id) ? "Редактирование" : "Новая доработка"}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Название" />
            <Input
              value={draft.category}
              onChange={(v) => setDraft({ ...draft, category: v })}
              placeholder="Категория"
            />
            <Input
              value={draft.page_url}
              onChange={(v) => setDraft({ ...draft, page_url: v })}
              placeholder="Ссылка на страницу услуги"
            />
            <Input
              value={draft.demo_url}
              onChange={(v) => setDraft({ ...draft, demo_url: v })}
              placeholder="Ссылка на демо"
            />
            <Input
              value={draft.price ?? 0}
              onChange={(v) => setDraft({ ...draft, price: Number(v) || 0 })}
              placeholder="Цена, ₽"
              type="number"
            />
          </div>
          <div className="mt-3">
            <Textarea
              value={draft.description}
              onChange={(v) => setDraft({ ...draft, description: v })}
              placeholder="Ценность для бизнеса"
              rows={3}
            />
          </div>
          <p className="mt-4 text-sm font-medium">Привязка к типам проблем</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ZONES.map((z) => {
              const active = (draft.zones?.length ? draft.zones : addonZones(draft)).includes(z.key);
              return (
                <button
                  key={z.key}
                  type="button"
                  onClick={() => toggleZone(z.key)}
                  className={
                    active
                      ? "rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground"
                      : "rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                  }
                >
                  {z.label}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={save}>Сохранить</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Отмена
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-52 flex-1">
            <Input value={query} onChange={setQuery} placeholder="Поиск по названию и описанию" />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="all">Все категории</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Показывать архив
          </label>
        </div>

        <div className="mt-6 space-y-3">
          {list.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-border/70 bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <p className={a.archived ? "font-semibold text-muted-foreground line-through" : "font-semibold"}>
                    {a.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{a.category}</Badge>
                    {addonZones(a).map((z) => (
                      <Badge key={z}>{ZONES.find((x) => x.key === z)!.label}</Badge>
                    ))}
                    {a.price ? <Badge tone="good">{a.price.toLocaleString("ru-RU")} ₽</Badge> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDraft({ ...a })}>
                    Изменить
                  </Button>
                  <Button variant="ghost" onClick={() => toggleArchive(a)}>
                    {a.archived ? "Вернуть" : "В архив"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ничего не найдено.</p>
          ) : null}
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Изменения сохраняются в этом браузере. Кнопка сброса возвращает исходную базу из файла.
      </p>
    </div>
  );
}
