import { useCallback, useEffect, useRef, useState } from "react";
import { chunkText } from "./format";

export type TtsStatus = "idle" | "loading" | "speaking" | "paused" | "no-text" | "error";

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function usePtVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!ttsSupported()) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  const pt = voices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  pt.sort((a, b) => Number(b.lang.toLowerCase() === "pt-br") - Number(a.lang.toLowerCase() === "pt-br"));
  return { all: voices, pt };
}

interface Options {
  rate: number;
  voiceURI: string | null;
  getText: (page: number) => Promise<string>;
  onPageAdvance: (page: number) => void;
  pageCount: number;
  autoContinue: boolean;
}

export function useReadAloud(opts: Options) {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [readingPage, setReadingPage] = useState<number | null>(null);
  const [chunkInfo, setChunkInfo] = useState<{ i: number; n: number } | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const session = useRef(0);
  const { pt } = usePtVoices();
  const ptRef = useRef(pt);
  ptRef.current = pt;

  const stop = useCallback(() => {
    session.current++;
    if (ttsSupported()) window.speechSynthesis.cancel();
    setStatus("idle");
    setReadingPage(null);
    setChunkInfo(null);
  }, []);

  useEffect(() => stop, [stop]);

  const speakPage = useCallback(async (page: number, sid: number) => {
    const synth = window.speechSynthesis;
    setStatus("loading");
    setReadingPage(page);
    let text = "";
    try {
      text = await optsRef.current.getText(page);
    } catch {
      if (sid === session.current) setStatus("error");
      return;
    }
    if (sid !== session.current) return;
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      // Image-only page: skip ahead if continuing, otherwise report.
      const o = optsRef.current;
      if (o.autoContinue && page < o.pageCount) {
        o.onPageAdvance(page + 1);
        return speakPage(page + 1, sid);
      }
      setStatus("no-text");
      return;
    }
    const all = ptRef.current;
    for (let i = 0; i < chunks.length; i++) {
      if (sid !== session.current) return;
      setChunkInfo({ i: i + 1, n: chunks.length });
      setStatus((s) => (s === "paused" ? s : "speaking"));
      const ok = await new Promise<boolean>((resolve) => {
        const u = new SpeechSynthesisUtterance(chunks[i]);
        const o = optsRef.current;
        u.lang = "pt-BR";
        u.rate = o.rate;
        const voice = all.find((v) => v.voiceURI === o.voiceURI) ?? all[0];
        if (voice) u.voice = voice;
        u.onend = () => resolve(true);
        u.onerror = (e) => resolve(e.error === "interrupted" || e.error === "canceled" ? false : true);
        synth.speak(u);
      });
      if (!ok || sid !== session.current) return;
    }
    const o = optsRef.current;
    if (o.autoContinue && page < o.pageCount) {
      o.onPageAdvance(page + 1);
      return speakPage(page + 1, sid);
    }
    setStatus("idle");
    setReadingPage(null);
    setChunkInfo(null);
  }, []);

  const play = useCallback(
    (page: number) => {
      if (!ttsSupported()) return;
      session.current++;
      window.speechSynthesis.cancel();
      void speakPage(page, session.current);
    },
    [speakPage],
  );

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);
  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, []);

  return { status, readingPage, chunkInfo, play, pause, resume, stop, supported: ttsSupported() };
}
