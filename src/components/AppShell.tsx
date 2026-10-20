import { Link } from "@tanstack/react-router";
import { BookOpen, Library, Settings, Star } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Biblioteca", icon: Library },
  { to: "/favoritos", label: "Favoritos", icon: Star },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
] as const;

export function Footer() {
  return <p className="py-6 text-center text-xs text-muted-foreground">©️ Alisson Salvador 2026</p>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-surface px-4 py-6 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-3 px-2">
          <img src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded-lg" />
          <span className="font-display text-xl font-semibold leading-tight">Leitor Inteligente</span>
        </Link>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              <Icon className="size-5" aria-hidden />
              {label === "Ajustes" ? "Configurações" : label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
          <BookOpen className="mb-2 size-4 text-primary" aria-hidden />
          Seus livros ficam somente neste dispositivo. Nada é enviado para a internet.
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col pb-20 md:pb-0">
        <header className="flex items-center gap-2 px-5 pt-5 md:hidden">
          <img src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-display text-lg font-semibold">Leitor Inteligente</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 md:px-10 md:py-10">{children}</main>
        <Footer />
      </div>

      <nav
        aria-label="Principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground data-[status=active]:text-primary"
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">{icon}</div>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 max-w-sm text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
