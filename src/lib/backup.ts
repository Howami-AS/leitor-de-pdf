import type { BookMeta, Bookmark, Note } from "./db";

export const BACKUP_APP = "leitor-inteligente";
export const BACKUP_VERSION = 1;
/** Above this, building one JSON string in memory becomes unreliable on most devices. */
export const MAX_BACKUP_BYTES = 400 * 1024 * 1024;

export interface BackupBook extends BookMeta {
  pdfBase64: string;
}
export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  books: BackupBook[];
  bookmarks: Bookmark[];
  notes: Note[];
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export type ValidationResult = { ok: true; data: BackupFile } | { ok: false; error: string };

export function validateBackup(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "O arquivo não contém um backup válido." };
  const r = raw as Record<string, unknown>;
  if (r.app !== BACKUP_APP) return { ok: false, error: "Este arquivo não é um backup do Leitor Inteligente." };
  if (!isNum(r.version) || r.version > BACKUP_VERSION)
    return { ok: false, error: "Versão de backup não suportada. Atualize o aplicativo." };
  if (!Array.isArray(r.books) || !Array.isArray(r.bookmarks) || !Array.isArray(r.notes))
    return { ok: false, error: "Backup incompleto: faltam livros, marcadores ou notas." };
  for (const b of r.books as Record<string, unknown>[]) {
    if (!b || !isStr(b.id) || !isStr(b.title) || !isStr(b.pdfBase64) || !isStr(b.hash) || !isNum(b.size))
      return { ok: false, error: "Um dos livros do backup está corrompido." };
  }
  for (const m of r.bookmarks as Record<string, unknown>[]) {
    if (!m || !isStr(m.id) || !isStr(m.bookId) || !isNum(m.page)) return { ok: false, error: "Marcador inválido no backup." };
  }
  for (const n of r.notes as Record<string, unknown>[]) {
    if (!n || !isStr(n.id) || !isStr(n.bookId) || !isNum(n.page) || !isStr(n.text))
      return { ok: false, error: "Nota inválida no backup." };
  }
  return { ok: true, data: raw as BackupFile };
}

/** Normalizes a book's metadata coming from a backup (plain text only, safe defaults). */
export function sanitizeBook(b: BackupBook): BookMeta {
  return {
    id: b.id,
    title: String(b.title).slice(0, 160),
    fileName: String(b.fileName ?? b.title).slice(0, 200),
    size: b.size,
    pageCount: isNum(b.pageCount) ? b.pageCount : null,
    hash: b.hash,
    addedAt: isNum(b.addedAt) ? b.addedAt : Date.now(),
    lastOpenedAt: isNum(b.lastOpenedAt) ? b.lastOpenedAt : null,
    currentPage: isNum(b.currentPage) && b.currentPage >= 1 ? Math.floor(b.currentPage) : 1,
    favorite: b.favorite === true,
    hasText: typeof b.hasText === "boolean" ? b.hasText : null,
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Plans a merge: which backup books to add (skips ones already present by id or content hash). */
export function planMerge(existing: Pick<BookMeta, "id" | "hash">[], incoming: Pick<BookMeta, "id" | "hash">[]) {
  const ids = new Set(existing.map((b) => b.id));
  const hashes = new Set(existing.map((b) => b.hash));
  const add: string[] = [];
  const skip: string[] = [];
  for (const b of incoming) (ids.has(b.id) || hashes.has(b.hash) ? skip : add).push(b.id);
  return { add, skip };
}
