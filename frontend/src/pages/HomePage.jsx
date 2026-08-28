import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NotebookCover from "../components/NotebookCover";
import { useNotebooks } from "../context/NotebooksContext";
import { hasBookmark } from "../lib/bookmarks";
import { playPaperTick } from "../lib/sounds";
import LoadError from "../components/LoadError";

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

// `roomy` is for the phone, where the desktop stamp's 7px print is unreadable.
const Stamp = ({ className = "", roomy = false }) => (
  <div className={`border-[1.5px] border-current rounded-[3px] opacity-70 ${roomy ? "px-4 py-2" : "px-3 py-1.5"} ${className}`}>
    <p className={`font-mono-ui ${roomy ? "text-[11px]" : "text-[8px]"} tracking-[0.28em] uppercase`}>Commonplace</p>
    <p className={`font-mono-ui ${roomy ? "text-[10px]" : "text-[7px]"} tracking-[0.2em] uppercase mt-0.5`}>est. 2024 · Indonesia</p>
  </div>
);

// Desktop only: ink annotations scattered around the stack, like margin notes on a desk.
const DeskScene = ({ mx, my }) => (
  <div className="absolute inset-0 pointer-events-none select-none text-neutral-400 dark:text-neutral-500" aria-hidden="true">
    {/* invitation above the stack */}
    <div className="absolute left-1/2 text-center" style={{ top: "8%", transform: `translateX(-50%) translate(${mx * -7}px, ${my * -4}px)` }}>
      <p className="font-mono-ui text-[9px] tracking-[0.34em] uppercase">the commonplace book of</p>
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
    <div className="absolute" style={{ left: "25%", bottom: "16%", transform: `rotate(-4deg) translate(${mx * 8}px, ${my * 6}px)` }}>
      <Stamp />
    </div>

    {/* tiny instruction, bottom-right */}
    <p className="absolute font-mono-ui text-[8.5px] tracking-[0.26em] uppercase" style={{ right: "24%", bottom: "18%", transform: `rotate(1.5deg) translate(${mx * -8}px, ${my * -5}px)` }}>
      pick one to open →
    </p>
  </div>
);

/*
  Mobile shelf — a swipeable rail instead of the desktop fan.

  The fan works on a wide screen because the covers have room to spread. On a
  phone the same layout buries the second and third notebooks behind the first,
  so only the front cover is ever readable. Here each notebook gets its own
  snap position: one is centred and legible, the next peeks in from the edge to
  advertise that there is more to swipe to.

  Native scroll-snap does the work — it keeps the momentum and rubber-banding
  the platform already provides, which a JS drag handler would have to imitate.
*/
/* The way over to the other desk.

   Every notebook on this page is Juan's own hand. The Crossing is not — it is
   eighteen invented people keeping journals in an invented town, and a visitor
   who opens it expecting more of the same is owed a warning first. Hence the
   second line: it says how many hands and how much town before the click. */
const CrossingCue = ({ onOpen, className = "", style }) => (
  /* note-drop animates transform, and an animation outranks an inline style —
     so the note cannot also carry its own placement. The wrapper is where it
     sits and how it tilts; the button is only what it does. */
  <div className={className} style={style}>
    <button
      type="button"
      onClick={onOpen}
      data-testid="home-crossing-cue"
      aria-label="The Crossing — journals from another world"
      className="crossing-cue relative block bg-[#fffdf6] dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg px-5 py-2 note-drop focus:outline-none"
    >
      <span className="absolute -top-1.5 -left-3 w-8 h-3 bg-[#c3dcef]/70 dark:bg-[#c3dcef]/30 rotate-[-30deg]" aria-hidden="true" />
      <span className="absolute -top-1.5 -right-3 w-8 h-3 bg-[#f8e8a0]/80 dark:bg-[#f8e8a0]/30 rotate-[30deg]" aria-hidden="true" />
      <p className="font-hand text-[17px] leading-tight text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
        journals from another world&nbsp;<span className="cue-arrow inline-block">&rarr;</span>
      </p>
      <p className="font-mono-ui text-[8px] tracking-[0.24em] uppercase text-neutral-400 mt-0.5 whitespace-nowrap">
        18 hands · one town
      </p>
    </button>
  </div>
);

