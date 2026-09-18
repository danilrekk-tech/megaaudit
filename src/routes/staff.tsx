import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui-bits";
import { STAFF_PIN, isStaffUnlocked, setStaffUnlocked, useStore } from "@/lib/store";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Служебный раздел — Mega.Audit" },
      { name: "description", content: "Внутренний раздел сервиса Mega.Audit." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffLayout,
});

const NAV = [
  { to: "/staff", label: "Журнал аудитов" },
  { to: "/staff/catalog", label: "База доработок" },
  { to: "/staff/proposal", label: "Конструктор КП" },
] as const;

function StaffLayout() {
  const [unlocked, refresh] = useStore<boolean>(() => isStaffUnlocked());
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!unlocked) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-5">
        <Card className="w-full max-w-sm">
          <p className="text-sm text-muted-foreground">Служебный доступ</p>
          <h1 className="mt-1 text-xl font-bold">Введите код доступа</h1>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (pin.trim() === STAFF_PIN) {
                setStaffUnlocked(true);
                refresh();
              } else {
                setError("Неверный код");
              }
            }}
          >
            <Input value={pin} onChange={setPin} placeholder="PIN" type="password" />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="w-full">
              Войти
            </Button>
          </form>
          <Link to="/" className="mt-5 block text-center text-sm text-muted-foreground hover:text-foreground">
            Вернуться на сайт
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="no-print border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-6">
            <span className="font-bold tracking-tight">Служебный раздел</span>
            <nav className="flex gap-4 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.to === "/staff" }}
                  activeProps={{ className: "text-brand font-semibold" }}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Клиентский сайт
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setStaffUnlocked(false);
                refresh();
              }}
            >
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}
