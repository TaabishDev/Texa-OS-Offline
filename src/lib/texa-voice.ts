// Browser speech-recognition + TTS playback helpers (client-only).

export type SpeechRec = {
  start: () => void;
  stop: () => void;
};

type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export type PlaybackHandle = { pause: () => void };

function speakWithBrowserVoice(text: string, onEnd?: () => void): PlaybackHandle | null {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return null;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((v) => /female|samantha|zira|google uk english female/i.test(v.name)) ?? voices[0] ?? null;
  utterance.rate = 1;
  utterance.pitch = 1.08;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return { pause: () => window.speechSynthesis.cancel() };
}

// Play TTS audio from /api/tts, falling back to built-in browser speech.
export async function speak(text: string, onEnd?: () => void): Promise<PlaybackHandle | null> {
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return speakWithBrowserVoice(text, onEnd);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      onEnd?.();
    };
    await audio.play();
    return audio;
  } catch (err) {
    console.error("[TTS]", err);
    return speakWithBrowserVoice(text, onEnd);
  }
}

export const WAKE_WORDS = ["hey texa", "hey, texa", "hi texa", "texa"];
export function containsWakeWord(text: string): boolean {
  const t = text.toLowerCase().trim();
  return WAKE_WORDS.some((w) => t.includes(w));
}
export function stripWakeWord(text: string): string {
  let t = text.toLowerCase();
  for (const w of WAKE_WORDS) t = t.replace(w, "");
  return t.replace(/^[,.\s]+/, "").trim();
}
