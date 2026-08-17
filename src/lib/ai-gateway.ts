// Texa model auto-routing
export function pickModelForTask(model: string, task?: string): string {
  if (model && model !== "texa-auto") return model;
  if (!task) return "google/gemini-3-flash-preview";
  const t = task.toLowerCase();
  if (/code|function|bug|typescript|python|sql/.test(t)) return "openai/gpt-5-mini";
  if (/math|calculate|solve|equation|derivative|integral/.test(t)) return "openai/gpt-5";
  if (/research|paper|analy[sz]e|summar/.test(t)) return "google/gemini-2.5-pro";
  return "google/gemini-3-flash-preview";
}

export const AVAILABLE_MODELS = [
  { id: "texa-auto", label: "Texa Auto", description: "Smart routing", provider: "Texa" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Fast & balanced", provider: "Google" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Deep reasoning", provider: "Google" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Quick replies", provider: "Google" },
  { id: "openai/gpt-5", label: "GPT-5", description: "All-rounder", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Fast & smart", provider: "OpenAI" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", description: "Ultra fast", provider: "OpenAI" },
] as const;
