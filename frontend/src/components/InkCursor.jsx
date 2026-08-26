import React, { useEffect, useRef } from "react";

// Ink-trail cursor: canvas overlay drawing a fading ink stroke behind the pointer.
// Desktop only (skips touch devices). The pointer itself becomes a pen nib via CSS.
const InkCursor = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return; // skip touch
    const canvas = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext("2d");
    let points = [];
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e) => {
      points.push({ x: e.clientX, y: e.clientY, t: Date.now() });
      if (points.length > 40) points.shift();
    };
    window.addEventListener("mousemove", onMove);

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const now = Date.now();
      points = points.filter((p) => now - p.t < 650);
      if (points.length > 1) {
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const age = (now - p1.t) / 650; // 0 fresh .. 1 old
          ctx.strokeStyle = `rgba(40, 36, 30, ${(1 - age) * 0.35})`;
          ctx.lineWidth = Math.max(0.5, (1 - age) * 2.2);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    document.documentElement.classList.add("pen-cursor");
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("pen-cursor");
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[80] pointer-events-none" aria-hidden="true" />;
};

export default InkCursor;
