import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createConversation,
  listConversations,
  listMemories,
  deleteConversation,
} from "@/lib/texa.functions";
import { ChatPanel, type Step } from "@/components/texa/ChatPanel";
import { HandsfreePanel } from "@/components/texa/HandsfreePanel";
import { WebNavigatorPanel } from "@/components/texa/WebNavigatorPanel";
import { DocumentSummarizerPanel } from "@/components/texa/DocumentSummarizerPanel";
import { TimelinePanel } from "@/components/texa/TimelinePanel";
import { DynamicIsland, type IslandState } from "@/components/texa/DynamicIsland";
import { BottomDock } from "@/components/texa/BottomDock";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PermissionCenter } from "@/components/texa/PermissionCenter";
import { MemoryPanel } from "@/components/texa/MemoryPanel";
import { SettingsPanel } from "@/components/texa/SettingsPanel";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Texa — Your AI Operating System" },
      { name: "description", content: "Chat, voice, hands-free, and memory powered by Texa." },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const qc = useQueryClient();
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const listMem = useServerFn(listMemories);
  const delConvo = useServerFn(deleteConversation);

  const { data: convos } = useQuery({ queryKey: ["conversations"], queryFn: () => list() });
  const { data: memories } = useQuery({ queryKey: ["memories"], queryFn: () => listMem() });

  const handleDelete = async (id: string) => {
    await delConvo({ data: { id } });
    qc.invalidateQueries({ queryKey: ["conversations"] });
    if (activeId === id) {
      setActiveId(null);
    }
  };

  const handleCreate = async () => {
    const c = await create({ data: { title: "New conversation" } });
    qc.invalidateQueries({ queryKey: ["conversations"] });
    if (c) setActiveId(c.id);
  };

  const [activeId, setActiveId] = useState<string | null>(null);
  const [island, setIsland] = useState<IslandState>({ kind: "idle" });
  const [permOpen, setPermOpen] = useState(false);
  const [memOpen, setMemOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [activeMode, setActiveMode] = useState<"chatbot" | "handsfree" | "navigator" | "summarizer">("chatbot");
  const [showTimeline, setShowTimeline] = useState(true);
  const [activeSteps, setActiveSteps] = useState<Step[]>([]);
  const [activeIntel, setActiveIntel] = useState<any>(null);

  // Auto-pick first convo or create one
  useEffect(() => {
    if (activeId) return;
    if (convos === undefined) return;
    if (convos.length > 0) {
      setActiveId(convos[0].id);
    } else {
      (async () => {
        const c = await create({ data: { title: "New conversation" } });
        qc.invalidateQueries({ queryKey: ["conversations"] });
        if (c) setActiveId(c.id);
      })();
    }
  }, [convos, activeId, create, qc]);

  return (
    <div className="h-screen w-screen flex bg-white overflow-hidden relative">
      <DynamicIsland state={island} />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative flex-1 flex flex-col min-h-0 pb-20">
          {activeMode === "chatbot" ? (
            activeId ? (
              <div className="flex-1 flex h-full w-full divide-x divide-[#e5e5e5]">
                <div className="flex-1 min-w-0 h-full">
                  <ChatPanel
                    key={activeId}
                    conversationId={activeId}
                    conversations={convos}
                    onSelectConversation={setActiveId}
                    onCreateConversation={handleCreate}
                    onDeleteConversation={handleDelete}
                    onIslandChange={setIsland}
                    handsFree={handsFree}
                    setHandsFree={setHandsFree}
                    onStepsChange={setActiveSteps}
                    onActiveIntelligenceChange={setActiveIntel}
                  />
                </div>
                {showTimeline && (
                  <div className="w-[360px] md:w-[420px] shrink-0 h-full hidden lg:block">
                    <TimelinePanel
                      steps={activeSteps}
                      memories={memories}
                      activeIntelligence={activeIntel}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 grid place-items-center text-[#a3a3a3] text-sm">
                Loading…
              </div>
            )
          ) : activeMode === "handsfree" ? (
            <HandsfreePanel />
          ) : activeMode === "navigator" ? (
            <WebNavigatorPanel />
          ) : (
            <DocumentSummarizerPanel />
          )}
        </div>
      </main>

      {/* Curved Bottom Dock matches image 3 exactly */}
      <BottomDock
        activeMode={activeMode}
        onModeChange={(mode) => {
          // If switching to chatbot, default to chatbot. Let navigator trigger separately if needed.
          setActiveMode(mode);
        }}
        showTimeline={showTimeline}
        onToggleTimeline={() => setShowTimeline(!showTimeline)}
        onOpenMemory={() => setMemOpen(true)}
        onOpenSettings={() => setSetOpen(true)}
      />

      <Sheet open={permOpen} onOpenChange={setPermOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] bg-white border-l border-[#e5e5e5]">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold text-[#0a0a0a]">Permission Center</SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-1">
            <PermissionCenter />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={memOpen} onOpenChange={setMemOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] bg-white border-l border-[#e5e5e5]">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold text-[#0a0a0a]">Memory</SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-1">
            <MemoryPanel />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={setOpen} onOpenChange={setSetOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] bg-white border-l border-[#e5e5e5]">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold text-[#0a0a0a]">Settings</SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-1">
            <SettingsPanel />
          </div>
        </SheetContent>
      </Sheet>

      <Toaster theme="light" />
    </div>
  );
}
