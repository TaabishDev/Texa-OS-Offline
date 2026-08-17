import orbImg from "@/assets/texa-orb-amber.png";
import { cn } from "@/lib/utils";

type OrbState = "idle" | "listening" | "thinking" | "speaking";

export function Orb({
  size = 280,
  state = "idle",
  className,
}: {
  size?: number;
  state?: OrbState;
  className?: string;
}) {
  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {/* halo */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "var(--gradient-orb)",
          filter: "blur(28px)",
          opacity: state === "idle" ? 0.7 : 0.95,
          transition: "opacity .3s",
        }}
      />
      {/* spinning rings */}
      <div
        className="absolute rounded-full border animate-orb-spin"
        style={{
          width: size * 1.08,
          height: size * 1.08,
          borderColor: "var(--color-neon-soft)",
        }}
      />
      <div
        className="absolute rounded-full border animate-orb-spin"
        style={{
          width: size * 1.22,
          height: size * 1.22,
          borderColor: "oklch(0.68 0.22 35 / 0.08)",
          animationDirection: "reverse",
          animationDuration: "60s",
        }}
      />
      {/* core image */}
      <img
        src={orbImg}
        alt="Texa AI orb"
        width={size}
        height={size}
        className={cn(
          "relative z-10 select-none pointer-events-none drop-shadow-[0_8px_32px_rgba(234,88,12,0.2)] rounded-full",
          "animate-orb-float animate-orb-pulse",
          state === "thinking" && "animate-orb-spin",
        )}
        style={{ width: size, height: size }}
      />
      {/* pulsing dots when listening */}
      {state === "listening" && (
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="rounded-full"
            style={{
              width: size * 0.4,
              height: size * 0.4,
              boxShadow: "0 0 0 0 var(--color-neon)",
              animation: "pulse-ring 1.6s ease-out infinite",
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 var(--color-neon-soft); }
          100% { box-shadow: 0 0 0 ${size * 0.4}px transparent; }
        }
      `}</style>
    </div>
  );
}
