# Leitor de PDF

Build a real, polished, functional Portuguese-Brazilian PDF reading app named “Leitor Inteligente”, based on the user's existing public GitHub project https://github.com/Howami-AS/LeitorDePDF, but as a new Lovable project (do not change the GitHub repository). This is a usable app, not a static mockup. Main goal: read personal PDF books and listen to their text without needing to look at the screen. No AI is required for this version; do not simulate AI features or show fake results.

VISUAL DESIGN: exceptionally polished and calm reading-focused interface; mobile-first and responsive for Android, iPhone/iPad, Windows laptop/desktop. Warm paper/light theme and elegant dark theme, readable typography, generous spacing, subtle colors, accessible contrast, clear icons, modern library cards, empty states, loading states, error feedback. On mobile use compact bottom navigation or similarly ergonomic controls; desktop gets a tidy sidebar. Entire UI in Brazilian Portuguese. Footer must say exactly “©️ Alisson Salvador 2026”.

FUNCTIONAL REQUIREMENTS:
1) Library/home: import PDFs from device, show title, file size/page count where available, last-read status and reading progress; search/filter library; open and remove books with confirmation. Keep actual PDF binary and metadata in IndexedDB so local books persist across refresh/relaunch; handle duplicate imports and invalid PDFs gracefully. Never upload book contents to cloud by default.
2) PDF reader: actually render PDFs using PDF.js or an appropriate maintained PDF library; page previous/next and page number navigation, zoom controls, fit width, fullscreen if supported, mobile-friendly swipe/scroll, return to library, persist current page/progress and restore position when reopened. Handle loading/error states.
3) Read aloud: extract actual text from the selected PDF page/reading range using PDF.js getTextContent and use browser speechSynthesis in pt-BR where available. Controls play/pause/resume/stop, speed selection, next page/continue across pages, clear status and graceful unsupported-browser handling. If a PDF is scanned/image-only, explain that OCR is not included yet instead of pretending it can read the text. Do not claim background audio support where the browser doesn't provide it.
4) Bookmarks and notes: allow saving/removing page bookmarks per book and simple personal notes linked to a book/page, persisted in IndexedDB; navigate to bookmarked page; implement a real favorites view.
5) Real backup/restore: export actual metadata, notes, bookmarks, and PDF blobs as a downloadable versioned JSON backup (use base64 or another reliable serialization); import with validation and clear merge/replace choice and confirmation; do not merely show success alerts. Handle large-file limits with a helpful error.
6) Settings: persistent theme toggle, text/read-aloud speed preference, font/interface preference where relevant, storage guidance, and an “Instalar aplicativo” button. This exact button label must be present. Trigger native beforeinstallprompt when available and otherwise show device/browser-specific instructions, including iOS Safari. Do not use a plain download button as installation.
7) PWA/offline: stable unique manifest id for this app; matching start_url/scope; actual existing 192x192 and 512x512 icons; valid service worker; cache app shell and local same-origin assets; do not break book storage on updates. Keep the essential interface available offline after first load where technically possible. PDF.js currently often comes from a CDN; avoid a hard dependency on network by bundling/installing the library locally if the Lovable stack supports it. Do not cache private PDFs to Cache API; user-owned PDFs remain in IndexedDB. HTTPS hosted deployment assumed.
8) Accessibility and quality: keyboard support, semantic buttons/labels, focus states, useful error messages, no dead buttons, no fake placeholder functionality, no silent failure. Protect against XSS when displaying imported filenames/notes. Add tests for key data helpers if supported.

IMPLEMENTATION GUIDANCE: Use the default Lovable stack but prioritize a simple robust app. Do not introduce authentication/cloud database unless essential; personal library should be local-first and private. No paid APIs, no AI API keys, no accounts required. Do not claim the build/tests pass unless actually run. Work in small coherent steps and verify app compiles and core flows. Keep any future AI summary/chat/flashcard tabs out of this version or clearly mark them as not included; preferred to omit them for a clean focused product.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/275ba67d-0154-4d09-b74e-d7b613f2cbdb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
