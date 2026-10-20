import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface BookMeta {
  id: string;
  title: string;
  fileName: string;
  size: number;
  pageCount: number | null;
  hash: string;
  addedAt: number;
  lastOpenedAt: number | null;
  currentPage: number;
  favorite: boolean;
  hasText?: boolean | null;
}

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  createdAt: number;
}

export interface Note {
  id: string;
  bookId: string;
  page: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

interface LeitorDB extends DBSchema {
  books: { key: string; value: BookMeta; indexes: { by_hash: string } };
  files: { key: string; value: { id: string; blob: Blob } };
  bookmarks: { key: string; value: Bookmark; indexes: { by_book: string } };
  notes: { key: string; value: Note; indexes: { by_book: string } };
}

let dbPromise: Promise<IDBPDatabase<LeitorDB>> | null = null;

export function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador não oferece armazenamento local (IndexedDB)."));
  }
  if (!dbPromise) {
    dbPromise = openDB<LeitorDB>("leitor-inteligente", 1, {
      upgrade(db) {
        const books = db.createObjectStore("books", { keyPath: "id" });
        books.createIndex("by_hash", "hash");
        db.createObjectStore("files", { keyPath: "id" });
        db.createObjectStore("bookmarks", { keyPath: "id" }).createIndex("by_book", "bookId");
        db.createObjectStore("notes", { keyPath: "id" }).createIndex("by_book", "bookId");
      },
    });
  }
  return dbPromise;
}

export const LIBRARY_EVENT = "leitor:library-changed";
function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LIBRARY_EVENT));
}

export function newId() {
  return crypto.randomUUID();
}

export async function listBooks() {
  return (await getDB()).getAll("books");
}
export async function getBook(id: string) {
  return (await getDB()).get("books", id);
}
export async function getBookByHash(hash: string) {
  return (await getDB()).getFromIndex("books", "by_hash", hash);
}
export async function getBookFile(id: string) {
  return (await (await getDB()).get("files", id))?.blob;
}

export async function addBook(meta: BookMeta, blob: Blob) {
  const db = await getDB();
  const tx = db.transaction(["books", "files"], "readwrite");
  await Promise.all([tx.objectStore("books").put(meta), tx.objectStore("files").put({ id: meta.id, blob }), tx.done]);
  notify();
}

export async function updateBook(id: string, patch: Partial<BookMeta>) {
  const db = await getDB();
  const cur = await db.get("books", id);
  if (!cur) return;
  await db.put("books", { ...cur, ...patch, id });
  notify();
}

export async function removeBook(id: string) {
  const db = await getDB();
  const tx = db.transaction(["books", "files", "bookmarks", "notes"], "readwrite");
  await tx.objectStore("books").delete(id);
  await tx.objectStore("files").delete(id);
  for (const store of ["bookmarks", "notes"] as const) {
    const s = tx.objectStore(store);
    const keys = await s.index("by_book").getAllKeys(id);
    for (const k of keys) await s.delete(k);
  }
  await tx.done;
  notify();
}

export async function listBookmarks(bookId?: string) {
  const db = await getDB();
  const all = bookId ? await db.getAllFromIndex("bookmarks", "by_book", bookId) : await db.getAll("bookmarks");
  return all.sort((a, b) => a.page - b.page);
}
export async function toggleBookmark(bookId: string, page: number) {
  const db = await getDB();
  const existing = (await db.getAllFromIndex("bookmarks", "by_book", bookId)).find((b) => b.page === page);
  if (existing) await db.delete("bookmarks", existing.id);
  else await db.put("bookmarks", { id: newId(), bookId, page, createdAt: Date.now() });
  notify();
  return !existing;
}
export async function deleteBookmark(id: string) {
  await (await getDB()).delete("bookmarks", id);
  notify();
}

export async function listNotes(bookId?: string) {
  const db = await getDB();
  const all = bookId ? await db.getAllFromIndex("notes", "by_book", bookId) : await db.getAll("notes");
  return all.sort((a, b) => a.page - b.page || a.createdAt - b.createdAt);
}
export async function saveNote(note: Note) {
  await (await getDB()).put("notes", note);
  notify();
}
export async function deleteNote(id: string) {
  await (await getDB()).delete("notes", id);
  notify();
}

export async function clearAll() {
  const db = await getDB();
  const tx = db.transaction(["books", "files", "bookmarks", "notes"], "readwrite");
  await Promise.all([
    tx.objectStore("books").clear(),
    tx.objectStore("files").clear(),
    tx.objectStore("bookmarks").clear(),
    tx.objectStore("notes").clear(),
    tx.done,
  ]);
  notify();
}

export async function putRaw(data: { books: BookMeta[]; files: { id: string; blob: Blob }[]; bookmarks: Bookmark[]; notes: Note[] }) {
  const db = await getDB();
  const tx = db.transaction(["books", "files", "bookmarks", "notes"], "readwrite");
  for (const b of data.books) await tx.objectStore("books").put(b);
  for (const f of data.files) await tx.objectStore("files").put(f);
  for (const b of data.bookmarks) await tx.objectStore("bookmarks").put(b);
  for (const n of data.notes) await tx.objectStore("notes").put(n);
  await tx.done;
  notify();
}
