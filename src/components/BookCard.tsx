import { Link } from "@tanstack/react-router";
import { Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BookMeta } from "@/lib/db";
import { removeBook, updateBook } from "@/lib/db";
import { formatBytes, readingProgress, relativeDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function BookCard({ book }: { book: BookMeta }) {
  const [confirm, setConfirm] = useState(false);
  const progress = readingProgress(book.currentPage, book.pageCount);
  const started = book.lastOpenedAt !== null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow hover:shadow-page">
      <Link
        to="/leitor/$bookId"
        params={{ bookId: book.id }}
        className="flex flex-1 flex-col focus-visible:outline-none"
        aria-label={`Abrir ${book.title}`}
      >
        <div className="book-spine relative flex aspect-[4/3] items-end p-4">
          <span className="line-clamp-3 font-display text-lg font-semibold leading-snug text-primary-foreground">
            {book.title}
          </span>
          {started && (
            <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-medium text-foreground">
              {progress}%
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs text-muted-foreground">
            {book.pageCount ? `${book.pageCount} páginas · ` : ""}
            {formatBytes(book.size)}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso de leitura">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {started ? `Página ${book.currentPage} · ${relativeDate(book.lastOpenedAt)}` : "Não iniciado"}
          </p>
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex gap-1">
        <Button
          size="icon"
          variant="secondary"
          className="size-9 rounded-full bg-card/90"
          aria-label={book.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-pressed={book.favorite}
          onClick={() => updateBook(book.id, { favorite: !book.favorite })}
        >
          <Star className={book.favorite ? "size-4 fill-primary text-primary" : "size-4"} />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="size-9 rounded-full bg-card/90"
          aria-label={`Remover ${book.title}`}
          onClick={() => setConfirm(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover livro?</AlertDialogTitle>
            <AlertDialogDescription>
              “{book.title}” será apagado deste dispositivo, junto com marcadores e notas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                removeBook(book.id)
                  .then(() => toast.success("Livro removido."))
                  .catch(() => toast.error("Não foi possível remover o livro."))
              }
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
