import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
            AI
          </span>
          <span className="text-base font-bold tracking-tight">Аудит сайта</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <a href="https://megagroup.shop" target="_blank" rel="noreferrer" className="hover:text-foreground">
            Каталог доработок
          </a>
          <Link to="/" className="hover:text-foreground">
            Новый аудит
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-border/70 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>AI-аудит сайтов — оценка удобства и конверсии с подбором доработок.</p>
        <div className="flex items-center gap-4">
          <a href="https://megagroup.shop" target="_blank" rel="noreferrer" className="hover:text-foreground">
            megagroup.shop
          </a>
          <Link to="/staff" className="text-muted-foreground/40 transition-colors hover:text-foreground">
            ·
          </Link>
        </div>
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
