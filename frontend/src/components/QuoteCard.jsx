import React, { useEffect, useRef, useState } from "react";
import { useSite } from "../context/SiteContext";
import { X, Download } from "lucide-react";

// Renders a selected quote onto a canvas as a shareable card (client-side only)
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
};

const QuoteCard = ({ quote, title, onClose }) => {
  const { site } = useSite();
  const wordmark = `${site.owner_name || "Juan Maulana"} \u00B7 ${site.site_name}`.toUpperCase();
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draw = async () => {
      try { await document.fonts.load("600 64px Caveat"); await document.fonts.load("400 30px 'IBM Plex Mono'"); } catch { /* noop */ }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 1080, H = 1080;
      const ctx = canvas.getContext("2d");
      // cream paper
      ctx.fillStyle = "#f0ebdc";
      ctx.fillRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = "rgba(120,100,70,0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // accent tape
      ctx.fillStyle = "rgba(249,75,12,0.18)";
      ctx.save();
      ctx.translate(W / 2, 92);
      ctx.rotate(-0.03);
      ctx.fillRect(-120, -26, 240, 52);
      ctx.restore();
      // big quote mark
      ctx.fillStyle = "#f94b0c";
      ctx.font = "900 150px Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText("\u201C", 90, 260);
      // quote text (handwritten)
      ctx.fillStyle = "#2a2620";
      const maxW = W - 220;
      let fontSize = 64;
      ctx.font = `600 ${fontSize}px Caveat, cursive`;
      let lines = wrapText(ctx, quote, maxW);
      while (lines.length > 9 && fontSize > 38) {
        fontSize -= 4;
        ctx.font = `600 ${fontSize}px Caveat, cursive`;
        lines = wrapText(ctx, quote, maxW);
      }
      const lh = fontSize * 1.35;
      const startY = Math.max(330, (H - lines.length * lh) / 2 + 40);
      lines.forEach((l, i) => ctx.fillText(l, 110, startY + i * lh));
      // source
      ctx.font = "700 34px Caveat, cursive";
      ctx.fillStyle = "#3a352c";
      ctx.fillText(`\u2014 ${title}`, 110, H - 170);
      ctx.font = "400 24px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "rgba(58,53,44,0.55)";
      ctx.fillText(wordmark, 110, H - 120);
      // flag dot
      ctx.fillStyle = "#e63946";
      ctx.fillRect(W - 160, H - 142, 40, 13);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(W - 160, H - 129, 40, 13);
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.strokeRect(W - 160, H - 142, 40, 26);
      setReady(true);
    };
    draw();
  }, [quote, title, wordmark]);

  const download = () => {
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `fieldlog-quote-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm search-fade" />
      <div className="relative search-pop max-w-[440px] w-full" onClick={(e) => e.stopPropagation()}>
        <canvas ref={canvasRef} width={1080} height={1080} className="w-full rounded-2xl shadow-2xl" data-testid="quote-canvas" />
        <div className="mt-3 flex items-center justify-center gap-2">
          <button data-testid="quote-download-btn" onClick={download} disabled={!ready} className="pill-dark h-10 px-5 gap-2 text-[11px] font-mono-ui uppercase tracking-[0.12em]">
            <Download size={13} /> Download card
          </button>
          <button onClick={onClose} aria-label="Close" className="reader-ctl">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteCard;
