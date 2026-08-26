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

// decorative desk props with gentle parallax
const DeskProps = ({ mx, my }) => (
  <div className="absolute inset-0 pointer-events-none hidden sm:block" aria-hidden="true">
    {/* coffee ring stain */}
    <svg className="absolute" style={{ left: "16%", top: "22%", width: 110, transform: `translate(${mx * -14}px, ${my * -10}px)` }} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="38" fill="none" stroke="#8a6a3f" strokeOpacity="0.18" strokeWidth="7" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#8a6a3f" strokeOpacity="0.08" strokeWidth="3" />
    </svg>
    {/* pencil */}
    <svg className="absolute" style={{ right: "14%", top: "62%", width: 190, transform: `rotate(24deg) translate(${mx * 18}px, ${my * 12}px)` }} viewBox="0 0 200 22">
      <rect x="18" y="6" width="150" height="10" rx="2" fill="#e8b04b" />
      <rect x="18" y="6" width="150" height="3.5" rx="1.5" fill="#f3c86e" />
      <polygon points="18,6 2,11 18,16" fill="#e7cfa8" />
      <polygon points="7,9.4 2,11 7,12.6" fill="#3a352c" />
      <rect x="168" y="5" width="10" height="12" rx="2" fill="#c9c2b8" />
      <rect x="178" y="6" width="14" height="10" rx="4" fill="#e77e74" />
    </svg>
    {/* paperclip */}
    <svg className="absolute" style={{ left: "24%", bottom: "18%", width: 42, transform: `rotate(-18deg) translate(${mx * 10}px, ${my * 14}px)` }} viewBox="0 0 24 48">
      <path d="M7 10 v26 a5 5 0 0 0 10 0 V8 a8 8 0 0 0 -16 0 v30" fill="none" stroke="#9aa2ad" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
    {/* washi tape */}
    <div className="absolute" style={{ right: "22%", top: "18%", transform: `rotate(-8deg) translate(${mx * -10}px, ${my * -8}px)` }}>
      <div className="w-[90px] h-[26px] bg-[#f94b0c]/15 border-x-[3px] border-dashed border-[#f94b0c]/20" />
    </div>
    {/* tiny handwritten note */}
    <p className="absolute font-hand text-[15px] text-neutral-400 -rotate-6" style={{ left: "13%", bottom: "30%", transform: `translate(${mx * 8}px, ${my * 8}px)` }}>
      pick a notebook →
    </p>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [mouse, setMouse] = useState({ mx: 0, my: 0 });
  const { notebooks, loading } = useNotebooks();
  const frame = useRef(null);

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
  const spread = n <= 3 ? 63 : n === 4 ? 52 : 44;

  return (
    <main className="min-h-screen flex items-center justify-center overflow-hidden relative">
      <DeskProps mx={mouse.mx} my={mouse.my} />
      {loading ? (
        <div className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">opening the drawer…</div>
      ) : (
        <div className="relative w-[min(58vw,300px)]" style={{ aspectRatio: "300/460", maxHeight: "50vh", perspective: "1200px" }}>
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
