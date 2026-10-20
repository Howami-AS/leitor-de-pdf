import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface Settings {
  theme: "claro" | "escuro";
  speechRate: number;
  voiceURI: string | null;
  uiScale: "normal" | "grande";
  autoContinue: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "claro",
  speechRate: 1,
  voiceURI: null,
  uiScale: "normal",
  autoContinue: true,
};

const KEY = "leitor-inteligente:settings";

const Ctx = createContext<{ settings: Settings; update: (p: Partial<Settings>) => void }>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt settings */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", settings.theme === "escuro");
    root.dataset.scale = settings.uiScale;
  }, [settings.theme, settings.uiScale]);

  const update = useCallback((p: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage full / blocked */
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
