import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile } from "@/lib/texa.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const LANGUAGES = ["English", "Tamil", "Tanglish", "Hindi"];

export function SettingsPanel() {
  const qc = useQueryClient();
  const get = useServerFn(getMyProfile);
  const update = useServerFn(updateMyProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => get() });
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lang, setLang] = useState("English");
  const [voice, setVoice] = useState(true);

  useEffect(() => {
    if (data) {
      setName(data.display_name ?? "");
      setLang(data.preferred_language ?? "English");
      setVoice(data.voice_enabled ?? true);
    }
    // Load location fallback from localStorage
    const savedLoc = localStorage.getItem("texa_location");
    if (savedLoc) {
      setLocation(savedLoc);
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: async (v: { display_name?: string; preferred_language?: string; voice_enabled?: boolean }) => {
      // Save location locally
      localStorage.setItem("texa_location", location);
      return update({ data: v });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved successfully");
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-[#0a0a0a]">Your name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter display name"
          className="bg-white border-[#e5e5e5] focus-visible:ring-0 focus-visible:border-black text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-[#0a0a0a]">Where I live</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. San Francisco, CA"
          className="bg-white border-[#e5e5e5] focus-visible:ring-0 focus-visible:border-black text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-[#0a0a0a]">Preferred language</Label>
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="bg-white border-[#e5e5e5] focus:ring-0 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#e5e5e5]">
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l} className="text-sm cursor-pointer hover:bg-[#f5f5f5]">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between border border-[#e5e5e5] rounded-xl px-3 py-2.5 bg-[#fafafa]">
        <div>
          <div className="text-xs font-semibold text-[#0a0a0a]">Voice replies</div>
          <div className="text-[10px] text-[#737373] mt-0.5">Texa speaks back using ElevenLabs</div>
        </div>
        <Switch checked={voice} onCheckedChange={setVoice} />
      </div>

      <Button
        className="w-full bg-[#0a0a0a] text-white hover:bg-[#262626] text-sm h-10 font-medium rounded-lg"
        onClick={() => mut.mutate({ display_name: name, preferred_language: lang, voice_enabled: voice })}
      >
        Save settings
      </Button>
    </div>
  );
}
