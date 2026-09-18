import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function MegagroupLogo() {
  return (
    <span className="flex items-center gap-2" aria-label="Мегагрупп">
      <span className="grid h-8 w-8 grid-cols-2 gap-0.5" aria-hidden="true">
        <span className="rounded-tl-sm bg-brand" />
        <span className="rounded-tr-sm bg-warning" />
        <span className="rounded-bl-sm bg-danger" />
        <span className="rounded-br-sm bg-success" />
      </span>
      <span className="text-lg font-bold">Мегагрупп.ру</span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-20 h-16 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5">
        <a href="https://megagroup.shop" target="_blank" rel="noreferrer" aria-label="Перейти на сайт Мегагрупп">
          <MegagroupLogo />
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/" hash="opportunities" className="transition-colors hover:text-foreground">
            Возможности
          </Link>
          <Link to="/" hash="how-it-works" className="transition-colors hover:text-foreground">
            Как работает
          </Link>
          <Link to="/" className="rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors hover:bg-muted">
            Новый аудит
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
        <a href="https://megagroup.shop" target="_blank" rel="noreferrer" aria-label="Перейти на сайт Мегагрупп">
          <MegagroupLogo />
        </a>
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-right">
          Автоматический аудит оценивает удобство и коммерческую готовность сайта. Результат носит
          рекомендательный характер и помогает определить приоритетные точки роста.
        </p>
        <Link to="/staff" className="sr-only">
          Служебный раздел
        </Link>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
