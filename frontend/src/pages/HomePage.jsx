import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotebookCover from "../components/NotebookCover";
import { useNotebooks } from "../context/NotebooksContext";
import { hasBookmark } from "../lib/bookmarks";
import { playPaperTick } from "../lib/sounds";

const ROTS = [-7, -2, 3, -4, 2, -3, 4];

// red ribbon bookmark peeking from the top of a cover
const Ribbon = () => (
  <svg className="absolute -top-[2px] right-[18%] w-[9%] z-10 drop-shadow-sm" viewBox="0 0 20 46">
    <path d="M0 0 H20 V40 L10 32 L0 40 Z" fill="#d3232f" />
    <path d="M0 0 H20 V6 H0 Z" fill="#b01c27" />
  </svg>
);

// hand-drawn ink arrow pointing down at the stack
const InkArrow = () => (
  <svg viewBox="0 0 120 64" className="w-[80px] mx-auto mt-1 opacity-75" aria-hidden="true">
    <path d="M62 4 C 34 16, 42 40, 58 54" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M49 47 L58 54 L61 43" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// unified ink annotations — one tone, all typographic, like margin notes on the desk
const DeskScene = ({ mx, my }) => (
  <div className="absolute inset-0 pointer-events-none select-none text-neutral-400 dark:text-neutral-500" aria-hidden="true">
    {/* invitation above the stack */}
    <div className="absolute left-1/2 text-center" style={{ top: "8%", transform: `translateX(-50%) translate(${mx * -7}px, ${my * -4}px)` }}>
      <p className="font-mono-ui text-[9px] tracking-[0.34em] uppercase">the field logs of</p>
      <p className="font-logo text-[28px] text-neutral-700 dark:text-neutral-300 leading-tight mt-0.5">Juan</p>
      <InkArrow />
    </div>

    {/* left margin note */}
    <div className="absolute hidden md:block" style={{ left: "24%", top: "40%", transform: `rotate(-3deg) translate(${mx * 10}px, ${my * 7}px)` }}>
      <p className="font-hand text-[18px] leading-snug text-right">stories, poems, and<br />things kind people said —</p>
      <svg viewBox="0 0 120 10" className="w-[110px] mt-1 ml-auto opacity-60">
        <path d="M2 6 C 30 2, 60 9, 118 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="5 4" />
      </svg>
    </div>

    {/* right margin note */}
    <p className="absolute hidden md:block font-hand text-[17px]" style={{ right: "22%", top: "54%", transform: `rotate(2.5deg) translate(${mx * -11}px, ${my * -6}px)` }}>
      mostly written at 3 AM ✳
    </p>

    {/* stamp, bottom-left — like the inside cover boxes */}
    <div className="absolute hidden sm:block" style={{ left: "25%", bottom: "16%", transform: `rotate(-4deg) translate(${mx * 8}px, ${my * 6}px)` }}>
      <div className="border-[1.5px] border-current rounded-[3px] px-3 py-1.5 opacity-70">
        <p className="font-mono-ui text-[8px] tracking-[0.28em] uppercase">Field Log</p>
        <p className="font-mono-ui text-[7px] tracking-[0.2em] uppercase mt-0.5">est. 2024 · Indonesia</p>
      </div>
    </div>

    {/* tiny instruction, bottom-right */}
    <p className="absolute hidden sm:block font-mono-ui text-[8.5px] tracking-[0.26em] uppercase" style={{ right: "24%", bottom: "18%", transform: `rotate(1.5deg) translate(${mx * -8}px, ${my * -5}px)` }}>
      pick one to open →
    </p>

    {/* mobile-only caption fills the lower half of the desk */}
    <div className="absolute inset-x-0 bottom-[13%] flex flex-col items-center gap-3 sm:hidden">
      <p className="font-hand text-[16px] text-center leading-snug text-neutral-400 dark:text-neutral-500 px-8">
        stories, poems &amp; things<br />kind people said —
      </p>
      <div className="border-[1.5px] border-current rounded-[3px] px-3 py-1.5 opacity-60 -rotate-2 text-center">
        <p className="font-mono-ui text-[8px] tracking-[0.28em] uppercase">Field Log</p>
        <p className="font-mono-ui text-[7px] tracking-[0.2em] uppercase mt-0.5">est. 2024 · Indonesia</p>
      </div>
      <p className="font-mono-ui text-[8.5px] tracking-[0.26em] uppercase">tap a cover to open</p>
    </div>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [mouse, setMouse] = useState({ mx: 0, my: 0 });
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  const { notebooks, loading } = useNotebooks();
  const frame = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        setMouse({ mx: e.clientX / window.innerWidth - 0.5, my: e.clientY / window.innerHeight - 0.5 });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(frame.current); };
  }, []);

  const onCardMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -py * 14, ry: px * 16 });
  };

  const n = notebooks.length;
  const spread = isMobile
    ? (n <= 3 ? 46 : n === 4 ? 39 : 33)
    : (n <= 3 ? 63 : n === 4 ? 52 : 44);

  return (
    <main className="min-h-screen flex items-center justify-center overflow-hidden relative">
      <DeskScene mx={mouse.mx} my={mouse.my} />
      {loading ? (
        <div className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">opening the drawer…</div>
      ) : (
        <div className="relative w-[min(66vw,300px)] -mt-[6vh] sm:mt-[6vh]" style={{ aspectRatio: "300/460", maxHeight: "48vh", perspective: "1200px" }}>
          {/* desk pad sheet anchoring the stack */}
          <div
            className="desk-pad absolute -inset-x-[46%] top-[-7%] bottom-[28%] rounded-xl pointer-events-none"
            style={{ transform: `rotate(-1.2deg) translate(${mouse.mx * 4}px, ${mouse.my * 3}px)`, zIndex: 0 }}
            aria-hidden="true"
          >
            <span className="absolute -top-2 left-[12%] w-14 h-4 bg-white/55 dark:bg-white/10 rotate-[-5deg] shadow-sm" />
            <span className="absolute -bottom-2 right-[14%] w-14 h-4 bg-white/55 dark:bg-white/10 rotate-[4deg] shadow-sm" />
          </div>
          {notebooks.map((nb, i) => {
            const x = (i - (n - 1) / 2) * spread;
            const rot = ROTS[i % ROTS.length];
            const isHover = hovered === nb.slug;
            const transform = isHover
              ? `translateX(${x}%) translateY(-20px) scale(1.08) rotate(0deg) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
              : `translateX(${x}%) rotate(${rot}deg)`;
            return (
              <button
                key={nb.id}
                data-testid={`notebook-${nb.slug}`}
                aria-label={`Open ${nb.label} notebook`}
                onMouseEnter={() => { setHovered(nb.slug); playPaperTick(); }}
                onMouseLeave={() => { setHovered(null); setTilt({ rx: 0, ry: 0 }); }}
                onMouseMove={isHover ? onCardMove : undefined}
                onClick={() => navigate(`/notebook/${nb.slug}`)}
                className="absolute top-0 w-[62%] cursor-pointer notebook-slot focus:outline-none"
                style={{
                  left: "19%",
                  zIndex: isHover ? 50 : 40 - i * 5,
                  transform,
                  transformStyle: "preserve-3d",
                  filter: isHover ? "drop-shadow(0 30px 30px rgba(0,0,0,0.22))" : "none",
                }}
              >
                {hasBookmark(nb.slug) && <Ribbon />}
                <NotebookCover variant={nb.variant} label={nb.label} coverTitle={nb.cover_title} subtitle={nb.subtitle} />
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default HomePage;
