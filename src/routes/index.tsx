import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/texa/Logo";
import { DynamicIsland } from "@/components/texa/DynamicIsland";
import Dither from "@/components/texa/Dither";
import TextLoop from "@/components/texa/TextLoop";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  Shield,
  Cpu,
  Layers,
  Search,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TEXA OS — Trusted Agentic AI Operating System" },
      {
        name: "description",
        content:
          "TEXA is an agentic AI operating system. Safely automate desktop, browser, document, and communication tasks.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Mic, title: "Voice Operating System", desc: "Redefine computer interaction using voice prompts powered by premium TTS engines." },
  { icon: Layers, title: "Multi-Step AI Planning", desc: "Break down complex commands into sequenced tasks with real-time execution timelines." },
  { icon: Search, title: "Intelligent Web Navigation", desc: "Navigate deep site structures, highlight conditions, and parse layouts automatically." },
  { icon: FileText, title: "Resume ATS Matcher", desc: "Extract structures, evaluate ATS compatibility scores, and refine keyword relevance." },
  { icon: Cpu, title: "LinkedIn & GitHub Agent", desc: "Crawl public developer profiles, analyze portfolio readiness, and generate summaries." },
  { icon: Shield, title: "Safe Dual-Layer Security", desc: "Approve high-risk actions. Encrypt local credentials and audit system API execution logs." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-transparent text-[#0a0a0a] selection:bg-black/10 relative">
      <DynamicIsland state={{ kind: "idle" }} />

      {/* Full screen backdrop canvas */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-[0.45]">
        <Dither
          waveColor={[0.15, 0.15, 0.15]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.4}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      <div className="relative z-10">
        {/* ── NAV ── exactly like PlayerZero */}
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-[#ea580c]" />
          <span className="text-sm font-semibold text-[#0a0a0a]">TEXA OS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-[#525252]">
          <span className="hover:text-[#ea580c] cursor-pointer transition-colors">Platform</span>
          <span className="hover:text-[#ea580c] cursor-pointer transition-colors">Features</span>
          <span className="hover:text-[#ea580c] cursor-pointer transition-colors">Docs</span>
          <span className="hover:text-[#ea580c] cursor-pointer transition-colors">Company</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app" className="text-[13px] text-[#525252] hover:text-[#ea580c] transition-colors hidden sm:block">
            Log In
          </Link>
          <Link to="/app">
            <button className="bg-[#ea580c] text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#ea580c]/90 transition-colors">
              Request Demo
            </button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── dot-matrix headline + halftone grid */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-8">
        {/* Dot grid bg */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        <div className="relative text-center">
          {/* Pixel dot-matrix headline — like "FIX. LEARN." */}
          <h1
            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-wide leading-tight"
            style={{ fontFamily: "var(--font-pixel)", fontWeight: 900 }}
          >
            FIX. LEARN.
          </h1>

          {/* Halftone interactive canvas in middle area */}
          <div className="relative w-full h-[280px] my-8">
            <div className="absolute inset-0 grid-bg opacity-35 pointer-events-none" />

            {/* Center icon — like PlayerZero's logo icon */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="h-20 w-20 rounded-2xl bg-white border-2 border-[#e5e5e5] grid place-items-center shadow-sm">
                <Logo className="h-12 w-12 text-[#ea580c]" />
              </div>
            </div>

            {/* Floating label pills — like "Container", "Code", "Bug", "Issues" */}
            <div className="absolute top-8 left-[15%] hidden md:flex items-center gap-2 text-[11px] text-[#525252] bg-white border border-[#e5e5e5] rounded-full px-3 py-1">
              Browser
            </div>
            <div className="absolute top-8 right-[15%] hidden md:flex items-center gap-2 text-[11px] text-[#525252] bg-white border border-[#e5e5e5] rounded-full px-3 py-1">
              Desktop
            </div>
            <div className="absolute bottom-8 left-[10%] hidden md:flex items-center gap-2 text-[11px] text-[#525252] bg-white border border-[#e5e5e5] rounded-full px-3 py-1">
              Scrape
            </div>
            <div className="absolute bottom-12 left-[22%] hidden md:flex items-center gap-2 text-[11px] text-[#525252] bg-white border border-[#e5e5e5] rounded-full px-3 py-1">
              Automate
            </div>
            <div className="absolute bottom-8 right-[8%] hidden md:flex items-center gap-2 text-[11px] text-[#525252] bg-white border border-[#e5e5e5] rounded-full px-3 py-1">
              Resume
            </div>
            <div className="absolute bottom-12 right-[20%] hidden md:flex items-center gap-2 text-[11px] text-[#525252] bg-white border border-[#e5e5e5] rounded-full px-3 py-1">
              Document
            </div>
            <div className="absolute bottom-8 right-[33%] hidden md:flex items-center gap-2 text-[11px] text-[#525252] bg-white border border-[#e5e5e5] rounded-full px-3 py-1">
              Voice
            </div>

            {/* Connecting dots — small circles at intersections */}
            <div className="absolute top-6 left-[12%] h-2 w-2 rounded-full bg-[#d4d4d4] hidden md:block" />
            <div className="absolute top-6 right-[12%] h-2 w-2 rounded-full bg-[#d4d4d4] hidden md:block" />
            <div className="absolute bottom-6 left-[8%] h-2 w-2 rounded-full bg-[#d4d4d4] hidden md:block" />
            <div className="absolute bottom-6 right-[8%] h-2 w-2 rounded-full bg-[#d4d4d4] hidden md:block" />
            <div className="absolute top-1/2 left-4 h-2 w-2 rounded-full bg-[#d4d4d4] hidden md:block" />
            <div className="absolute top-1/2 right-4 h-2 w-2 rounded-full bg-[#d4d4d4] hidden md:block" />
          </div>

          {/* Second pixel headline — like "PREVENT." */}
          <h1
            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-wide"
            style={{ fontFamily: "var(--font-pixel)", fontWeight: 900 }}
          >
            DOT MATRIX
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-[15px] text-[#737373] max-w-md mx-auto leading-relaxed">
            TEXA brings AI to a new era of desktop automation<br />
            beyond the code editor.
          </p>

          {/* CTA Button — PlayerZero style: black bg, rounded, with small red/orange icon */}
          <div className="mt-8 flex justify-center">
            <Link to="/app">
              <button className="inline-flex items-center gap-2.5 bg-[#0a0a0a] text-white text-[13px] font-medium px-5 py-2.5 rounded-lg hover:bg-[#262626] transition-colors">
                <span className="h-5 w-5 rounded bg-[#ea580c] grid place-items-center shrink-0">
                  <Mic className="h-3 w-3 text-white" />
                </span>
                Launch Texa
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TEXT LOOP BANNER ── */}
      <section className="py-1 my-6 overflow-hidden flex items-center justify-center bg-transparent">
        <div className="w-full h-[160px]">
          <TextLoop
            text="TEXA OS ✦ AUTO PILOT ✦ SELF-IMPROVING ✦ SYSTEM DISPATCHER ✦ NATIVE DESKTOP AUTOMATION ✦ VOICE ORCHESTRATOR"
            shape="wave"
            curviness={60}
            speed={40}
            fontSize={36}
            fontWeight={900}
            color="#ea580c"
            ribbon={true}
            ribbonColor="#ffffff"
            ribbonWidth={90}
            uppercase
            style={{ height: '160px' }}
          />
        </div>
      </section>

      {/* ── PARTNER CARDS ── 3-column like KeyData / Cayuse / Connect */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e5e5e5] rounded-xl overflow-hidden">
          {/* Card 1 */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-[#e5e5e5] bg-[#fafafa]">
            <div className="text-sm font-bold text-[#0a0a0a] tracking-wide mb-8" style={{ fontFamily: "var(--font-pixel)" }}>TEXA VOICE</div>
            <div className="space-y-1">
              <div className="text-4xl font-bold text-[#0a0a0a]" style={{ fontFamily: "var(--font-pixel)" }}>3x</div>
              <div className="text-[13px] text-[#737373]">Faster task resolution time</div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-[#e5e5e5] bg-[#fafafa]">
            <div className="text-sm font-bold text-[#0a0a0a] tracking-wide mb-8" style={{ fontFamily: "var(--font-pixel)" }}>ATS ENGINE</div>
            <div className="space-y-1">
              <div className="text-4xl font-bold text-[#0a0a0a]" style={{ fontFamily: "var(--font-pixel)" }}>98%</div>
              <div className="text-[13px] text-[#737373]">Resume match accuracy rate</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 bg-white flex flex-col justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[#0a0a0a] mb-3">Connect your workflows.</div>
              <p className="text-[13px] text-[#737373] leading-relaxed">
                Our agents automate, understand, and execute across browsers, desktops, and documents in any format.
              </p>
            </div>
            <div className="mt-6">
              <Link to="/app">
                <button className="inline-flex items-center gap-2 bg-white text-[#0a0a0a] text-[13px] font-medium px-4 py-2 rounded-lg border border-[#e5e5e5] hover:bg-[#f5f5f5] transition-colors">
                  <span className="h-5 w-5 rounded bg-[#ea580c] grid place-items-center shrink-0">
                    <ArrowRight className="h-3 w-3 text-white" />
                  </span>
                  Sign up
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTRODUCING SECTION ── like "Introducing Sim-1" */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0a0a0a] mb-2">Introducing TEXA v1.0</h2>
            <p className="text-3xl sm:text-4xl leading-snug">
              <span className="text-[#a3a3a3]">Our smartest agents<br/>capable of </span>
              <span className="text-[#0a0a0a] font-semibold">automating<br/>how work gets done</span>
            </p>
            <p className="mt-8 text-[13px] text-[#737373] leading-relaxed max-w-sm">
              A new category of AI models built to understand and predict how desktop operating systems behave in complex, real-world scenarios.
            </p>
            <div className="mt-6">
              <Link to="/app">
                <button className="inline-flex items-center gap-2 bg-white text-[#0a0a0a] text-[13px] font-medium px-4 py-2 rounded-lg border border-[#e5e5e5] hover:bg-[#f5f5f5] transition-colors">
                  <span className="h-5 w-5 rounded bg-[#ea580c] grid place-items-center shrink-0">
                    <ArrowRight className="h-3 w-3 text-white" />
                  </span>
                  Read More
                </button>
              </Link>
            </div>
          </div>

          {/* Right side — halftone world map like PlayerZero */}
          <div className="relative h-[300px] overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#fafafa]/50">
            <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-xs text-[#737373] font-mono">
              [ NATIVE SYSTEM PIPELINE CRAWLER ]
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM HERO ── like "Debug any problem down to a line of code" */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#e5e5e5]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl leading-snug">
              <span className="text-[#0a0a0a] font-semibold">Automate any workflow<br/>down to a single click, </span>
              <span className="text-[#a3a3a3]">and make sure it<br/>never fails again</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="text-[13px] text-[#737373] leading-relaxed max-w-sm">
              The first-of-its-kind agentic system that can understand and predict state in large distributed desktop and browser environments.
            </p>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES GRID ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#e5e5e5]">
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-[#0a0a0a]">Capabilities</h2>
          <p className="text-[13px] text-[#737373] mt-2">Built for safe native desktop and smart browser execution.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#e5e5e5]">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="bg-white p-8 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-9 w-9 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5] grid place-items-center mb-5">
                <f.icon className="h-4 w-4 text-[#0a0a0a]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#0a0a0a] mb-2">{f.title}</h3>
              <p className="text-[13px] text-[#737373] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-[#e5e5e5] flex items-center justify-between">
        <span className="text-[12px] text-[#a3a3a3]">© 2026 TEXA OS · Self-Improving Executive Assistant</span>
        <div className="flex items-center gap-6 text-[12px] text-[#a3a3a3]">
          <span className="hover:text-[#0a0a0a] cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-[#0a0a0a] cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-[#0a0a0a] cursor-pointer transition-colors">Contact</span>
        </div>
      </footer>
      </div>
    </div>
  );
}
