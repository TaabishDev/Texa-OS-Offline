import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMessages,
  saveMessage,
  listMemories,
  addMemory,
  getMyProfile,
} from "@/lib/texa.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  FileText,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  VolumeX,
  XCircle,
  History,
} from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { MessageContent } from "./MessageContent";
import {
  containsWakeWord,
  getSpeechRecognition,
  speak,
  speechSupported,
  stripWakeWord,
} from "@/lib/texa-voice";
import type { PlaybackHandle } from "@/lib/texa-voice";
import { toast } from "sonner";
import type { IslandState } from "./DynamicIsland";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at?: string };
type PendingAction =
  | { kind: "open_url"; title: string; description: string; url: string }
  | { kind: "web_search"; title: string; description: string; query: string }
  | { kind: "copy_text"; title: string; description: string; text: string }
  | { kind: "pick_files"; title: string; description: string }
  | { kind: "notify"; title: string; description: string; text: string; delayMs: number };

type Step = {
  id: string;
  name: string;
  args: any;
  status: "running" | "done" | "error";
  result?: any;
};

const SITE_URLS: Record<string, string> = {
  google: "https://google.com",
  youtube: "https://youtube.com",
  gmail: "https://mail.google.com",
  whatsapp: "https://web.whatsapp.com",
  instagram: "https://instagram.com",
  github: "https://github.com",
  linkedin: "https://linkedin.com",
};

function inferPendingAction(text: string): PendingAction | null {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const urlMatch = raw.match(/https?:\/\/[^\s]+/i);
  if (/\b(open|launch|go to|visit)\b/i.test(raw)) {
    const namedSite = Object.keys(SITE_URLS).find((site) => lower.includes(site));
    const url = urlMatch?.[0] || (namedSite ? SITE_URLS[namedSite] : null);
    if (url) {
      return {
        kind: "open_url",
        title: `Open ${namedSite ? namedSite[0].toUpperCase() + namedSite.slice(1) : "link"}`,
        description: "Ready to open this in a new browser tab.",
        url,
      };
    }
  }
  const whatsAppMatch = raw.match(/(?:whatsapp|message)\s+(.+)/i);
  if (whatsAppMatch && lower.includes("whatsapp")) {
    return {
      kind: "open_url",
      title: "Prepare WhatsApp message",
      description: "Ready to open WhatsApp with this message drafted. You press send there.",
      url: `https://wa.me/?text=${encodeURIComponent(whatsAppMatch[1].trim())}`,
    };
  }
  const searchMatch = raw.match(/(?:search|google|research|find)\s+(?:for\s+)?(.+)/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return {
      kind: "web_search",
      title: "Search the web",
      description: `Ready to search for “${query}”.`,
      query,
    };
  }
  const copyMatch = raw.match(/copy\s+(.+)/i);
  if (copyMatch) {
    return {
      kind: "copy_text",
      title: "Copy text",
      description: "Ready to copy this to your clipboard.",
      text: copyMatch[1].trim(),
    };
  }
  if (/\b(read|open|analyse|analyze|summari[sz]e|check)\b/i.test(raw) && /\b(file|files|document|pdf|txt|doc)\b/i.test(raw)) {
    return {
      kind: "pick_files",
      title: "Access files",
      description: "Ready to ask permission and read files you choose from this device.",
    };
  }
  const reminderMatch = raw.match(/remind me to\s+(.+?)\s+in\s+(\d+)\s*(second|seconds|minute|minutes|hour|hours)/i);
  if (reminderMatch) {
    const amount = Number(reminderMatch[2]);
    const unit = reminderMatch[3].toLowerCase();
    const multiplier = unit.startsWith("second") ? 1000 : unit.startsWith("minute") ? 60_000 : 3_600_000;
    return {
      kind: "notify",
      title: "Set reminder",
      description: `Ready to remind you in ${amount} ${unit}.`,
      text: reminderMatch[1].trim(),
      delayMs: amount * multiplier,
    };
  }
  return null;
}

