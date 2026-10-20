import { useCallback, useEffect, useState } from "react";
import {
  addBook,
  clearAll,
  getBookByHash,
  getBookFile,
  listBookmarks,
  listBooks,
  listNotes,
  LIBRARY_EVENT,
  newId,
  putRaw,
  type BookMeta,
} from "./db";
import { isPdfHeader, sha256Hex, titleFromFileName } from "./format";
import { openPdf, pdfErrorMessage } from "./pdf";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  base64ToBytes,
  bytesToBase64,
  planMerge,
  sanitizeBook,
  validateBackup,
  type BackupFile,
} from "./backup";

/** Re-runs a loader whenever library data changes. */
export function useLibraryData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);
  useEffect(() => {
    let alive = true;
    const run = () =>
      load()
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e) => alive && setError(e instanceof Error ? e.message : "Erro ao ler a biblioteca."));
    run();
    window.addEventListener(LIBRARY_EVENT, run);
    return () => {
      alive = false;
      window.removeEventListener(LIBRARY_EVENT, run);
    };
  }, [load]);
  return { data, error, loading: data === null && error === null };
}

export type ImportResult =
  | { status: "added"; book: BookMeta }
  | { status: "duplicate"; book: BookMeta }
  | { status: "error"; fileName: string; message: string };

export async function importPdfFile(file: File): Promise<ImportResult> {
  try {
    const buf = await file.arrayBuffer();
    if (!isPdfHeader(new Uint8Array(buf))) {
      return { status: "error", fileName: file.name, message: "Não é um arquivo PDF válido." };
    }
    const hash = await sha256Hex(buf);
    const existing = await getBookByHash(hash);
    if (existing) return { status: "duplicate", book: existing };
    let pageCount: number | null = null;
    try {
      const doc = await openPdf(buf.slice(0));
      pageCount = doc.numPages;
      await doc.destroy();
    } catch (e) {
      return { status: "error", fileName: file.name, message: pdfErrorMessage(e) };
    }
    const book: BookMeta = {
      id: newId(),
      title: titleFromFileName(file.name),
      fileName: file.name.slice(0, 200),
      size: file.size,
      pageCount,
      hash,
      addedAt: Date.now(),
      lastOpenedAt: null,
      currentPage: 1,
      favorite: false,
      hasText: null,
    };
    await addBook(book, new Blob([buf], { type: "application/pdf" }));
    return { status: "added", book };
  } catch (e) {
    const quota = (e as { name?: string })?.name === "QuotaExceededError";
    return {
      status: "error",
      fileName: file.name,
      message: quota ? "Sem espaço de armazenamento no dispositivo." : "Falha ao salvar o livro.",
    };
  }
}

export async function exportBackup(): Promise<Blob> {
  const [books, bookmarks, notes] = await Promise.all([listBooks(), listBookmarks(), listNotes()]);
  const total = books.reduce((s, b) => s + b.size, 0) * 1.37;
  if (total > MAX_BACKUP_BYTES) {
    throw new Error(
      "A biblioteca é grande demais para um único backup neste navegador (limite aproximado de 400 MB). Remova alguns livros grandes e tente novamente.",
    );
  }
  const out: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    books: [],
    bookmarks,
    notes,
  };
  for (const b of books) {
    const blob = await getBookFile(b.id);
    if (!blob) continue;
    out.books.push({ ...b, pdfBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())) });
  }
  return new Blob([JSON.stringify(out)], { type: "application/json" });
}

export async function readBackupFile(file: File) {
  if (file.size > MAX_BACKUP_BYTES * 1.1) {
    throw new Error("Arquivo de backup grande demais para ser lido neste dispositivo.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  const v = validateBackup(parsed);
  if (!v.ok) throw new Error(v.error);
  return v.data;
}

export async function applyBackup(data: BackupFile, mode: "mesclar" | "substituir") {
  const existing = mode === "substituir" ? [] : await listBooks();
  const { add, skip } = planMerge(existing, data.books);
  const addSet = new Set(add);
  const books = data.books.filter((b) => addSet.has(b.id));
  const files = books.map((b) => ({ id: b.id, blob: new Blob([base64ToBytes(b.pdfBase64) as BlobPart], { type: "application/pdf" }) }));
  const keep = new Set(mode === "substituir" ? books.map((b) => b.id) : [...existing.map((b) => b.id), ...add]);
  const bookmarks = data.bookmarks.filter((m) => keep.has(m.bookId));
  const notes = data.notes.filter((n) => keep.has(n.bookId)).map((n) => ({ ...n, text: String(n.text).slice(0, 10000) }));
  if (mode === "substituir") await clearAll();
  await putRaw({ books: books.map(sanitizeBook), files, bookmarks, notes });
  return { added: add.length, skipped: skip.length, bookmarks: bookmarks.length, notes: notes.length };
}
