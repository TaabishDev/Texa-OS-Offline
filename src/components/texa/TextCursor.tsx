import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Using standard framer-motion since 'motion' installs 'framer-motion'

interface TextCursorProps {
  text: string;
  spacing?: number;
  followMouseDirection?: boolean;
  randomFloat?: boolean;
  exitDuration?: number;
  removalInterval?: number;
  maxPoints?: number;
}

interface TrailItem {
  id: number;
  x: number;
  y: number;
  angle: number;
  randomX?: number;
  randomY?: number;
  randomRotate?: number;
}

export default function TextCursor({
  text = 'AI',
  spacing = 80,
  followMouseDirection = true,
  randomFloat = true,
  exitDuration = 0.3,
  removalInterval = 20,
  maxPoints = 10,
}: TextCursorProps) {
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMoveTimeRef = useRef<number>(Date.now());
  const idCounter = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      setTrail((prev) => {
        let newTrail = [...prev];
        if (newTrail.length === 0) {
          newTrail.push({
            id: idCounter.current++,
            x: mouseX,
            y: mouseY,
            angle: 0,
            ...(randomFloat && {
              randomX: Math.random() * 10 - 5,
              randomY: Math.random() * 10 - 5,
              randomRotate: Math.random() * 10 - 5,
            }),
          });
        } else {
          const last = newTrail[newTrail.length - 1];
          const dx = mouseX - last.x;
          const dy = mouseY - last.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= spacing) {
            let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            rawAngle = ((rawAngle + 180) % 360) - 180;
            const computedAngle = followMouseDirection ? rawAngle : 0;
            const steps = Math.floor(distance / spacing);
            for (let i = 1; i <= steps; i++) {
              const t = (spacing * i) / distance;
              const newX = last.x + dx * t;
              const newY = last.y + dy * t;
              newTrail.push({
                id: idCounter.current++,
                x: newX,
                y: newY,
                angle: computedAngle,
                ...(randomFloat && {
                  randomX: Math.random() * 10 - 5,
                  randomY: Math.random() * 10 - 5,
                  randomRotate: Math.random() * 10 - 5,
                }),
              });
            }
          }
        }
        if (newTrail.length > maxPoints) {
          newTrail = newTrail.slice(newTrail.length - maxPoints);
        }
        return newTrail;
      });
      lastMoveTimeRef.current = Date.now();
    };

    // Attach globally so it works across the entire screen
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [spacing, followMouseDirection, randomFloat, maxPoints]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastMoveTimeRef.current > 100) {
        setTrail((prev) => (prev.length > 0 ? prev.slice(1) : prev));
      }
    }, removalInterval);
    return () => clearInterval(interval);
  }, [removalInterval]);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {trail.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.5, rotate: item.angle }}
            animate={{
              opacity: 0.75,
              scale: 1,
              x: randomFloat ? [0, item.randomX || 0, 0] : 0,
              y: randomFloat ? [0, item.randomY || 0, 0] : 0,
              rotate: randomFloat
                ? [item.angle, item.angle + (item.randomRotate || 0), item.angle]
                : item.angle,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              opacity: { duration: exitDuration, ease: 'easeOut' },
              ...(randomFloat && {
                x: {
                  duration: 2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'mirror',
                },
                y: {
                  duration: 2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'mirror',
                },
                rotate: {
                  duration: 2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'mirror',
                },
              }),
            }}
            className="absolute select-none whitespace-nowrap text-xs font-pixel text-[#ea580c]"
            style={{ left: item.x, top: item.y }}
          >
            {text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
