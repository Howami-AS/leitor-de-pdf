import { createFileRoute } from "@tanstack/react-router";
import { BookPlus, Library, Loader2, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listBooks } from "@/lib/db";
import { importPdfFile, useLibraryData } from "@/lib/library";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Leitor Inteligente" },
      { name: "description", content: "Leia e ouça seus livros em PDF, com tudo guardado no seu dispositivo." },
      { property: "og:title", content: "Leitor Inteligente" },
      { property: "og:description", content: "Leia e ouça seus livros em PDF, de forma privada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

type Filter = "todos" | "lendo" | "nao-iniciados" | "concluidos";

function LibraryPage() {
  const { data: books, error, loading } = useLibraryData(listBooks);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("pt-BR");
    return (books ?? [])
      .filter((b) => !term || b.title.toLocaleLowerCase("pt-BR").includes(term))
      .filter((b) => {
        const done = b.pageCount !== null && b.currentPage >= b.pageCount && b.lastOpenedAt;
        if (filter === "lendo") return b.lastOpenedAt && !done;
        if (filter === "nao-iniciados") return !b.lastOpenedAt;
        if (filter === "concluidos") return done;
        return true;
      })
      .sort((a, b) => (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt));
  }, [books, q, filter]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      const r = await importPdfFile(f);
      if (r.status === "added") toast.success(`“${r.book.title}” adicionado.`);
      else if (r.status === "duplicate") toast.info(`“${r.book.title}” já está na biblioteca.`);
      else toast.error(`${r.fileName}: ${r.message}`);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <AppShell>
      <PageHeader
        title="Sua biblioteca"
        subtitle="Leia e ouça seus PDFs. Tudo fica guardado só neste aparelho."
        actions={
          <>
            <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => onFiles(e.target.files)} />
            <Button size="lg" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <BookPlus />}
              {busy ? "Importando…" : "Importar PDF"}
            </Button>
          </>
        }
      />
      {books && books.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Buscar livros" placeholder="Buscar por título…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
            {([
              ["todos", "Todos"],
              ["lendo", "Lendo"],
              ["nao-iniciados", "Não iniciados"],
              ["concluidos", "Concluídos"],
            ] as const).map(([k, l]) => (
              <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {l}
              </Button>
            ))}
          </div>
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando biblioteca…</div>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {books && books.length === 0 && (
        <EmptyState icon={<Library className="size-6" />} title="Nenhum livro ainda">
          Toque em “Importar PDF” para adicionar seu primeiro livro. Ele não sai do seu dispositivo.
        </EmptyState>
      )}
      {books && books.length > 0 && shown.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">Nenhum livro corresponde à busca.</p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((b) => <BookCard key={b.id} book={b} />)}
      </div>
    </AppShell>
  );
}
