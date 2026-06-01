"use client";

import { useEffect, useRef } from "react";

export default function DotBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouse = useRef({ x: -9999, y: -9999, px: -9999, py: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const spacing = 28;

    let dots: {
      baseX: number;
      baseY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
    }[] = [];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvasRef.current!.width = width;
      canvasRef.current!.height = height;

      dots = [];

      for (let x = 0; x < width + spacing; x += spacing) {
        for (let y = 0; y < height + spacing; y += spacing) {
          dots.push({
            baseX: x,
            baseY: y,
            x,
            y,
            vx: 0,
            vy: 0,
          });
        }
      }
    }

    function moveMouse(e: MouseEvent) {
      mouse.current = {
        px: mouse.current.x,
        py: mouse.current.y,
        x: e.clientX,
        y: e.clientY,
      };
    }

    function animate() {
      ctx!.clearRect(0, 0, width, height);

      const mx = mouse.current.x;
      const my = mouse.current.y;
      const mvx = mouse.current.x - mouse.current.px;
      const mvy = mouse.current.y - mouse.current.py;

      for (const dot of dots) {
        const dx = dot.x - mx;
        const dy = dot.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const radius = 65;

        if (dist < radius) {
          const force = (1 - dist / radius) * 0.14;
          dot.vx += mvx * force;
          dot.vy += mvy * force;
        }

        dot.vx += (dot.baseX - dot.x) * 0.028;
        dot.vy += (dot.baseY - dot.y) * 0.028;

        dot.vx *= 0.82;
        dot.vy *= 0.82;

        dot.x += dot.vx;
        dot.y += dot.vy;

        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, 1.15, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.20)";
        ctx!.fill();
      }

      requestAnimationFrame(animate);
    }

    resize();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", moveMouse);

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", moveMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}