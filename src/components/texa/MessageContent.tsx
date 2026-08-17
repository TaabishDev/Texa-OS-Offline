import { useMemo, useRef, useState } from "react";
import { Copy, Play, Check, Terminal, Square } from "lucide-react";

type Part = { type: "text"; text: string } | { type: "code"; lang: string; code: string };

function parse(src: string): Part[] {
  const parts: Part[] = [];
  const re = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push({ type: "text", text: src.slice(last, m.index) });
    parts.push({ type: "code", lang: (m[1] || "text").toLowerCase(), code: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push({ type: "text", text: src.slice(last) });
  return parts;
}

const RUNNABLE = new Set(["js", "javascript", "ts", "typescript", "html"]);

function buildRunnerScript(token: string, source: string) {
  return `
const logs = [];
const send = () => parent.postMessage({ t: ${JSON.stringify(token)}, logs: logs.join("\\n") }, "*");
const format = (value) => {
  try { return typeof value === "object" ? JSON.stringify(value) : String(value); }
  catch { return String(value); }
};
["log", "info", "warn", "error"].forEach((key) => {
  const original = console[key];
  console[key] = (...args) => {
    logs.push(args.map(format).join(" "));
    send();
    if (original) original(...args);
  };
});
window.onerror = (message) => { logs.push("Error: " + message); send(); };
try {
  (async () => {
    const result = await (async () => {\n${source}\n})();
    if (result !== undefined) { logs.push(String(result)); send(); }
  })().catch((error) => { logs.push("Error: " + (error?.message || error)); send(); });
} catch (error) {
  logs.push("Error: " + (error?.message || error));
  send();
}`;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const runnable = RUNNABLE.has(lang);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const stop = () => {
    iframeRef.current?.remove();
    iframeRef.current = null;
    setRunning(false);
  };

  const run = () => {
    stop();
    setOutput("");
    setRunning(true);
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.display = "none";
    const token = "__texa_" + Math.random().toString(36).slice(2);
    const isHtml = lang === "html";
    const body = isHtml
      ? code
      : `<script>\n${buildRunnerScript(token, code)}\n<\/script>`;
    iframe.srcdoc = `<!doctype html><html><body>${body}</body></html>`;
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.t === token) setOutput(e.data.logs);
    };
    window.addEventListener("message", handler);
    iframe.onload = () => setTimeout(() => setRunning(false), isHtml ? 200 : 800);
    document.body.appendChild(iframe);
    iframeRef.current = iframe;
    setTimeout(() => window.removeEventListener("message", handler), 8000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-[color:var(--color-border)] bg-black/70 backdrop-blur">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-white/5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/60">
          <Terminal className="h-3 w-3" />
          {lang || "text"}
        </div>
        <div className="flex items-center gap-1">
          {runnable && (
            running ? (
              <button onClick={stop} className="text-[10px] px-2 py-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1">
                <Square className="h-3 w-3" /> Stop
              </button>
            ) : (
              <button onClick={run} className="text-[10px] px-2 py-1 rounded-md text-[color:var(--color-neon)] hover:bg-white/10 flex items-center gap-1">
                <Play className="h-3 w-3" /> Run
              </button>
            )
          )}
          <button onClick={copy} className="text-[10px] px-2 py-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto text-[12px] leading-relaxed text-white/90 font-mono">
        <code>{code}</code>
      </pre>
      {output !== null && (
        <div className="border-t border-white/5 bg-black/80">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-white/50">Output</div>
          <pre className="px-3 pb-2.5 text-[12px] text-[color:var(--color-neon)] font-mono whitespace-pre-wrap break-words min-h-[1.5rem]">
            {output || (running ? "Running…" : "(no output)")}
          </pre>
        </div>
      )}
    </div>
  );
}

export function MessageContent({ text }: { text: string }) {
  const parts = useMemo(() => parse(text), [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <div key={i} className="whitespace-pre-wrap break-words">
            {p.text}
          </div>
        ) : (
          <CodeBlock key={i} lang={p.lang} code={p.code} />
        )
      )}
    </>
  );
}
