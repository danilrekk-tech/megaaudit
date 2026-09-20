import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui-bits";
import { ZONES, type Addon, type ZoneKey } from "@/lib/audit-types";
import { addonZones } from "@/lib/audit-engine";
import { getCatalog, resetCatalog, saveCatalog, upsertAddon, useStore } from "@/lib/store";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catalog, refresh] = useStore<Addon[]>(() => getCatalog());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState<Addon | null>(null);
  const [importMessage, setImportMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

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

  const importCatalog = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("В файле должен быть непустой список доработок.");
      }

      const zoneKeys = new Set<ZoneKey>(ZONES.map((zone) => zone.key));
      const ids = new Set<string>();
      const imported = parsed.map((item: unknown, index): Addon => {
        if (!item || typeof item !== "object") {
          throw new Error(`Строка ${index + 1}: ожидается объект доработки.`);
        }
        const value = item as Record<string, unknown>;
        const required = ["id", "name", "description", "category", "page_url", "demo_url"] as const;
        for (const field of required) {
          if (typeof value[field] !== "string" || !value[field].trim()) {
            throw new Error(`Строка ${index + 1}: не заполнено поле «${field}».`);
          }
        }
        const id = (value.id as string).trim();
        if (ids.has(id)) throw new Error(`Идентификатор «${id}» встречается в файле несколько раз.`);
        ids.add(id);

        const zones = value.zones;
        if (zones !== undefined && (!Array.isArray(zones) || zones.some((zone) => !zoneKeys.has(zone as ZoneKey)))) {
          throw new Error(`Строка ${index + 1}: указана неизвестная зона аудита.`);
        }
        if (value.price !== undefined && (typeof value.price !== "number" || value.price < 0)) {
          throw new Error(`Строка ${index + 1}: цена должна быть положительным числом.`);
        }
        if (value.archived !== undefined && typeof value.archived !== "boolean") {
          throw new Error(`Строка ${index + 1}: поле archived должно быть true или false.`);
        }

        return {
          id,
          name: (value.name as string).trim(),
          description: (value.description as string).trim(),
          category: (value.category as string).trim(),
          page_url: (value.page_url as string).trim(),
          demo_url: (value.demo_url as string).trim(),
          ...(zones ? { zones: zones as ZoneKey[] } : {}),
          ...(typeof value.price === "number" ? { price: value.price } : {}),
          ...(typeof value.archived === "boolean" ? { archived: value.archived } : {}),
        };
      });

      saveCatalog(imported);
      refresh();
      setImportMessage({ tone: "good", text: `Загружено ${imported.length} доработок. Каталог обновлён.` });
    } catch (error) {
      setImportMessage({
        tone: "bad",
        text: error instanceof Error ? error.message : "Не удалось прочитать файл. Проверьте формат JSON.",
      });
    }
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
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => void importCatalog(event)}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Импортировать JSON
          </Button>
          <Button variant="outline" onClick={() => { resetCatalog(); refresh(); }}>
            Сбросить к исходной базе
          </Button>
          <Button onClick={() => setDraft(emptyAddon())}>Добавить доработку</Button>
        </div>
      </div>

      {importMessage ? (
        <div className="mt-4" role="status">
          <Badge tone={importMessage.tone}>{importMessage.text}</Badge>
        </div>
      ) : null}

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
