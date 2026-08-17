import { CSSProperties, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

export type TextLoopShape = 'wave' | 'circle' | 'infinity' | 'arch' | 'line';
export type TextLoopDirection = 'forward' | 'reverse';

export interface TextLoopProps {
  text?: string;
  shape?: TextLoopShape;
  path?: string;
  speed?: number;
  direction?: TextLoopDirection;
  separator?: string;
  curviness?: number;
  fontSize?: number;
  fontWeight?: number | string;
  letterSpacing?: number;
  uppercase?: boolean;
  color?: string;
  ribbon?: boolean;
  ribbonColor?: string;
  ribbonWidth?: number;
  pauseOnHover?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Metrics {
  length: number;
  reps: number;
}

const VIEW_W = 1200;
const VIEW_H = 300; // Adjusted for banner sizing
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const EDGE_PAD = 6;

const buildPath = (shape: TextLoopShape, curviness: number, ribbonWidth: number): string => {
  const c = Math.max(0, curviness);
  const room = Math.max(20, CY - Math.max(0, ribbonWidth) / 2 - EDGE_PAD);

  switch (shape) {
    case 'circle': {
      const r = Math.min(90 + c * 0.95, room);
      return `M ${CX - r} ${CY} A ${r} ${r} 0 1 1 ${CX + r} ${CY} A ${r} ${r} 0 1 1 ${CX - r} ${CY} Z`;
    }
    case 'infinity': {
      const r = 150 + c * 1.4;
      const h = Math.min(60 + c * 0.95, room);
      return [
        `M ${CX} ${CY}`,
        `C ${CX + r * 0.55} ${CY - h} ${CX + r} ${CY - h} ${CX + r} ${CY}`,
        `C ${CX + r} ${CY + h} ${CX + r * 0.55} ${CY + h} ${CX} ${CY}`,
        `C ${CX - r * 0.55} ${CY - h} ${CX - r} ${CY - h} ${CX - r} ${CY}`,
        `C ${CX - r} ${CY + h} ${CX - r * 0.55} ${CY + h} ${CX} ${CY}`,
        'Z'
      ].join(' ');
    }
    case 'arch': {
      const rise = Math.min(120 + c * 1.1, room * 2);
      return `M 120 ${CY + rise / 2} Q ${CX} ${CY - rise * 1.5} ${VIEW_W - 120} ${CY + rise / 2}`;
    }
    case 'line':
      return `M -320 ${CY} L ${VIEW_W + 320} ${CY}`;
    case 'wave':
    default: {
      const a = Math.min(c * 1.5, room * 1.5);
      return `M -320 ${CY} Q -160 ${CY - a} 0 ${CY} T 320 ${CY} T 640 ${CY} T 960 ${CY} T 1280 ${CY} T ${VIEW_W + 320} ${CY}`;
    }
  }
};

export default function TextLoop({
  text = 'TEXA OS ✦ SELF-IMPROVING ✦ NATIVE AGENT',
  shape = 'line',
  path,
  speed = 40,
  direction = 'forward',
  separator = '✦',
  curviness = 40,
  fontSize = 24,
  fontWeight = 700,
  letterSpacing = 2,
  uppercase = true,
  color = '#0a0a0a',
  ribbon = true,
  ribbonColor = '#fafafa',
  ribbonWidth = 60,
  pauseOnHover = true,
  className = '',
  style = {}
}: TextLoopProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const measureRef = useRef<SVGTextElement | null>(null);
  const headRef = useRef<SVGTextPathElement | null>(null);
  const tailRef = useRef<SVGTextPathElement | null>(null);

  const [metrics, setMetrics] = useState<Metrics>({ length: 0, reps: 1 });

  const rawId = useId();
  const pathId = `text-loop-${rawId.replace(/:/g, '')}`;

  const d = useMemo(() => path || buildPath(shape, curviness, ribbonWidth), [path, shape, curviness, ribbonWidth]);

  const unit = useMemo(() => {
    const base = uppercase ? String(text).toUpperCase() : String(text);
    const gap = separator ? `\u00A0${separator}\u00A0` : '\u00A0\u00A0\u00A0';
    return `${base}${gap}`;
  }, [text, separator, uppercase]);

  const textStyle = useMemo<CSSProperties>(
    () => ({ fontSize: `${fontSize}px`, fontWeight, letterSpacing: `${letterSpacing}px` }),
    [fontSize, fontWeight, letterSpacing]
  );

  useLayoutEffect(() => {
    const pathEl = pathRef.current;
    const measureEl = measureRef.current;
    if (!pathEl || !measureEl) return undefined;

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      let length = 0;
      let unitWidth = 0;
      try {
        length = pathEl.getTotalLength();
        unitWidth = measureEl.getComputedTextLength();
      } catch {
        return;
      }
      if (!length) return;

      const reps = unitWidth > 0 ? Math.max(1, Math.round((length * 2) / unitWidth)) : 1;
      setMetrics(prev => (prev.length === length && prev.reps === reps ? prev : { length, reps }));
    };

    measure();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [d, unit, fontSize, fontWeight, letterSpacing]);

  // Repeated string content
  const repeatedText = useMemo(() => {
    return Array(metrics.reps + 2).fill(unit).join('');
  }, [unit, metrics.reps]);

  useEffect(() => {
    const head = headRef.current;
    const tail = tailRef.current;
    if (!head || !metrics.length) return;

    const duration = metrics.length / speed;
    const startVal = direction === 'forward' ? 0 : metrics.length;
    const endVal = direction === 'forward' ? metrics.length : 0;

    const ctx = gsap.context(() => {
      // Direct tween for standard marquee effect
      gsap.fromTo(head, 
        { attr: { startOffset: startVal } },
        {
          attr: { startOffset: endVal },
          duration,
          ease: 'none',
          repeat: -1
        }
      );
    }, rootRef);

    return () => ctx.revert();
  }, [metrics.length, speed, direction]);

  return (
    <div
      ref={rootRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height: `${VIEW_H}px`, ...style }}
    >
      <svg className="w-full h-full pointer-events-none" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <defs>
          <path id={pathId} d={d} fill="none" />
        </defs>

        {ribbon && (
          <use
            href={`#${pathId}`}
            stroke={ribbonColor}
            strokeWidth={ribbonWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Measuring helper */}
        <text
          ref={measureRef}
          style={{ ...textStyle, visibility: 'hidden', position: 'absolute' }}
        >
          {unit}
        </text>

        <text fill={color} style={textStyle}>
          <textPath
            ref={headRef}
            href={`#${pathId}`}
            startOffset="0%"
          >
            {repeatedText}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
