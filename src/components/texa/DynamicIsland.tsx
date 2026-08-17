import { Mic, Loader2, Sparkles, Volume2 } from "lucide-react";
import { VoiceWaveform } from "./VoiceWaveform";
import { cn } from "@/lib/utils";

export type IslandState =
  | { kind: "idle" }
  | { kind: "listening"; transcript?: string }
  | { kind: "thinking"; label?: string }
  | { kind: "speaking"; label?: string }
  | { kind: "task"; label: string; progress?: number };

export function DynamicIsland({ state }: { state: IslandState }) {
  const expanded = state.kind !== "idle";
  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out",
        "top-3 sm:top-4",
      )}
      style={{ pointerEvents: "auto" }}
    >
      <div
        className={cn(
          "bg-[#0a0a0a] rounded-full text-white shadow-sm",
          "flex items-center gap-3 overflow-hidden",
          expanded ? "px-5 py-2.5" : "px-4 py-2",
        )}
        style={{
          minWidth: expanded ? 280 : 140,
          maxWidth: 520,
        }}
      >
        {state.kind === "idle" && (
          <>
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-xs font-medium tracking-wide">TEXA</span>
          </>
        )}

        {state.kind === "listening" && (
          <>
            <Mic className="h-4 w-4 text-white" />
            <span className="text-xs font-medium">Listening</span>
            <div className="flex-1 max-w-[200px]">
              <VoiceWaveform active bars={16} />
            </div>
            {state.transcript && (
              <span className="text-xs text-white/60 truncate max-w-[120px]">
                {state.transcript}
              </span>
            )}
          </>
        )}

        {state.kind === "thinking" && (
          <>
            <Loader2 className="h-4 w-4 text-white animate-spin" />
            <span className="text-xs font-medium">{state.label ?? "Thinking…"}</span>
          </>
        )}

        {state.kind === "speaking" && (
          <>
            <Volume2 className="h-4 w-4 text-white" />
            <span className="text-xs font-medium">{state.label ?? "Speaking"}</span>
            <div className="flex-1 max-w-[160px]">
              <VoiceWaveform active={false} bars={14} />
            </div>
          </>
        )}

        {state.kind === "task" && (
          <>
            <Sparkles className="h-4 w-4 text-white" />
            <span className="text-xs font-medium truncate max-w-[200px]">{state.label}</span>
            {typeof state.progress === "number" && (
              <div className="h-1 w-20 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: `${Math.min(100, Math.max(0, state.progress))}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
