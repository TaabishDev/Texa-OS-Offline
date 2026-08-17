import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Compass, Sparkles, AlertCircle, Volume2, Mic, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { speak } from "@/lib/texa-voice";

type NavStep = {
  id: string;
  desc: string;
  status: "idle" | "running" | "done" | "error";
};

export function WebNavigatorPanel() {
  const [url, setUrl] = useState("https://www.pmindia.gov.in");
  const [query, setQuery] = useState("Prime Minister's Scholarship Scheme");
  const [running, setRunning] = useState(false);
  const [voiceInputActive, setVoiceInputActive] = useState(false);
  const [resultText, setResultText] = useState("");
  const [steps, setSteps] = useState<NavStep[]>([]);

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Browser speech recognition not supported. Try Chrome.");
      return;
    }
    const SpeechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechCtor();
    rec.lang = "en-US";
    rec.onstart = () => setVoiceInputActive(true);
    rec.onresult = (e: any) => {
      const txt = e.results[0][0].transcript;
      setQuery(txt);
    };
    rec.onend = () => setVoiceInputActive(false);
    rec.onerror = () => setVoiceInputActive(false);
    rec.start();
  };

  const executeNavigation = async () => {
    if (!url.trim() || !query.trim()) {
      toast.warning("Please provide both website URL and section query");
      return;
    }

    setRunning(true);
    setResultText("");
    const initialSteps: NavStep[] = [
      { id: "1", desc: "Launch headed Chrome automation engine", status: "running" },
      { id: "2", desc: `Navigate to website: ${url}`, status: "idle" },
      { id: "3", desc: "Scan DOM links, headers, and menus", status: "idle" },
      { id: "4", desc: `Locate matching section containing "${query}"`, status: "idle" },
      { id: "5", desc: "Scroll page to center matching element", status: "idle" },
      { id: "6", desc: "Inject CSS neon highlight border on target", status: "idle" }
    ];
    setSteps(initialSteps);

    try {
      // Step 1: Initialize / Navigate
      setSteps(prev => prev.map(s => s.id === "1" ? { ...s, status: "done" } : s.id === "2" ? { ...s, status: "running" } : s));
      const navRes = await fetch("http://127.0.0.1:8000/api/browser/navigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, headless: false })
      });
      if (!navRes.ok) throw new Error("FastAPI browser launch failed");

      // Step 2: Scan page structure
      setSteps(prev => prev.map(s => s.id === "2" ? { ...s, status: "done" } : s.id === "3" ? { ...s, status: "running" } : s));
      const scanRes = await fetch("http://127.0.0.1:8000/api/browser/page-structure");
      if (!scanRes.ok) throw new Error("DOM Structure parsing failed");
      const scanData = await scanRes.json();

      // Step 3: Highlight matching section
      setSteps(prev => prev.map(s => s.id === "3" ? { ...s, status: "done" } : s.id === "4" ? { ...s, status: "running" } : s.id === "5" ? { ...s, status: "running" } : s.id === "6" ? { ...s, status: "running" } : s));
      const highlightRes = await fetch("http://127.0.0.1:8000/api/browser/highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      if (!highlightRes.ok) throw new Error("Element highlight failed");
      const highlightData = await highlightRes.json();

      // Mark all steps as complete
      setSteps(prev => prev.map(s => ({ ...s, status: "done" })));
      
      const snippet = highlightData.match_text || "Found target section on website.";
      setResultText(snippet);
      toast.success("Section located & highlighted on Chrome!");
      speak(snippet);
    } catch (err) {
      console.error(err);
      setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "error" } : s));
      
      const simText = `Simulated result: Located and highlighted PM scholarship information on portal. [Offline Simulation Mode]`;
      setResultText(simText);
      speak(simText);
      toast.info("FastAPI backend offline. Simulation result generated.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white text-[#0a0a0a]">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0a0a0a] flex items-center gap-2">
          <Compass className="h-8 w-8 text-[#ea580c]" />
          Website AI Navigator
        </h1>
        <p className="text-[#737373] text-sm">Dynamic structure understanding: finds exact information on government and university portals automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters panel */}
        <div className="lg:col-span-1 bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-base mb-2 text-[#0a0a0a]">Configure Search Target</h3>
          
          <div className="space-y-1.5">
            <Label className="text-[#525252]">Portal URL</Label>
            <Input 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              placeholder="e.g. https://www.pmindia.gov.in"
              className="bg-white border-[#e5e5e5] text-sm text-[#0a0a0a]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between text-[#525252]">
              <span>Section Search Query</span>
              <button 
                onClick={startVoiceInput}
                className={`text-[10px] uppercase font-semibold flex items-center gap-1 px-2 py-0.5 rounded border transition ${voiceInputActive ? "bg-[#ea580c]/15 border-[#ea580c]/30 text-[#ea580c] animate-pulse" : "bg-white border-[#e5e5e5] text-[#737373] hover:text-[#0a0a0a]"}`}
              >
                <Mic className="h-2.5 w-2.5" /> Voice Input
              </button>
            </Label>
            <div className="flex gap-2">
              <Input 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                placeholder="e.g. Admission, Scholarship eligibility"
                className="bg-white border-[#e5e5e5] text-sm flex-1 text-[#0a0a0a]"
              />
            </div>
          </div>

          <Button 
            onClick={executeNavigation} 
            disabled={running} 
            className="w-full bg-[#0a0a0a] text-white hover:bg-[#262626] rounded-lg mt-2 font-medium"
          >
            {running ? "Executing..." : "Analyze & Locate"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <div className="text-[10px] text-[#737373] flex gap-1.5 p-3 rounded-lg bg-[#fafafa] border border-[#e5e5e5]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#ea580c]" />
            <span>This launches a headed Google Chrome instance. You can watch Texa control the cursor and scroll to highlight in real-time.</span>
          </div>
        </div>

        {/* Execution Flow & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step Pipeline */}
          {steps.length > 0 && (
            <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-6">
              <h3 className="font-semibold text-base mb-4 flex items-center gap-1.5 text-[#0a0a0a]">
                <Sparkles className="h-4.5 w-4.5 text-[#ea580c]" />
                AI Crawling & Highlighting Pipeline
              </h3>
              
              <div className="space-y-3 font-mono text-xs">
                {steps.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    {s.status === "running" ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0a0a0a]"></span>
                      </span>
                    ) : s.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : s.status === "error" ? (
                      <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-[#d4d4d4] shrink-0" />
                    )}
                    <span className={s.status === "running" ? "text-[#0a0a0a] font-semibold" : s.status === "done" ? "text-[#737373]" : "text-[#a3a3a3]"}>
                      {s.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Details Preview */}
          {resultText && (
            <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-[#0a0a0a]">Extracted Details</h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => speak(resultText)}
                  className="h-8 border-[#e5e5e5] bg-white text-xs text-[#0a0a0a] hover:bg-[#fafafa]"
                >
                  <Volume2 className="h-3.5 w-3.5 mr-1" /> Read Aloud
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-white border border-[#e5e5e5] text-sm text-[#0a0a0a] leading-relaxed shadow-inner">
                "{resultText}"
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
