import { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Database, 
  Clock, 
  Briefcase,
  Github,
  Linkedin
} from "lucide-react";
import type { Step } from "./ChatPanel";

export function TimelinePanel({
  steps,
  memories = [],
  activeIntelligence,
}: {
  steps: Step[];
  memories?: any[];
  activeIntelligence?: any;
}) {
  const [latency, setLatency] = useState(280);
  const [accuracy, setAccuracy] = useState(99.4);

  // Subtle real-time fluctuate for latency metrics to look alive
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency((l) => Math.max(220, Math.min(340, l + (Math.random() > 0.5 ? 8 : -8))));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isExecuting = steps.length > 0;

  return (
    <div className="h-full flex flex-col bg-white border-l border-[#e5e5e5] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-[#0a0a0a] flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isExecuting ? 'bg-[#0a0a0a] animate-pulse' : 'bg-emerald-500'}`} />
          {isExecuting ? "Execution Timeline" : "System Dashboard"}
        </h2>
        <span className="text-[11px] text-[#a3a3a3] bg-[#f5f5f5] px-2.5 py-0.5 rounded-lg border border-[#e5e5e5]">
          Host: MAC-OS-X
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-20 space-y-6">
        {isExecuting ? (
          /* Live Task Planning Pipeline */
          <div className="space-y-6 animate-fade-up">
            <div className="flex items-center justify-between p-3.5 bg-[#fafafa] rounded-xl border border-[#e5e5e5]">
              <div>
                <div className="text-[13px] font-semibold text-[#0a0a0a]">Active Plan</div>
                <div className="text-[11px] text-[#a3a3a3] mt-0.5">Executing multi-step automated script...</div>
              </div>
              <div className="text-right">
                <span className="text-[13px] text-[#0a0a0a] font-semibold">
                  {Math.round((steps.filter(s => s.status === 'done').length / steps.length) * 100)}%
                </span>
              </div>
            </div>

            {/* Timeline tree */}
            <div className="relative pl-6 border-l border-[#e5e5e5] space-y-6">
              {steps.map((s, idx) => {
                const isRunning = s.status === "running";
                const isDone = s.status === "done";
                const isFailed = s.status === "error";

                return (
                  <div key={s.id} className="relative group">
                    {/* timeline node */}
                    <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-[#e5e5e5]">
                      {isRunning ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a0a0a] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0a0a0a]"></span>
                        </span>
                      ) : isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : isFailed ? (
                        <XCircle className="h-3.5 w-3.5 text-rose-500" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-[#d4d4d4]" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-medium ${isRunning ? 'text-[#0a0a0a]' : isDone ? 'text-emerald-600' : isFailed ? 'text-rose-600' : 'text-[#a3a3a3]'}`}>
                          Step {idx + 1}: {s.name.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#a3a3a3] mt-1 font-mono break-all max-h-12 overflow-y-auto bg-[#f5f5f5] p-1.5 rounded border border-[#e5e5e5]">
                        Args: {JSON.stringify(s.args)}
                      </div>
                      {s.result && (
                        <div className="mt-2 text-[11px] text-emerald-600 font-mono bg-[#f5f5f5] p-2.5 rounded-lg border border-[#e5e5e5] max-h-32 overflow-y-auto">
                          <div className="font-semibold text-[10px] text-[#a3a3a3] mb-1">Response:</div>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(s.result, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* General System Status Dashboard */
          <div className="space-y-6 animate-fade-up">
            {/* Latency Dial Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4 flex flex-col justify-between hover:border-[#d4d4d4] transition-all duration-300">
                <div className="text-[11px] text-[#a3a3a3] font-medium">Response Latency</div>
                <div className="my-3 text-3xl font-bold text-[#0a0a0a] tracking-wider select-none">
                  {Math.round(latency)}<span className="text-sm font-normal text-[#737373]">ms</span>
                </div>
                <div className="flex justify-between gap-[1px] opacity-75 mt-1">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2.5 w-[2px] rounded-full transition-all duration-300 ${i === Math.floor(latency / 22) - 8 ? 'h-4 bg-[#0a0a0a]' : 'bg-[#e5e5e5]'}`} 
                    />
                  ))}
                </div>
              </div>

              <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4 flex flex-col justify-between hover:border-[#d4d4d4] transition-all duration-300">
                <div className="text-[11px] text-[#a3a3a3] font-medium">ATS Accuracy</div>
                <div className="my-3 text-3xl font-bold text-[#0a0a0a] tracking-wider select-none">
                  {accuracy.toFixed(1)}<span className="text-sm font-normal text-[#737373]">%</span>
                </div>
                <div className="flex justify-between gap-[1px] opacity-75 mt-1">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2.5 w-[2px] rounded-full transition-all duration-300 ${i === 12 ? 'h-4 bg-[#0a0a0a]' : 'bg-[#e5e5e5]'}`} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Resume / Profile Analysis Showcase */}
            {activeIntelligence ? (
              <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5">
                  {activeIntelligence.type === "linkedin" && <Linkedin className="h-10 w-10 text-[#0a0a0a]" />}
                  {activeIntelligence.type === "github" && <Github className="h-10 w-10 text-[#0a0a0a]" />}
                  {activeIntelligence.type === "resume" && <Briefcase className="h-10 w-10 text-[#0a0a0a]" />}
                </div>

                <h3 className="text-[11px] font-semibold text-[#0a0a0a] flex items-center gap-1.5">
                  Parsed Extraction Insights
                </h3>
                <div className="text-sm font-semibold text-[#0a0a0a]">{activeIntelligence.title}</div>
                <p className="text-[13px] text-[#737373] leading-relaxed">{activeIntelligence.summary}</p>
                
                {activeIntelligence.scores && (
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    {Object.entries(activeIntelligence.scores).map(([name, score]: any) => (
                      <div key={name} className="bg-white rounded-lg p-2 border border-[#e5e5e5]">
                        <div className="text-[10px] text-[#a3a3a3]">{name}</div>
                        <div className="text-[13px] font-semibold text-[#0a0a0a] mt-0.5">{score}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* System Memory Vault */}
            <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-[#0a0a0a] flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#525252]" />
                AI Memory
              </h3>
              {memories.length === 0 ? (
                <div className="text-[13px] text-[#a3a3a3] italic">No memories recorded in context.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {memories.map((m: any) => (
                    <div key={m.id} className="text-[13px] p-2 rounded bg-white border border-[#e5e5e5] flex items-start gap-2">
                      <span className="text-[10px] bg-[#f5f5f5] text-[#525252] px-1.5 py-0.5 rounded border border-[#e5e5e5] shrink-0 font-medium">
                        {m.kind || "Fact"}
                      </span>
                      <span className="text-[#737373] truncate flex-1">{m.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Log Trail */}
            <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-[#0a0a0a] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#525252]" />
                Audit Trail
              </h3>
              <div className="space-y-1.5 font-mono text-[11px] text-[#a3a3a3] max-h-40 overflow-y-auto">
                <div className="flex items-center gap-2">
                  <span className="text-[#737373]">[00:21:00]</span>
                  <span>INIT Daemon Context Host ...</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#737373]">[00:21:05]</span>
                  <span className="text-emerald-600 font-medium">FastAPI Agent dispatcher loaded (127.0.0.1:8000)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#737373]">[00:21:10]</span>
                  <span>Playwright browser pool context initialized</span>
                </div>
                {isExecuting && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#737373]">[00:23:12]</span>
                    <span className="text-[#0a0a0a]">DISPATCHING tool caller request...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
