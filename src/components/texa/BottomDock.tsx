import { Smile, Sparkles, Mic, Globe, User, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface BottomDockProps {
  activeMode: "chatbot" | "handsfree" | "navigator" | "summarizer";
  onModeChange: (mode: "chatbot" | "handsfree" | "navigator" | "summarizer") => void;
  showTimeline: boolean;
  onToggleTimeline: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
}

export function BottomDock({
  activeMode,
  onModeChange,
  showTimeline,
  onToggleTimeline,
  onOpenMemory,
  onOpenSettings,
}: BottomDockProps) {
  return (
    <div className="relative select-none">
      
      {/* ── DESKTOP/TABLET: FLOATING GLASSMORPHIC CAPSULE DOCK ── */}
      <div className="fixed bottom-6 inset-x-0 z-50 md:flex hidden justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-6 bg-white/70 backdrop-blur-xl border border-white/30 rounded-full px-6 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] ring-1 ring-black/5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)] transition-all duration-300">
          
          {/* Home Link */}
          <Link
            to="/"
            className="group relative flex flex-col items-center justify-center h-12 w-16 rounded-2xl hover:bg-black/[0.03] active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Smile className="h-5 w-5 text-[#737373] group-hover:text-[#ea580c] transition-colors" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#737373] group-hover:text-[#ea580c] mt-1 transition-colors">
              Home
            </span>
          </Link>

          <div className="h-6 w-px bg-black/[0.08]" />

          {/* Texa Chat */}
          <button
            onClick={() => onModeChange("chatbot")}
            className="group relative flex flex-col items-center justify-center h-12 w-20 rounded-2xl hover:bg-black/[0.03] active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Sparkles className={`h-5 w-5 transition-colors ${
              activeMode === "chatbot" ? "text-[#ea580c]" : "text-[#737373] group-hover:text-[#ea580c]"
            }`} />
            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 transition-colors ${
              activeMode === "chatbot" ? "text-[#ea580c]" : "text-[#737373] group-hover:text-[#ea580c]"
            }`}>
              Chat
            </span>
            <span className="absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#ea580c] text-[8px] font-black text-white ring-2 ring-white shadow-sm">
              6
            </span>
            {activeMode === "chatbot" && (
              <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#ea580c]" />
            )}
          </button>

          {/* Primary Centered Action Button (AI Assist / Mic) */}
          <button
            onClick={() => onModeChange("handsfree")}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-full shadow-[0_4px_12px_rgba(234,88,12,0.2)] hover:shadow-[0_6px_16px_rgba(234,88,12,0.3)] hover:scale-108 active:scale-95 transition-all duration-200 cursor-pointer ${
              activeMode === "handsfree"
                ? "bg-[#0a0a0a] text-white ring-2 ring-[#ea580c]"
                : "bg-[#ea580c] text-white"
            }`}
          >
            <Mic className="h-5 w-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[8px] font-black text-black ring-2 ring-white shadow-sm animate-pulse">
              2
            </span>
          </button>

          {/* Navigator */}
          <button
            onClick={() => onModeChange("navigator")}
            className="group relative flex flex-col items-center justify-center h-12 w-20 rounded-2xl hover:bg-black/[0.03] active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Globe className={`h-5 w-5 transition-colors ${
              activeMode === "navigator" ? "text-[#ea580c]" : "text-[#737373] group-hover:text-[#ea580c]"
            }`} />
            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 transition-colors ${
              activeMode === "navigator" ? "text-[#ea580c]" : "text-[#737373] group-hover:text-[#ea580c]"
            }`}>
              Navigate
            </span>
            <span className="absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#ea580c] text-[8px] font-black text-white ring-2 ring-white shadow-sm">
              3
            </span>
            {activeMode === "navigator" && (
              <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#ea580c]" />
            )}
          </button>

          {/* Summarizer */}
          <button
            onClick={() => onModeChange("summarizer")}
            className="group relative flex flex-col items-center justify-center h-12 w-20 rounded-2xl hover:bg-black/[0.03] active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <FileText className={`h-5 w-5 transition-colors ${
              activeMode === "summarizer" ? "text-[#ea580c]" : "text-[#737373] group-hover:text-[#ea580c]"
            }`} />
            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 transition-colors ${
              activeMode === "summarizer" ? "text-[#ea580c]" : "text-[#737373] group-hover:text-[#ea580c]"
            }`}>
              Summarize
            </span>
            {activeMode === "summarizer" && (
              <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#ea580c]" />
            )}
          </button>

          <div className="h-6 w-px bg-black/[0.08]" />

          {/* Profile */}
          <button
            onClick={onOpenSettings}
            className="group relative flex flex-col items-center justify-center h-12 w-16 rounded-2xl hover:bg-black/[0.03] active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <User className="h-5 w-5 text-[#737373] group-hover:text-[#ea580c] transition-colors" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#737373] group-hover:text-[#ea580c] mt-1 transition-colors">
              Profile
            </span>
          </button>

        </div>
      </div>

      {/* ── MOBILE: SIMPLE FLOATING NAVIGATION BAR ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-lg border-t border-black/[0.05] px-6 py-2.5 md:hidden flex items-center justify-around select-none">
        {/* Home */}
        <Link
          to="/"
          className="flex flex-col items-center justify-center text-[#737373] hover:text-[#ea580c] transition-colors cursor-pointer"
        >
          <Smile className="h-5 w-5" />
          <span className="text-[8px] font-black uppercase mt-1">Home</span>
        </Link>
        
        {/* Texa Chat */}
        <button
          onClick={() => onModeChange("chatbot")}
          className={`relative flex flex-col items-center justify-center cursor-pointer transition-colors ${
            activeMode === "chatbot" ? "text-[#ea580c]" : "text-[#737373] hover:text-[#ea580c]"
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[8px] font-black uppercase mt-1">Texa Chat</span>
          <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ea580c] text-[8px] font-black text-white ring-1 ring-white">
            6
          </span>
        </button>

        {/* Centered Floating Mobile Button (AI Assist) */}
        <button
          onClick={() => onModeChange("handsfree")}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-white hover:scale-105 active:scale-95 transition-all shadow-md -mt-4 border-4 border-white cursor-pointer ${
            activeMode === "handsfree" ? "bg-[#0a0a0a] text-white" : "bg-[#ea580c] text-white"
          }`}
        >
          <Mic className="h-4.5 w-4.5" />
        </button>

        {/* Navigator */}
        <button
          onClick={() => onModeChange("navigator")}
          className={`relative flex flex-col items-center justify-center cursor-pointer transition-colors ${
            activeMode === "navigator" ? "text-[#ea580c]" : "text-[#737373] hover:text-[#ea580c]"
          }`}
        >
          <Globe className="h-5 w-5" />
          <span className="text-[8px] font-black uppercase mt-1">Navigator</span>
          <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ea580c] text-[8px] font-black text-white ring-1 ring-white">
            3
          </span>
        </button>
        
        {/* Summarizer */}
        <button
          onClick={() => onModeChange("summarizer")}
          className={`relative flex flex-col items-center justify-center cursor-pointer transition-colors ${
            activeMode === "summarizer" ? "text-[#ea580c]" : "text-[#737373] hover:text-[#ea580c]"
          }`}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[8px] font-black uppercase mt-1">Summarize</span>
        </button>

        {/* Profile */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center text-[#737373] hover:text-[#ea580c] cursor-pointer"
        >
          <User className="h-5 w-5" />
          <span className="text-[8px] font-black uppercase mt-1">Profile</span>
        </button>
      </div>

    </div>
  );
}
