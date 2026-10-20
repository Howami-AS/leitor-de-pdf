import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Star, Trash2 } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { deleteBookmark, listBookmarks, listBooks } from "@/lib/db";
import { useLibraryData } from "@/lib/library";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Leitor Inteligente" },
      { name: "description", content: "Seus livros favoritos e páginas marcadas." },
      { property: "og:title", content: "Favoritos — Leitor Inteligente" },
      { property: "og:description", content: "Livros favoritos e marcadores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Favorites,
});

function Favorites() {
  const { data } = useLibraryData(async () => ({ books: await listBooks(), marks: await listBookmarks() }));
  const favs = data?.books.filter((b) => b.favorite) ?? [];
  const byId = new Map(data?.books.map((b) => [b.id, b]));
  return (
    <AppShell>
      <PageHeader title="Favoritos" subtitle="Livros favoritos e páginas que você marcou." />
      <h2 className="mb-4 font-display text-xl font-semibold">Livros favoritos</h2>
      {data && favs.length === 0 ? (
        <EmptyState icon={<Star className="size-6" />} title="Nenhum favorito">Toque na estrela de um livro na biblioteca.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{favs.map((b) => <BookCard key={b.id} book={b} />)}</div>
      )}
      <h2 className="mb-4 mt-10 font-display text-xl font-semibold">Marcadores</h2>
      {data && data.marks.length === 0 ? (
        <EmptyState icon={<Bookmark className="size-6" />} title="Nenhum marcador">No leitor, use o botão de marcador para salvar uma página.</EmptyState>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {data?.marks.map((m) => {
            const b = byId.get(m.bookId);
            if (!b) return null;
            return (
              <li key={m.id} className="flex items-center gap-3 p-4">
                <Bookmark className="size-4 shrink-0 text-primary" aria-hidden />
                <Link to="/leitor/$bookId" params={{ bookId: b.id }} search={{ pagina: m.page }} className="flex-1 hover:underline">
                  <span className="font-medium">{b.title}</span>
                  <span className="text-muted-foreground"> · página {m.page}</span>
                </Link>
                <Button size="icon" variant="ghost" aria-label="Remover marcador" onClick={() => deleteBookmark(m.id)}><Trash2 className="size-4" /></Button>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
