export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
}

/** Progress 0–100 from current page (1-based) and total pages. */
export function readingProgress(currentPage: number, pageCount: number | null): number {
  if (!pageCount || pageCount < 1) return 0;
  const p = Math.min(Math.max(currentPage, 1), pageCount);
  if (pageCount === 1) return 100;
  return Math.round(((p - 1) / (pageCount - 1)) * 100);
}

/** Turns a file name into a readable, length-limited title (plain text, no markup). */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  return (base || "Livro sem título").slice(0, 160);
}

export function clampPage(page: number, pageCount: number | null): number {
  const max = pageCount && pageCount > 0 ? pageCount : 1;
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.round(page), 1), max);
}

export function relativeDate(ts: number | null): string {
  if (!ts) return "Ainda não aberto";
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < 60000) return "Agora mesmo";
  if (diff < day) return "Hoje";
  if (diff < 2 * day) return "Ontem";
  if (diff < 30 * day) return `Há ${Math.floor(diff / day)} dias`;
  return new Date(ts).toLocaleDateString("pt-BR");
}

/** Splits text into speakable chunks (browsers cut very long utterances). */
export function chunkText(text: string, max = 220): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?;:]+[.!?;:]*\s*/g) ?? [clean];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = "";
    }
    if (s.length > max) {
      const words = s.split(" ");
      for (const w of words) {
        if ((cur + " " + w).length > max && cur) {
          out.push(cur.trim());
          cur = "";
        }
        cur += (cur ? " " : "") + w;
      }
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isPdfHeader(bytes: Uint8Array): boolean {
  // "%PDF-" may be preceded by a few junk bytes; check first 1024
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  return head.includes("%PDF-");
}
