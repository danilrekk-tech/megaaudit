export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-xl bg-brand text-brand-foreground ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="10.5" cy="10.5" r="6.5" strokeLinecap="round" />
        <path d="M15.5 15.5 21 21" strokeLinecap="round" />
        <path d="M7.5 12.5v-1.5M10.5 12.5V8M13.5 12.5v-3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function LogoWord({ className }: { className?: string }) {
  return (
    <span className={`text-base font-bold tracking-tight ${className ?? ""}`}>
      Mega<span className="text-brand">.Audit</span>
    </span>
  );
}
