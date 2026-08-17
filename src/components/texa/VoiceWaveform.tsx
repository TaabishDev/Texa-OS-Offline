import { useEffect, useRef } from "react";

export function VoiceWaveform({
  active,
  color = "rgba(10, 10, 10, 0.9)", // Default dark gray to match PlayerZero
  bars = 28,
  className,
}: {
  active: boolean;
  color?: string;
  bars?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let dataArray: Uint8Array | null = null;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    async function setupMicrophone() {
      if (!active) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch {
        // Fallback to simulated data if mic is denied
        dataArray = null;
      }
    }

    setupMicrophone();

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      phase += 0.15;

      const dArray = dataArray;
      if (analyser && dArray) {
        analyser.getByteFrequencyData(dArray);
      }

      // Draw premium multi-layered sine wave frequency visualizer
      if (active) {
        ctx.lineWidth = 1.5;
        const layers = [
          { opacity: 0.15, amplitudeMultiplier: 0.3, freqMultiplier: 0.5 },
          { opacity: 0.35, amplitudeMultiplier: 0.6, freqMultiplier: 1.2 },
          { opacity: 0.75, amplitudeMultiplier: 1.0, freqMultiplier: 2.0 },
        ];

        layers.forEach((layer) => {
          ctx.beginPath();
          ctx.strokeStyle = color.replace(/[\d.]+\)$/, `${layer.opacity})`);

          for (let x = 0; x < width; x++) {
            const normalizedX = x / width;
            // Get frequency volume factor
            let freqVolume = 10;
            if (analyser && dArray) {
              const dataIdx = Math.floor(normalizedX * dArray.length);
              freqVolume = dArray[dataIdx] || 10;
            } else {
              // Simulated volume factor if microphone is offline
              freqVolume = 40 + Math.sin(phase + normalizedX * 10) * 15;
            }

            // Create a bell-curve mask so waves taper off at edges
            const mask = Math.pow(Math.sin(normalizedX * Math.PI), 2);
            const amplitude = (freqVolume / 2) * layer.amplitudeMultiplier * mask;
            const y = height / 2 + Math.sin(normalizedX * Math.PI * 4 * layer.freqMultiplier + phase) * amplitude;

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        });
      } else {
        // Draw static/idle dither waves
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(0, height / 2);
        for (let x = 0; x < width; x++) {
          const norm = x / width;
          const mask = Math.pow(Math.sin(norm * Math.PI), 1.5);
          const y = height / 2 + Math.sin(norm * Math.PI * 4 + phase * 0.2) * 3 * mask;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
    };
  }, [active, color, bars]);

  return (
    <div className={`relative w-full h-12 flex items-center justify-center ${className ?? ""}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
