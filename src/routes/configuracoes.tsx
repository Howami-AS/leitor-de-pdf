import { createFileRoute } from "@tanstack/react-router";
import { Download, HardDrive, Loader2, Moon, Smartphone, Sun, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings } from "@/lib/settings";
import { usePtVoices, ttsSupported } from "@/lib/tts";
import { applyBackup, exportBackup, readBackupFile } from "@/lib/library";
import type { BackupFile } from "@/lib/backup";
import { formatBytes } from "@/lib/format";
import { canPromptInstall, detectPlatform, isStandalone, onInstallAvailabilityChange, promptInstall, type Platform } from "@/lib/pwa";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Leitor Inteligente" },
      { name: "description", content: "Tema, leitura em voz alta, backup e instalação do aplicativo." },
      { property: "og:title", content: "Configurações — Leitor Inteligente" },
      { property: "og:description", content: "Tema, voz, backup e instalação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border bg-card p-5 shadow-card md:p-6">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

const INSTRUCTIONS: Record<Platform, string> = {
  ios: "No Safari, toque no botão Compartilhar (quadrado com seta para cima) e escolha “Adicionar à Tela de Início”.",
  android: "No Chrome, abra o menu ⋮ e toque em “Instalar app” ou “Adicionar à tela inicial”.",
  "desktop-chromium": "No Chrome ou Edge, clique no ícone de instalação na barra de endereço ou no menu ⋮ → “Instalar Leitor Inteligente”.",
  "desktop-safari": "No Safari (macOS Sonoma ou superior), use o menu Arquivo → “Adicionar ao Dock”.",
  "desktop-firefox": "O Firefox para computador não instala aplicativos web. Use Chrome ou Edge para instalar.",
  other: "Abra o menu do navegador e procure “Instalar” ou “Adicionar à tela inicial”.",
};

function SettingsPage() {
  const { settings, update } = useSettings();
  const { pt } = usePtVoices();
  const [canInstall, setCanInstall] = useState(false);
  const [installHelp, setInstallHelp] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [mode, setMode] = useState<"mesclar" | "substituir">("mesclar");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanInstall(canPromptInstall());
    const off = onInstallAvailabilityChange(() => setCanInstall(canPromptInstall()));
    void refreshStorage();
    return () => void off();
  }, []);

  async function refreshStorage() {
    if (!navigator.storage?.estimate) return;
    const e = await navigator.storage.estimate();
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    setStorage({ usage: e.usage ?? 0, quota: e.quota ?? 0, persisted });
  }

  async function install() {
    if (isStandalone()) return setInstallHelp("O aplicativo já está instalado e aberto como app.");
    if (canInstall) {
      const r = await promptInstall();
      if (r === "accepted") toast.success("Aplicativo instalado!");
      return;
    }
    setInstallHelp(INSTRUCTIONS[detectPlatform()]);
  }

  async function doExport() {
    setBusy("export");
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leitor-inteligente-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`Backup gerado (${formatBytes(blob.size)}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar backup.");
    }
    setBusy(null);
  }

  async function pickBackup(f: File | undefined) {
    if (!f) return;
    setBusy("import");
    try {
      setPending(await readBackupFile(f));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup inválido.");
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy("import");
    try {
      const r = await applyBackup(pending, mode);
      toast.success(`Restaurado: ${r.added} livro(s), ${r.bookmarks} marcador(es), ${r.notes} nota(s).${r.skipped ? ` ${r.skipped} já existiam.` : ""}`);
      setPending(null);
      void refreshStorage();
    } catch (e) {
      toast.error((e as { name?: string })?.name === "QuotaExceededError" ? "Sem espaço no dispositivo para restaurar." : "Falha ao restaurar o backup.");
    }
    setBusy(null);
  }

  return (
    <AppShell>
      <PageHeader title="Configurações" subtitle="Preferências salvas neste dispositivo." />
      <div className="max-w-3xl">
        <Section title="Aparência">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tema">
            <Button variant={settings.theme === "claro" ? "default" : "outline"} aria-pressed={settings.theme === "claro"} onClick={() => update({ theme: "claro" })}><Sun /> Papel claro</Button>
            <Button variant={settings.theme === "escuro" ? "default" : "outline"} aria-pressed={settings.theme === "escuro"} onClick={() => update({ theme: "escuro" })}><Moon /> Escuro</Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="scale" className="text-sm">Texto da interface ampliado</label>
            <Switch id="scale" checked={settings.uiScale === "grande"} onCheckedChange={(v) => update({ uiScale: v ? "grande" : "normal" })} />
          </div>
        </Section>

        <Section title="Leitura em voz alta">
          {!ttsSupported() && <p role="alert" className="text-sm text-destructive">Este navegador não oferece síntese de voz.</p>}
          <div>
            <label htmlFor="rate" className="mb-2 block text-sm">Velocidade padrão: <strong>{settings.speechRate.toFixed(2).replace(".", ",")}×</strong></label>
            <input id="rate" type="range" min={0.5} max={2} step={0.25} value={settings.speechRate} onChange={(e) => update({ speechRate: Number(e.target.value) })} className="w-full accent-primary" />
          </div>
          <div>
            <label htmlFor="voice" className="mb-2 block text-sm">Voz</label>
            <select id="voice" className="h-11 w-full rounded-md border bg-background px-3" value={settings.voiceURI ?? ""} onChange={(e) => update({ voiceURI: e.target.value || null })}>
              <option value="">Automática (pt-BR)</option>
              {pt.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
            {ttsSupported() && pt.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Nenhuma voz em português encontrada; o navegador usará a voz padrão.</p>}
          </div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="auto" className="text-sm">Continuar automaticamente na próxima página</label>
            <Switch id="auto" checked={settings.autoContinue} onCheckedChange={(v) => update({ autoContinue: v })} />
          </div>
        </Section>

        <Section title="Backup">
          <p className="text-sm text-muted-foreground">O backup inclui livros (PDFs), marcadores, notas e progresso em um arquivo JSON.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={doExport} disabled={busy !== null}>{busy === "export" ? <Loader2 className="animate-spin" /> : <Download />} Exportar backup</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => pickBackup(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy !== null}>{busy === "import" ? <Loader2 className="animate-spin" /> : <Upload />} Restaurar backup</Button>
          </div>
        </Section>

        <Section title="Armazenamento">
          <div className="flex items-start gap-3 text-sm">
            <HardDrive className="mt-0.5 size-5 text-primary" aria-hidden />
            <div className="space-y-1">
              {storage ? <p>Em uso: <strong>{formatBytes(storage.usage)}</strong> de cerca de {formatBytes(storage.quota)}.</p> : <p>Estimativa de espaço indisponível neste navegador.</p>}
              <p className="text-muted-foreground">Limpar os dados do site no navegador apaga seus livros. Faça backups regulares.</p>
            </div>
          </div>
          {storage && !storage.persisted && navigator.storage?.persist && (
            <Button variant="outline" onClick={async () => { const ok = await navigator.storage.persist(); toast[ok ? "success" : "info"](ok ? "Armazenamento protegido." : "O navegador não concedeu proteção agora."); void refreshStorage(); }}>
              Proteger armazenamento
            </Button>
          )}
        </Section>

        <Section title="Aplicativo">
          <p className="text-sm text-muted-foreground">Instale para abrir como app e usar a interface mesmo sem internet.</p>
          <Button size="lg" onClick={install}><Smartphone /> Instalar aplicativo</Button>
          {installHelp && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{installHelp}</p>}
        </Section>
      </div>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar backup</DialogTitle>
            <DialogDescription>
              {pending && `${pending.books.length} livro(s), ${pending.bookmarks.length} marcador(es) e ${pending.notes.length} nota(s), de ${new Date(pending.exportedAt).toLocaleString("pt-BR")}.`}
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Como restaurar?</legend>
            <label className="flex gap-2 text-sm"><input type="radio" name="mode" checked={mode === "mesclar"} onChange={() => setMode("mesclar")} /> Mesclar — manter a biblioteca atual e adicionar os livros novos</label>
            <label className="flex gap-2 text-sm"><input type="radio" name="mode" checked={mode === "substituir"} onChange={() => setMode("substituir")} /> Substituir — apagar tudo e usar apenas o backup</label>
          </fieldset>
          {mode === "substituir" && <p role="alert" className="text-sm text-destructive">Atenção: todos os livros, notas e marcadores atuais serão apagados.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancelar</Button>
            <Button variant={mode === "substituir" ? "destructive" : "default"} onClick={confirmImport} disabled={busy !== null}>
              {busy === "import" && <Loader2 className="animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