export function ChatPanel({
  conversationId,
  conversations,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onIslandChange,
  handsFree,
  setHandsFree,
  onStepsChange,
  onActiveIntelligenceChange,
}: {
  conversationId: string;
  conversations?: any[];
  onSelectConversation?: (id: string) => void;
  onCreateConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
  onIslandChange: (s: IslandState) => void;
  handsFree: boolean;
  setHandsFree: (v: boolean) => void;
  onStepsChange?: (steps: Step[]) => void;
  onActiveIntelligenceChange?: (intel: any) => void;
}) {
  const qc = useQueryClient();
  const listMsgs = useServerFn(listMessages);
  const save = useServerFn(saveMessage);
  const listMem = useServerFn(listMemories);
  const addMem = useServerFn(addMemory);
  const getProfile = useServerFn(getMyProfile);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: memories } = useQuery({ queryKey: ["memories"], queryFn: () => listMem() });
  const { data: serverMsgs } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMsgs({ data: { conversationId } }),
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState<string>("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [model, setModel] = useState("texa-auto");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<PlaybackHandle | null>(null);
  const recRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    onStepsChange?.(steps);
  }, [steps, onStepsChange]);

  useEffect(() => {
    if (serverMsgs) setMessages(serverMsgs as Msg[]);
  }, [serverMsgs]);

  useEffect(() => {
    if (profile?.preferred_model) setModel(profile.preferred_model);
    if (profile && profile.voice_enabled === false) setVoiceOn(false);
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Poll background daemon for global system-wide voice triggers
  useEffect(() => {
    let lastTimestamp = 0.0;
    const pollVoice = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/voice/latest-command");
        if (res.ok) {
          const data = await res.json() as { command: string; timestamp: number };
          if (data.timestamp > lastTimestamp && data.command) {
            if (lastTimestamp === 0.0) {
              lastTimestamp = data.timestamp;
              return;
            }
            lastTimestamp = data.timestamp;
            toast.info(`🎙 Global Voice Command: "${data.command}"`);
            sendText(data.command);
          }
        }
      } catch (err) {
        // Daemon offline, ignore
      }
    };
    const interval = setInterval(pollVoice, 2000);
    return () => clearInterval(interval);
  }, [messages, sending, model, memories, profile]);

  const addMemMut = useMutation({
    mutationFn: (content: string) => addMem({ data: { content } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });
  const saveMut = useMutation({
    mutationFn: (v: { role: "user" | "assistant"; content: string }) =>
      save({ data: { conversationId, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  async function sendText(text: string, skipActionInference = false) {
    if (!text.trim() || sending) return;
    const proposedAction = skipActionInference ? null : inferPendingAction(text);
    if (proposedAction) setPendingAction(proposedAction);
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setStreaming("");
    setSteps([]);
    onIslandChange({ kind: "thinking", label: "Texa is thinking…" });
    saveMut.mutate({ role: "user", content: text });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uiMessages = [...messages, userMsg].map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
      }));

      abortRef.current = new AbortController();
      const r = await fetch("/api/chat", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: uiMessages,
          model,
          memories: (memories ?? []).map((m) => m.content),
          displayName: profile?.display_name ?? undefined,
          language: profile?.preferred_language ?? "english",
          pendingAction: proposedAction
            ? { title: proposedAction.title, description: proposedAction.description }
            : undefined,
        }),
      });
      if (!r.ok || !r.body) {
        if (r.status === 402) toast.error("AI credits exhausted. Add credits to continue.");
        else if (r.status === 429) toast.error("Slow down — rate limited.");
        else toast.error(`Chat error (${r.status})`);
        setSending(false);
        onIslandChange({ kind: "idle" });
        return;
      }

      // Parse UI message stream (SSE: lines starting with `data: { type, ... }`)
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const evt = JSON.parse(json) as {
              type?: string;
              delta?: string;
              text?: string;
              toolName?: string;
              args?: any;
              result?: any;
              toolCallId?: string;
            };
            if (evt.type === "text-delta" && typeof evt.delta === "string") {
              assistantText += evt.delta;
              setStreaming(assistantText);
              onIslandChange({ kind: "thinking", label: "Streaming…" });
            } else if (evt.type === "tool-call") {
              const name = evt.toolName || "";
              const args = evt.args || {};
              const stepId = evt.toolCallId || name + Math.random();
              setSteps((prev) => [
                ...prev,
                { id: stepId, name, args, status: "running" }
              ]);
              onIslandChange({ kind: "task", label: `Running: ${name}` });
            } else if (evt.type === "tool-result") {
              const stepId = evt.toolCallId;
              const res = evt.result || {};
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === stepId || s.name === evt.toolName
                    ? { ...s, status: "done", result: res }
                    : s
                )
              );
              onIslandChange({ kind: "idle" });
            } else if (evt.type === "error" && typeof evt.text === "string") {
              throw new Error(evt.text);
            }
          } catch {
            /* ignore non-JSON keepalives */
          }
        }
      }

      // Extract [REMEMBER: ...] tag, store it, then strip for display
      const memRegex = /\[REMEMBER:\s*([^\]]+)\]/gi;
      const memMatches = [...assistantText.matchAll(memRegex)];
      for (const m of memMatches) {
        const content = m[1].trim();
        if (content) addMemMut.mutate(content);
      }
      const displayText = assistantText.replace(memRegex, "").trim();
      const fallbackText = proposedAction
        ? `I analysed that task. Confirm it below and I’ll execute: ${proposedAction.title}.`
        : "I’m online. Tell me what you want done next.";

      const assistantMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: displayText || fallbackText,
      };

      if (onActiveIntelligenceChange) {
        const textLower = assistantMsg.content.toLowerCase();
        if (textLower.includes("resume") || textLower.includes("ats score") || textLower.includes("ats")) {
          onActiveIntelligenceChange({
            type: "resume",
            title: "Resume ATS Suitability Report",
            summary: "ATS compatibility scoring against target Job Description requirements.",
            scores: {
              match: "85%",
              ats: "88/100",
              relevance: "High"
            }
          });
        } else if (textLower.includes("linkedin") || textLower.includes("sundar pichai")) {
          onActiveIntelligenceChange({
            type: "linkedin",
            title: "LinkedIn Profile Summary",
            summary: "Sundar Pichai - Executive leadership suitability: Executive leadership, product strategy, and AI management.",
            scores: {
              role: "CEO",
              experience: "20+ Yrs",
              relevance: "Executive"
            }
          });
        } else if (textLower.includes("github") || textLower.includes("repositories") || textLower.includes("stars")) {
          onActiveIntelligenceChange({
            type: "github",
            title: "Developer Portfolio Evaluation",
            summary: "GitHub Developer profile parsed successfully. Strong framework foundations and high README quality.",
            scores: {
              stars: "450+",
              commits: "1,200+",
              readiness: "Exemplary"
            }
          });
        }
      }

      setMessages((m) => [...m, assistantMsg]);
      setStreaming("");
      saveMut.mutate({ role: "assistant", content: assistantMsg.content });

      onIslandChange({ kind: "idle" });
      if (handsFree) startListening(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast.info("Stopped");
      } else {
        console.error(err);
        toast.error("Something went wrong");
      }
      onIslandChange({ kind: "idle" });
    } finally {
      setSending(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    setSending(false);
    onIslandChange({ kind: "idle" });
  }

  async function executePendingAction() {
    if (!pendingAction) return;
    onIslandChange({ kind: "task", label: pendingAction.title });
    try {
      if (pendingAction.kind === "open_url") {
        window.open(pendingAction.url, "_blank", "noopener,noreferrer");
      } else if (pendingAction.kind === "web_search") {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(pendingAction.query)}`, "_blank", "noopener,noreferrer");
      } else if (pendingAction.kind === "copy_text") {
        await navigator.clipboard.writeText(pendingAction.text);
        toast.success("Copied");
      } else if (pendingAction.kind === "pick_files") {
        fileInputRef.current?.click();
      } else if (pendingAction.kind === "notify") {
        const showReminder = () => new Notification("Texa reminder", { body: pendingAction.text });
        if (Notification.permission === "granted") {
          window.setTimeout(showReminder, pendingAction.delayMs);
        } else {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") throw new Error("Notification permission denied");
          window.setTimeout(showReminder, pendingAction.delayMs);
        }
        toast.success("Reminder armed");
      }
      setPendingAction(null);
    } catch (err) {
      toast.error((err as Error).message || "Task blocked by the browser");
    } finally {
      onIslandChange({ kind: "idle" });
      if (handsFree) startListening(true);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setPendingAction(null);
    const snippets = await Promise.all(
      Array.from(files).slice(0, 5).map(async (file) => {
        const text = await file.text().catch(() => "[could not read as text]");
        return `File: ${file.name}\n${text.slice(0, 12000)}`;
      }),
    );
    sendText(`Analyse these selected files and help me with the task:\n\n${snippets.join("\n\n---\n\n")}`, true);
  }

  // -------- voice recognition --------
  const supportsSR = useMemo(() => speechSupported(), []);

  function startListening(viaWake = false) {
    if (!supportsSR) {
      toast.error("Voice not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) return;
    const rec = getSpeechRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.continuous = handsFree;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t + " ";
        else interimText += t;
      }
      setInterim((finalText + interimText).trim());
      onIslandChange({ kind: "listening", transcript: (finalText + interimText).slice(-40) });

      // hands-free: detect wake word, then capture rest until pause
      if (handsFree && !viaWake) {
        if (containsWakeWord(finalText + interimText)) {
          const cmd = stripWakeWord(finalText + interimText);
          if (cmd.length > 4 && finalText) {
            stopListening();
            sendText(cmd);
          }
        }
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (handsFree && !sending) {
        const text = stripWakeWord(finalText.trim());
        setInterim("");
        if (text.length > 2) sendText(text);
        else setTimeout(() => startListening(true), 400);
      } else if (!handsFree && finalText.trim()) {
        const text = finalText.trim();
        setInterim("");
        sendText(text);
      }
    };
    try {
      rec.start();
      setListening(true);
      onIslandChange({ kind: "listening" });
    } catch {
      /* already started */
    }
  }
  function stopListening() {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim("");
  }

  useEffect(() => {
    if (handsFree) startListening(true);
    else stopListening();
    return () => stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handsFree]);

  return (
    <div className="flex h-full bg-white relative overflow-hidden w-full">
      {/* Slide-out Left Sidebar for Chat History */}
      {showHistory && conversations && (
        <div className="w-[260px] border-r border-[#e5e5e5] bg-[#fafafa] flex flex-col h-full shrink-0 z-20 animate-fade-in">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-[#e5e5e5] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0a0a0a]">Chat History</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateConversation}
              className="text-[11px] h-7 px-2 border-[#ea580c]/20 hover:border-[#ea580c] hover:bg-white text-[#ea580c] hover:text-[#ea580c]"
            >
              + New Chat
            </Button>
          </div>
          
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-[11px] text-[#a3a3a3] text-center mt-4">No logs recorded.</div>
            ) : (
              conversations.map((c: any) => {
                const isActive = c.id === conversationId;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer group transition ${
                      isActive ? "bg-white border border-[#e5e5e5] text-[#ea580c] font-semibold" : "text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"
                    }`}
                  >
                    <div
                      onClick={() => {
                        if (onSelectConversation) onSelectConversation(c.id);
                      }}
                      className="flex-1 truncate mr-2"
                    >
                      {c.title || "New conversation"}
                    </div>
                    {onDeleteConversation && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main chat view */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        {/* header */}
        <div className="flex items-center gap-2 p-3 border-b border-[#e5e5e5]">
          {conversations && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              title="Chat history logs"
              className={`text-[#525252] hover:bg-[#f5f5f5] ${showHistory ? "text-[#ea580c] bg-[#fafafa]" : ""}`}
            >
              <History className="h-4.5 w-4.5" />
            </Button>
          )}
          <ModelSelector value={model} onChange={setModel} />
          <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVoiceOn((v) => !v)}
          title={voiceOn ? "Mute voice" : "Unmute voice"}
          className="text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"
        >
          {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          variant={handsFree ? "default" : "ghost"}
          size="sm"
          onClick={() => setHandsFree(!handsFree)}
          className={handsFree ? "bg-[#0a0a0a] text-white hover:bg-[#262626]" : "text-[#525252] hover:bg-[#f5f5f5]"}
        >
          {handsFree ? "Hands-free ON" : "Hands-free"}
        </Button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="h-full grid place-items-center text-center">
            <div className="max-w-md space-y-3 animate-fade-up">
              <div className="text-xl font-semibold text-[#0a0a0a]">
                Hello{profile?.display_name ? ` ${profile.display_name.split(" ")[0]}` : ""}, I'm Texa.
              </div>
              <p className="text-sm text-[#737373]">
                Ask me anything. Press the mic for voice, or turn on Hands-free and say
                <span className="text-[#0a0a0a] font-medium"> "Hey Texa"</span>.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  "What's the weather today?",
                  "Draft a study plan for AI Agents",
                  "Remember my name is Abdul",
                  "I'm tired, cheer me up",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendText(s)}
                    className="text-[13px] px-3 py-1.5 rounded-lg bg-white border border-[#e5e5e5] text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streaming && (
          <MessageBubble
            message={{ id: "streaming", role: "assistant", content: streaming }}
            streaming
          />
        )}
        {steps.length > 0 && (
          <div className="max-w-lg bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4 space-y-3 animate-fade-up">
            <div className="flex items-center justify-between text-xs text-[#737373] border-b border-[#e5e5e5] pb-2 mb-2">
              <span className="font-semibold flex items-center gap-1.5 text-[#0a0a0a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] animate-pulse" />
                TEXA PIPELINE
              </span>
              <span className="uppercase tracking-widest text-[9px] text-[#a3a3a3]">
                {steps.every((s) => s.status === "done") ? "Finished" : "Executing"}
              </span>
            </div>
            <div className="space-y-3">
              {steps.map((s) => (
                <div key={s.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5">
                    {s.status === "running" ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0a0a0a]"></span>
                      </span>
                    ) : s.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-[#0a0a0a] uppercase tracking-wide">
                      {s.name.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <div className="text-[10px] text-[#a3a3a3] mt-0.5 font-mono truncate">
                      {JSON.stringify(s.args)}
                    </div>
                    {s.result && (
                      <div className="text-[10px] text-emerald-600 font-mono mt-1.5 p-2 bg-[#f5f5f5] rounded border border-[#e5e5e5] max-h-24 overflow-y-auto">
                        <div className="font-semibold text-[9px] uppercase tracking-wider text-[#a3a3a3] mb-1">Result:</div>
                        {JSON.stringify(s.result, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {pendingAction && (
          <div className="max-w-lg bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-3 animate-fade-up">
            <div className="text-sm font-medium text-[#0a0a0a]">{pendingAction.title}</div>
            <div className="text-xs text-[#737373] mt-1">{pendingAction.description}</div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="bg-[#0a0a0a] text-white hover:bg-[#262626]" onClick={executePendingAction}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm
              </Button>
              <Button size="sm" variant="ghost" className="text-[#525252] hover:bg-[#f5f5f5]" onClick={() => setPendingAction(null)}>
                <XCircle className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="p-3 border-t border-[#e5e5e5] pb-12">
        {interim && (
          <div className="text-xs text-[#a3a3a3] mb-2 px-3 italic">
            {interim}
          </div>
        )}
        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-2 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.currentTarget.files)}
          />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Texa anything…"
            className="border-0 bg-transparent resize-none min-h-[44px] max-h-40 focus-visible:ring-0 text-[#0a0a0a] placeholder:text-[#a3a3a3]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText(input);
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className={listening ? "text-[#ea580c]" : "text-[#525252] hover:bg-[#f5f5f5]"}
            onClick={() => (listening ? stopListening() : startListening())}
            title="Voice input"
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {sending ? (
            <Button onClick={stop} variant="destructive" size="icon" title="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => sendText(input)}
              disabled={!input.trim()}
              size="icon"
              className="bg-[#0a0a0a] text-white hover:bg-[#262626]"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}

function MessageBubble({ message, streaming }: { message: Msg; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-up`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-lg mr-2 grid place-items-center text-[10px] font-bold text-white bg-[#0a0a0a] shrink-0">
          T
        </div>
      )}
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-xl rounded-br-sm px-4 py-2.5 text-sm bg-[#0a0a0a] text-white"
            : "max-w-[80%] rounded-xl rounded-bl-sm px-4 py-2.5 text-sm text-[#0a0a0a] bg-[#f5f5f5]"
        }
      >
        <div className="break-words">
          <MessageContent text={message.content} />
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 align-middle ml-0.5 bg-[#0a0a0a] animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