const MobileShelf = ({ notebooks, onOpen }) => {
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const frame = useRef(null);
  const lastActive = useRef(0);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < best) { best = d; nearest = i; }
    });
    // Ticking from a ref rather than inside the state updater: React may invoke an
    // updater more than once, and the sound must fire exactly once per change.
    if (lastActive.current !== nearest) {
      lastActive.current = nearest;
      playPaperTick();
    }
    setActive(nearest);
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(syncActive);
  }, [syncActive]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const scrollTo = (i) => {
    const el = slideRefs.current[i];
    const track = trackRef.current;
    if (!el || !track) return;
    track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="shelf-track w-full flex items-center gap-[5vw] overflow-x-auto snap-x snap-mandatory px-[19vw] py-5"
        style={{ perspective: "1000px" }}
      >
        {notebooks.map((nb, i) => {
          const isActive = i === active;
          return (
            <button
              key={nb.id}
              ref={(el) => { slideRefs.current[i] = el; }}
              data-testid={`notebook-${nb.slug}`}
              aria-label={`Open ${nb.label} notebook`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => (isActive ? onOpen(nb.slug) : scrollTo(i))}
              className="shelf-slot relative w-[62vw] shrink-0 snap-center focus:outline-none"
              style={{
                transform: isActive ? "scale(1) rotate(0deg)" : "scale(0.9) rotate(-2deg)",
                opacity: isActive ? 1 : 0.72,
              }}
            >
              {hasBookmark(nb.slug) && <Ribbon />}
              <NotebookCover variant={nb.variant} label={nb.label} coverTitle={nb.cover_title} subtitle={nb.subtitle} />
            </button>
          );
        })}
      </div>

      {/* which notebook you are on, and a way back to the others */}
      <div className="flex items-center gap-2 mt-1" role="tablist" aria-label="Notebooks">
        {notebooks.map((nb, i) => (
          <button
            key={nb.id}
            role="tab"
            aria-selected={i === active}
            aria-label={nb.label}
            onClick={() => scrollTo(i)}
            className={`shelf-dot h-[3px] rounded-full ${i === active ? "w-6 bg-neutral-600 dark:bg-neutral-300" : "w-[10px] bg-neutral-400/50 dark:bg-neutral-600"}`}
          />
        ))}
      </div>

      <p className="font-hand text-[15px] text-center leading-snug text-neutral-500 dark:text-neutral-400 mt-5 px-8">
        stories, poems &amp; things<br />kind people said —
      </p>

      <div className="flex flex-col items-center gap-3 mt-4 text-neutral-400 dark:text-neutral-500">
        <Stamp roomy className="-rotate-2 text-center" />
        <p className="font-mono-ui text-[11px] tracking-[0.22em] uppercase">swipe · tap to open</p>
      </div>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [mouse, setMouse] = useState({ mx: 0, my: 0 });
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  const { notebooks, loading, error, refresh } = useNotebooks();
  const frame = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isMobile) return undefined; // the parallax follows a pointer the phone does not have
    const onMove = (e) => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        setMouse({ mx: e.clientX / window.innerWidth - 0.5, my: e.clientY / window.innerHeight - 0.5 });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(frame.current); };
  }, [isMobile]);

  const onCardMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -py * 14, ry: px * 16 });
  };

  const openNotebook = (slug) => navigate(`/notebook/${slug}`);

  const n = notebooks.length;
  const spread = n <= 3 ? 63 : n === 4 ? 52 : 44;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono-ui text-[11px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">opening the drawer…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadError what="The notebooks" onRetry={refresh} />
      </main>
    );
  }

  if (isMobile) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center overflow-x-hidden pt-20 pb-6">
        <div className="text-center text-neutral-400 dark:text-neutral-500 mb-5" aria-hidden="true">
          <p className="font-mono-ui text-[10px] tracking-[0.34em] uppercase">the commonplace book of</p>
          <p className="font-logo text-[30px] text-neutral-700 dark:text-neutral-300 leading-tight mt-0.5">Juan</p>
        </div>
        <MobileShelf notebooks={notebooks} onOpen={openNotebook} />
        <CrossingCue onOpen={() => navigate("/crossing")} className="mt-5 rotate-[-1.5deg]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center overflow-hidden relative">
      <DeskScene mx={mouse.mx} my={mouse.my} />
      <div className="relative w-[min(66vw,300px)] mt-[6vh]" style={{ aspectRatio: "300/460", maxHeight: "48vh", perspective: "1200px" }}>
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
              onClick={() => openNotebook(nb.slug)}
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

      <CrossingCue
        onOpen={() => navigate("/crossing")}
        className="absolute left-1/2 bottom-[6vh] z-30"
        style={{ transform: `translateX(-50%) rotate(-1.5deg) translate(${mouse.mx * -6}px, ${mouse.my * -4}px)` }}
      />
    </main>
  );
};

export default HomePage;
