import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, List, Minus, Plus, Moon, Sun, ChevronLeft, ChevronRight } from "lucide-react";

/*
  Immersive fullscreen reader.
  - warm paper / dark ink modes
  - font size controls
  - chapter navigation (for chaptered works) with animated transitions
  - reading progress bar
*/
const Reader = ({ entry, notebookLabel, onClose }) => {
  const hasChapters = entry.chapters && entry.chapters.length > 0;
  const [chapter, setChapter] = useState(-1); // -1 = title page
  const [fontSize, setFontSize] = useState(18);
  const [ink, setInk] = useState(false); // dark ink mode
  const [showToc, setShowToc] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef(null);

  const isPoem = (entry.category || "").toLowerCase().includes("poet");

  const goChapter = useCallback(
    (i) => {
      const max = hasChapters ? entry.chapters.length - 1 : -1;
      setChapter(Math.max(-1, Math.min(max, i)));
      setShowToc(false);
      if (scrollRef.current) scrollRef.current.scrollTo({ top: 0 });
    },
    [hasChapters, entry]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (hasChapters) {
        if (e.key === "ArrowRight") goChapter(chapter + 1);
        if (e.key === "ArrowLeft") goChapter(chapter - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goChapter, chapter, hasChapters]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? el.scrollTop / max : 1);
  };

  const currentChapter = hasChapters && chapter >= 0 ? entry.chapters[chapter] : null;
  const bodyText = currentChapter ? currentChapter.body : entry.body;

  return (
    <div
      data-testid="reader-overlay"
      className={`fixed inset-0 z-[100] reader-enter ${ink ? "bg-[#141210]" : "bg-[#f6f1e7]"} transition-colors duration-500`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* paper grain */}
      <div className="absolute inset-0 pointer-events-none reader-grain" />
      {/* progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-black/5 z-20">
        <div className="h-full bg-[#f94b0c] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-mono-ui text-[9px] tracking-[0.2em] uppercase truncate ${ink ? "text-neutral-500" : "text-neutral-400"}`}>
            {notebookLabel} · {entry.category || "piece"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasChapters && (
            <button data-testid="reader-toc-btn" onClick={() => setShowToc((v) => !v)} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Chapters">
              <List size={14} />
            </button>
          )}
          <button data-testid="reader-font-minus" onClick={() => setFontSize((s) => Math.max(14, s - 2))} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Smaller text">
            <Minus size={14} />
          </button>
          <button data-testid="reader-font-plus" onClick={() => setFontSize((s) => Math.min(26, s + 2))} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Larger text">
            <Plus size={14} />
          </button>
          <button data-testid="reader-ink-toggle" onClick={() => setInk((v) => !v)} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Toggle ink mode">
            {ink ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button data-testid="reader-close" onClick={onClose} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Close reader">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* chapters panel */}
      {hasChapters && (
        <div
          className={`absolute top-16 right-4 sm:right-6 z-30 w-64 rounded-2xl shadow-xl border transition-all duration-300 origin-top-right ${
            showToc ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          } ${ink ? "bg-[#1e1b18] border-white/10" : "bg-white border-neutral-200"}`}
        >
          <p className={`font-mono-ui text-[9px] tracking-[0.2em] uppercase px-4 pt-3 pb-1 ${ink ? "text-neutral-500" : "text-neutral-400"}`}>Chapters</p>
          <div className="p-2 max-h-[50vh] overflow-y-auto">
            <button onClick={() => goChapter(-1)} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-serif-read transition-colors ${chapter === -1 ? "bg-[#f94b0c]/10 text-[#f94b0c]" : ink ? "text-neutral-300 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100"}`}>
              Title page
            </button>
            {entry.chapters.map((c, i) => (
              <button key={i} data-testid={`reader-chapter-${i}`} onClick={() => goChapter(i)} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-serif-read transition-colors ${chapter === i ? "bg-[#f94b0c]/10 text-[#f94b0c]" : ink ? "text-neutral-300 hover:bg-white/5" : "text-neutral-700 hover:bg-neutral-100"}`}>
                {c.title || `Chapter ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* content */}
      <div ref={scrollRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto z-10">
        <div key={chapter} className="reader-page-enter mx-auto max-w-[620px] px-6 pt-28 pb-32">
          {chapter === -1 ? (
            <div className={`text-center ${isPoem ? "" : "min-h-[50vh]"} flex flex-col items-center justify-center`}>
              <p className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-[#f94b0c] mb-6">{entry.category}</p>
              <h1 className={`font-cover text-[clamp(28px,5vw,46px)] leading-tight mb-4 ${ink ? "text-neutral-100" : "text-neutral-900"}`}>{entry.title}</h1>
              {entry.meta && <p className={`font-hand text-[22px] mb-2 ${ink ? "text-neutral-400" : "text-neutral-500"}`}>{entry.meta}</p>}
              <p className={`font-mono-ui text-[10px] tracking-[0.18em] uppercase ${ink ? "text-neutral-600" : "text-neutral-400"}`}>{entry.date}</p>
              {hasChapters ? (
                <button data-testid="reader-begin" onClick={() => goChapter(0)} className="pill-dark h-10 px-6 mt-10 gap-2 text-[11px] font-mono-ui tracking-[0.14em] uppercase">
                  Begin reading <ChevronRight size={13} />
                </button>
              ) : (
                <div className={`mt-12 text-left w-full font-serif-read whitespace-pre-line ${isPoem ? "text-center" : ""} ${ink ? "text-neutral-200" : "text-neutral-800"}`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }}>
                  {entry.body}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="font-mono-ui text-[10px] tracking-[0.24em] uppercase text-[#f94b0c] mb-2">{entry.title}</p>
              <h2 className={`font-cover text-[clamp(20px,3.4vw,30px)] leading-tight mb-8 ${ink ? "text-neutral-100" : "text-neutral-900"}`}>
                {currentChapter.title || `Chapter ${chapter + 1}`}
              </h2>
              <div className={`font-serif-read whitespace-pre-line drop-cap ${ink ? "text-neutral-200" : "text-neutral-800"}`}
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.95 }}>
                {bodyText}
              </div>
              <div className="mt-14 flex items-center justify-between">
                <button onClick={() => goChapter(chapter - 1)} className={`reader-ctl gap-1.5 px-4 w-auto ${ink ? "reader-ctl-dark" : ""}`}>
                  <ChevronLeft size={13} /> <span className="font-mono-ui text-[10px] uppercase tracking-wider">Prev</span>
                </button>
                <span className={`font-hand text-[18px] ${ink ? "text-neutral-500" : "text-neutral-400"}`}>{chapter + 1} of {entry.chapters.length}</span>
                {chapter < entry.chapters.length - 1 ? (
                  <button data-testid="reader-next-chapter" onClick={() => goChapter(chapter + 1)} className={`reader-ctl gap-1.5 px-4 w-auto ${ink ? "reader-ctl-dark" : ""}`}>
                    <span className="font-mono-ui text-[10px] uppercase tracking-wider">Next</span> <ChevronRight size={13} />
                  </button>
                ) : (
                  <button onClick={onClose} className="pill-dark h-8 px-4 text-[10px] font-mono-ui uppercase tracking-wider">The end · Close</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reader;
