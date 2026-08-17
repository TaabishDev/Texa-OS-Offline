import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createConversation,
  deleteConversation,
  listConversations,
} from "@/lib/texa.functions";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Trash2, Settings, LogOut, Shield, Brain, Compass, Mic, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export function Sidebar({
  activeId,
  onSelect,
  onOpenPermissions,
  onOpenMemory,
  onOpenSettings,
  activeMode,
  onModeChange,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenPermissions: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  activeMode: "chatbot" | "handsfree" | "navigator";
  onModeChange: (mode: "chatbot" | "handsfree" | "navigator") => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const del = useServerFn(deleteConversation);

  const { data } = useQuery({ queryKey: ["conversations"], queryFn: () => list() });
  const createMut = useMutation({
    mutationFn: () => create({ data: { title: "New conversation" } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (row) onSelect(row.id);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <aside className="h-full w-[240px] shrink-0 bg-white border-r border-[#e5e5e5] flex flex-col">
      {/* Mode navigation */}
      <div className="p-3 pb-1 flex flex-col gap-0.5">
        <button 
          onClick={() => onModeChange("chatbot")}
          className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition ${activeMode === "chatbot" ? "bg-[#0a0a0a] text-white" : "text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"}`}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button 
          onClick={() => onModeChange("handsfree")}
          className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition ${activeMode === "handsfree" ? "bg-[#0a0a0a] text-white" : "text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"}`}
        >
          <Mic className="h-4 w-4" />
          Voice
        </button>
        <button 
          onClick={() => onModeChange("navigator")}
          className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition ${activeMode === "navigator" ? "bg-[#0a0a0a] text-white" : "text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"}`}
        >
          <Compass className="h-4 w-4" />
          Navigator
        </button>
      </div>
      
      <div className="h-px bg-[#e5e5e5] my-1 mx-3" />

      {activeMode === "chatbot" && (
        <>
          <div className="p-3">
            <Button onClick={() => createMut.mutate()} className="w-full bg-[#0a0a0a] hover:bg-[#262626] text-white text-[13px] rounded-lg">
              <MessageSquarePlus className="h-4 w-4 mr-2" /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {data?.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition ${
                  activeId === c.id
                    ? "bg-[#f5f5f5] border border-[#e5e5e5]"
                    : "hover:bg-[#fafafa]"
                }`}
                onClick={() => onSelect(c.id)}
              >
                <span className="text-[13px] truncate flex-1 text-[#0a0a0a]">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    delMut.mutate(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#a3a3a3] hover:text-[#dc2626] transition"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {(!data || data.length === 0) && (
              <div className="text-[12px] text-[#a3a3a3] px-2 py-4 text-center">
                No conversations yet
              </div>
            )}
          </div>
        </>
      )}

      {activeMode !== "chatbot" && (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-[12px] text-[#a3a3a3] space-y-1.5">
          <p className="font-semibold text-[11px] text-[#0a0a0a]">Texa OS Active</p>
          <p className="max-w-[180px] leading-relaxed">System listener running in background.</p>
        </div>
      )}
      <div className="p-2 border-t border-[#e5e5e5] grid grid-cols-2 gap-0.5">
        <Button variant="ghost" size="sm" className="text-[11px] text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]" onClick={onOpenMemory}>
          <Brain className="h-3.5 w-3.5 mr-1.5" /> Memory
        </Button>
        <Button variant="ghost" size="sm" className="text-[11px] text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]" onClick={onOpenPermissions}>
          <Shield className="h-3.5 w-3.5 mr-1.5" /> Access
        </Button>
        <Button variant="ghost" size="sm" className="text-[11px] text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]" onClick={onOpenSettings}>
          <Settings className="h-3.5 w-3.5 mr-1.5" /> Settings
        </Button>
        <Button variant="ghost" size="sm" className="text-[11px] text-[#dc2626] hover:bg-red-50 hover:text-[#dc2626]" onClick={signOut}>
          <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
