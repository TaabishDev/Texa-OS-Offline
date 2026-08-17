import { AVAILABLE_MODELS } from "@/lib/ai-gateway";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu } from "lucide-react";

export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[180px] bg-white border-[#e5e5e5] text-[#0a0a0a]">
        <Cpu className="h-3.5 w-3.5 text-[#0a0a0a] mr-1.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border-[#e5e5e5]">
        {AVAILABLE_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <div className="flex flex-col">
              <span className="text-sm text-[#0a0a0a]">{m.label}</span>
              <span className="text-[10px] text-[#a3a3a3]">
                {m.provider} · {m.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
