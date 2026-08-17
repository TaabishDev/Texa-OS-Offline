import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Play, Square, RefreshCw, Radio, CheckCircle, Volume2, ShieldAlert, Sparkles, Cpu, Globe, FileText } from "lucide-react";
import { toast } from "sonner";
import { VoiceWaveform } from "./VoiceWaveform";

type VoiceLog = {
  id: string;
  command: string;
  timestamp: string;
  status: "success" | "pending" | "failed";
  action: string;
};

export function HandsfreePanel() {
  const [daemonOnline, setDaemonOnline] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [latestCommand, setLatestCommand] = useState("");
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  
  const [logs, setLogs] = useState<VoiceLog[]>([
    { id: "1", command: "open photoshop", timestamp: "10:30:15 AM", status: "success", action: "Launch application" },
    { id: "2", command: "search React tutorials on youtube", timestamp: "10:28:44 AM", status: "success", action: "Open browser" },
    { id: "3", command: "create a PDF study guide about machine learning", timestamp: "10:25:10 AM", status: "success", action: "Generate Document" }
  ]);
  const [pollingTime, setPollingTime] = useState(0.0);

  useEffect(() => {
    let active = true;
    
    const checkDaemon = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/health");
        if (res.ok && active) {
          setDaemonOnline(true);
          setIsListening(true);
        } else if (active) {
          setDaemonOnline(false);
          setIsListening(false);
        }
      } catch {
        if (active) {
          setDaemonOnline(false);
          setIsListening(false);
        }
      }
    };

    const pollCommand = async () => {
      if (!daemonOnline) return;
      try {
        const res = await fetch("http://127.0.0.1:8000/api/voice/latest-command");
        if (res.ok) {
          const data = await res.json() as { command: string; timestamp: number };
          if (data.timestamp > pollingTime && data.command) {
            setPollingTime(data.timestamp);
            setLatestCommand(data.command);
            
            // Add to logs
            const timeStr = new Date(data.timestamp * 1000).toLocaleTimeString();
            setLogs(prev => [
              {
                id: crypto.randomUUID(),
                command: data.command,
                timestamp: timeStr,
                status: "success",
                action: data.command.includes("word") || data.command.includes("report") ? "Generate Document" : "System Control"
              },
              ...prev
            ]);
            toast.success(`Heard command: "${data.command}"`);
          }
        }
      } catch {
        // ignore
      }
    };

    checkDaemon();
    const daemonInterval = setInterval(checkDaemon, 5000);
    const commandInterval = setInterval(pollCommand, 2000);

    return () => {
      active = false;
      clearInterval(daemonInterval);
      clearInterval(commandInterval);
    };
  }, [daemonOnline, pollingTime]);

  const accumulatedTranscriptRef = useRef("");

  const startVoiceCommand = () => {
    if (recognitionActive) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Browser speech recognition not supported. Please use Chrome or Safari.");
      return;
    }

    const SpeechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechCtor();
    recognitionRef.current = rec;
    
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let silenceTimer: any = null;

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        console.log("[HandsfreePanel] Silence detected. Stopping recognition...");
        if (rec) rec.stop();
      }, 2000);
    };

    rec.onstart = () => {
      setRecognitionActive(true);
      setInterimTranscript("Listening...");
      accumulatedTranscriptRef.current = "";
      resetSilenceTimer();
      toast.info("Microphone listening. Speak at your own pace!");
    };

    rec.onresult = (e: any) => {
      resetSilenceTimer();
      let finalSpeech = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalSpeech += e.results[i][0].transcript;
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      
      const currentText = finalSpeech || interim;
      if (finalSpeech) {
        accumulatedTranscriptRef.current = finalSpeech;
      } else if (interim) {
        accumulatedTranscriptRef.current = interim;
      }
      
      setInterimTranscript(currentText);
      setLatestCommand(currentText);
    };

    rec.onend = async () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      setRecognitionActive(false);
      const finalCmd = accumulatedTranscriptRef.current.trim();
      if (finalCmd && finalCmd !== "Listening..." && finalCmd !== "No speech detected.") {
        toast.success(`Heard: "${finalCmd}". Executing...`);
        
        // Add to logs immediately
        const timeStr = new Date().toLocaleTimeString();
        const logId = crypto.randomUUID();
        setLogs(prev => [
          {
            id: logId,
            command: finalCmd,
            timestamp: timeStr,
            status: "pending",
            action: finalCmd.toLowerCase().includes("word") || finalCmd.toLowerCase().includes("report") ? "Generate Document" : "System Control"
          },
          ...prev
        ]);

        try {
          const res = await fetch("http://127.0.0.1:8000/api/voice/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: finalCmd })
          });
          if (res.ok) {
            toast.success(`Executed: "${finalCmd}"`);
            setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: "success" } : l));
          } else {
            setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: "failed" } : l));
            toast.error("Execution failed on backend.");
          }
        } catch {
          setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: "failed" } : l));
          toast.error("FastAPI backend is offline. Run setup first.");
        }
      } else {
        setInterimTranscript("");
      }
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setRecognitionActive(false);
      setInterimTranscript("Error or timeout.");
      toast.error("Speech recognition error. Please check mic permissions.");
    };

    rec.start();
  };

  const triggerTestCommand = async (cmd: string) => {
    toast.info(`Simulating voice command: "${cmd}"`);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/voice/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd })
      });
      if (res.ok) {
        toast.success("Command dispatched successfully");
      }
    } catch {
      toast.error("FastAPI backend is offline. Run setup first.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-white text-[#0a0a0a] min-h-screen">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#0a0a0a] flex items-center justify-center shadow-sm">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#737373] font-semibold">Active Module</div>
            <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a] flex items-center gap-2">
              TEXA Voice OS
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {daemonOnline ? (
            <span className="text-xs uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full font-bold flex items-center gap-2 animate-pulse">
              <Radio className="h-3.5 w-3.5" /> Engine Online
            </span>
          ) : (
            <span className="text-xs uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-4 py-2 rounded-full font-bold flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5" /> Engine Offline
            </span>
          )}
        </div>
      </div>

      {/* Main Center Stage: Halftone Dotted Wave & Floating Mic Sphere */}
      <div className="flex flex-col items-center justify-center text-center relative py-12 border border-[#e5e5e5] bg-[#fafafa] rounded-2xl">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-8">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0a0a0a]">
            Talk to TEXA AI
          </h2>
          <p className="text-[#737373] text-sm max-w-md mx-auto leading-relaxed">
            Hands-free executive coordinator automating your browser tasks, phone calls, and documents in real-time.
          </p>
        </div>

        {/* Central Mic Button */}
        <button 
          onClick={startVoiceCommand}
          className="relative group cursor-pointer focus:outline-none mb-8 active:scale-95 transition-all duration-300"
          title="Click to Speak"
        >
          <div className={`h-40 w-40 rounded-full border relative z-10 flex flex-col items-center justify-center transition-all duration-300 ${
            recognitionActive 
              ? "bg-[#0a0a0a] border-[#0a0a0a] text-white" 
              : "bg-white border-[#e5e5e5] text-[#0a0a0a] hover:border-[#a3a3a3]"
          }`}>
            <Mic className="h-14 w-14" />
          </div>
        </button>

        {/* Speak Control Pill Button */}
        <button
          onClick={startVoiceCommand}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg border text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer ${
            recognitionActive
              ? "bg-[#0a0a0a] border-[#0a0a0a] text-white animate-pulse"
              : "bg-white border-[#e5e5e5] text-[#0a0a0a] hover:bg-[#fafafa]"
          }`}
        >
          {recognitionActive ? (
            <>
              <Radio className="h-4 w-4 text-white animate-pulse" /> Listening...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-[#ea580c]" /> Speak with TEXA
            </>
          )}
        </button>

        {/* Dynamic Transcription Live Pill */}
        {recognitionActive && (
          <div className="mt-8 w-full max-w-lg mx-auto px-4 animate-fade-up">
            <VoiceWaveform active={true} color="rgba(10,10,10,0.85)" className="h-8 mb-4 mx-auto" />
            <div className="px-6 py-3.5 rounded-lg bg-white border border-[#e5e5e5] font-mono text-[#0a0a0a] text-sm max-w-full break-words">
              "{interimTranscript || "Listening for speech..."}"
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Intelligence Dashboard & Metrics */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Real-time System Metrics */}
        <div className="xl:col-span-1 bg-[#fafafa] rounded-2xl p-6 border border-[#e5e5e5] space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-[#0a0a0a] tracking-wide flex items-center gap-2 mb-1">
              <Cpu className="h-5 w-5 text-[#525252]" /> Built for Voice Intelligence
            </h3>
            <p className="text-[#737373] text-xs leading-relaxed mb-6">Ultra-low latency speech routing optimization metrics.</p>
            
            <div className="space-y-3">
              {[
                { label: "Speech Latency", val: "Under 90ms", desc: "Real-time stream evaluation" },
                { label: "Playwright Automation", val: "Active (Visible)", desc: "Direct browser automation" },
                { label: "Phone/FaceTime Caller", val: "Ready", desc: "Native macOS call dialer" },
                { label: "Email/WhatsApp Drafts", val: "Simulated compose", desc: "Drafts generated in Downloads" }
              ].map((m) => (
                <div key={m.label} className="p-3.5 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#0a0a0a]">{m.label}</div>
                    <div className="text-[10px] text-[#737373]">{m.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#0a0a0a] font-mono">{m.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#e5e5e5] justify-between items-center">
            <span className="text-[10px] text-[#a3a3a3] font-mono">Microphone: Default System</span>
            <Button 
              size="sm" 
              className={isListening ? "bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg" : "bg-[#0a0a0a] text-white hover:bg-[#262626] rounded-lg"}
              onClick={() => setIsListening(!isListening)}
              disabled={!daemonOnline}
            >
              {isListening ? <Square className="h-3 w-3 mr-1.5" /> : <Play className="h-3 w-3 mr-1.5" />}
              {isListening ? "Mute Mic" : "Start Mic"}
            </Button>
          </div>
        </div>

        {/* Shortcuts Panel & Latest Output */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          {/* Latest Instruction Output */}
          <div className="bg-[#fafafa] rounded-2xl p-6 border border-[#e5e5e5]">
            <div className="text-xs uppercase tracking-widest text-[#737373] mb-3 font-bold">Latest Voice Output</div>
            {latestCommand ? (
              <div className="text-base font-semibold font-mono text-[#0a0a0a] bg-white px-5 py-4.5 rounded-lg border border-[#e5e5e5] flex items-center justify-between">
                <span className="line-clamp-2">"{latestCommand}"</span>
                <Volume2 className="h-5 w-5 text-[#0a0a0a] animate-bounce flex-shrink-0 ml-3" />
              </div>
            ) : (
              <div className="text-xs italic text-[#737373] p-4 border border-dashed border-[#e5e5e5] rounded-lg bg-white">
                Waiting for voice trigger... Say: "open ChatGPT" or "check recent Gmail job offers".
              </div>
            )}
          </div>

          {/* Quick Voice Shortcut Cards */}
          <div className="bg-[#fafafa] rounded-2xl p-6 border border-[#e5e5e5] flex-1">
            <div className="text-xs uppercase tracking-widest text-[#737373] mb-4 font-bold">Voice Automation Shortcuts</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Generate Word Doc", desc: "generate a word document report about artificial intelligence", icon: <FileText className="h-4 w-4 text-[#0a0a0a]" /> },
                { label: "Open ChatGPT & Ask", desc: "open chatgpt and ask for basic python coding", icon: <Globe className="h-4 w-4 text-[#0a0a0a]" /> },
                { label: "Google Event Search", desc: "search google for new tech events", icon: <Globe className="h-4 w-4 text-[#0a0a0a]" /> },
                { label: "Check Gmail Offers", desc: "check recent mails from gmail and give me job offers", icon: <FileText className="h-4 w-4 text-[#0a0a0a]" /> },
                { label: "Send Email Draft", desc: "send email to test@domain.com subject monthly report", icon: <FileText className="h-4 w-4 text-[#0a0a0a]" /> },
                { label: "Website Navigator", desc: "search for scholarship on pmindia.gov.in", icon: <Globe className="h-4 w-4 text-[#0a0a0a]" /> }
              ].map(s => (
                <button 
                  key={s.label} 
                  onClick={() => triggerTestCommand(s.desc)}
                  className="flex items-start gap-3.5 text-xs p-4 rounded-lg bg-white border border-[#e5e5e5] hover:border-[#a3a3a3] active:scale-[0.98] transition-all duration-300 font-medium text-left group"
                >
                  <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center group-hover:bg-[#0a0a0a] group-hover:text-white transition-all duration-300">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#0a0a0a] group-hover:text-black transition-colors duration-300 truncate">{s.label}</div>
                    <div className="text-[10px] text-[#737373] font-mono mt-0.5 truncate">"{s.desc}"</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Logs Section */}
      <div className="bg-[#fafafa] rounded-2xl p-6 border border-[#e5e5e5]">
        <h3 className="font-bold text-base text-[#0a0a0a] tracking-wide mb-6 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" /> Recent Voice Logs
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] text-[#737373] text-xs uppercase tracking-wider">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Instruction Heard</th>
                <th className="pb-3 font-medium">Resolution Category</th>
                <th className="pb-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5] font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white transition-all">
                  <td className="py-3 text-[#737373] text-xs">{log.timestamp}</td>
                  <td className="py-3 font-medium text-[#0a0a0a]">"{log.command}"</td>
                  <td className="py-3 text-xs text-[#525252]">{log.action}</td>
                  <td className="py-3">
                    {log.status === "success" ? (
                      <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" /> Executed
                      </span>
                    ) : log.status === "pending" ? (
                      <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg font-semibold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1 w-fit animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Executing
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg font-semibold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 w-fit">
                        <Square className="h-3 w-3" /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
