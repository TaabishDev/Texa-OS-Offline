import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addMemory, deleteMemory, listMemories } from "@/lib/texa.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Trash2 } from "lucide-react";
import { useState } from "react";

export function MemoryPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listMemories);
  const add = useServerFn(addMemory);
  const del = useServerFn(deleteMemory);
  const { data } = useQuery({ queryKey: ["memories"], queryFn: () => list() });
  const [text, setText] = useState("");
  const addMut = useMutation({
    mutationFn: (content: string) => add({ data: { content } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["memories"] });
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Texa remembers these things across every conversation. She also adds memories
        automatically when you share lasting facts.
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="e.g. I live in Chennai, I prefer Tanglish"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && addMut.mutate(text.trim())}
        />
        <Button
          onClick={() => text.trim() && addMut.mutate(text.trim())}
          className="btn-hero"
        >
          Add
        </Button>
      </div>
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
        {data?.map((m) => (
          <div key={m.id} className="glass rounded-lg px-3 py-2 flex items-start gap-2">
            <Brain className="h-4 w-4 text-[color:var(--color-neon)] mt-0.5 shrink-0" />
            <div className="text-sm flex-1">{m.content}</div>
            <button
              onClick={() => delMut.mutate(m.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="text-xs text-muted-foreground text-center py-6">
            No memories yet.
          </div>
        )}
      </div>
    </div>
  );
}
