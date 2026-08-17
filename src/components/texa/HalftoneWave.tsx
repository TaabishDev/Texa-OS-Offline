import { useEffect, useRef } from "react";

export function HalftoneWave({
  dotColor = "rgba(0, 0, 0, 0.07)",
  accentColor = "rgba(234, 88, 12, 0.3)",
  spacing = 24,
}: {
  dotColor?: string;
  accentColor?: string;
  spacing?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId = 0;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const mouse = { x: -1000, y: -1000, active: false };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.006;

      const cols = Math.floor(width / spacing) + 2;
      const rows = Math.floor(height / spacing) + 2;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const gridX = c * spacing;
          const gridY = r * spacing;

          const waveX = Math.sin(c * 0.12 + time) * 4;
          const waveY = Math.cos(r * 0.12 + time) * 4;

          const dotX = gridX + waveX;
          const dotY = gridY + waveY;

          let size = 1.2;
          let isAccent = false;

          if (mouse.active) {
            const dx = mouse.x - dotX;
            const dy = mouse.y - dotY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 100) {
              const factor = (100 - dist) / 100;
              size = 1.2 + factor * 4;
              if (dist < 40) {
                isAccent = true;
              }
            }
          } else {
            const pulse = Math.sin(c * 0.08 + r * 0.06 + time * 1.5);
            size = 1.2 + (pulse + 1) * 0.6;
          }

          ctx.beginPath();
          ctx.arc(dotX, dotY, size, 0, Math.PI * 2);
          ctx.fillStyle = isAccent ? accentColor : dotColor;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [dotColor, accentColor, spacing]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
    />
  );
}
