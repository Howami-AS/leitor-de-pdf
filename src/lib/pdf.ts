// Browser-only: PDF.js is bundled locally (no CDN) and loaded lazily.
type PdfJs = typeof import("pdfjs-dist");
let libPromise: Promise<PdfJs> | null = null;

export function loadPdfJs(): Promise<PdfJs> {
  if (!libPromise) {
    libPromise = (async () => {
      const lib = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    })();
  }
  return libPromise;
}

export async function openPdf(data: ArrayBuffer) {
  const lib = await loadPdfJs();
  return lib.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
}

export type PdfDoc = Awaited<ReturnType<typeof openPdf>>;

export async function extractPageText(doc: PdfDoc, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  let text = "";
  for (const item of content.items) {
    if ("str" in item) {
      text += item.str;
      text += item.hasEOL ? "\n" : item.str.endsWith(" ") ? "" : " ";
    }
  }
  // Join hyphenated line breaks: "pala-\nvra" -> "palavra"
  return text.replace(/(\p{L})-\n(\p{L})/gu, "$1$2").replace(/[ \t]+/g, " ").trim();
}

export function pdfErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "PasswordException") return "Este PDF é protegido por senha e não pode ser aberto.";
  if (name === "InvalidPDFException") return "O arquivo não é um PDF válido ou está corrompido.";
  return "Não foi possível abrir este PDF. Verifique se o arquivo está íntegro.";
}
