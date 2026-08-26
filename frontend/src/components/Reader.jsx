import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, List, Minus, Plus, Moon, Sun, ChevronLeft, ChevronRight, CloudRain, CloudOff, Share2, SlidersHorizontal } from "lucide-react";
import { readingStats } from "../lib/reading";
import ReactionBar from "./ReactionBar";
import QuoteCard from "./QuoteCard";
import { saveReaderPos, getReaderPos } from "../lib/bookmarks";
import Portal from "./Portal";

// Reader preferences outlive a single sitting — a reader who sized the text up
// once should not have to do it again on their next visit.
const PREF_KEY = "reader_prefs";
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; }
};
const savePrefs = (patch) => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ ...loadPrefs(), ...patch })); } catch { /* private mode */ }
};
const siteIsDark = () => document.documentElement.classList.contains("dark");

// Where you stopped inside a chapter, not just which chapter you were on.
// Coming back to the top of a chapter you were halfway through is its own
// small punishment for closing the tab.
const scrollKey = (id) => `reader_scroll_${id}`;
const saveScroll = (id, chapter, top) => {
  try { localStorage.setItem(scrollKey(id), JSON.stringify({ chapter, top })); } catch { /* noop */ }
};
const loadScroll = (id) => {
  try { return JSON.parse(localStorage.getItem(scrollKey(id))); } catch { return null; }
};

// Synthesized rain ambience (Web Audio API - generated noise, no audio files)
const useRainSound = () => {
  const ctxRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    if (ctxRef.current) {
      try { ctxRef.current.close(); } catch (e) { /* noop */ }
      ctxRef.current = null;
    }
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      // base rain: looped filtered noise
      const seconds = 3;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < channel.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02; // brownish noise = softer rain
        channel[i] = last * 3.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 900;

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 180;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.2); // fade in

      // slow swell so the rain "breathes"
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      source.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      setPlaying(true);
    } catch (e) {
      console.error("rain sound failed", e);
    }
  }, []);

  const toggle = useCallback(() => {
    if (playing) stop();
    else start();
  }, [playing, start, stop]);

  useEffect(() => stop, [stop]); // cleanup on unmount

  return { playing, toggle };
};

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
  const [fontSize, setFontSize] = useState(() => loadPrefs().fontSize || 18);
  // Falls in line with the site's own light/dark setting unless the reader has
  // chosen otherwise here; opening a reader that flashes white on a dark site
  // is the kind of jolt that ends the immersion before it starts.
  const [ink, setInk] = useState(() => {
    const saved = loadPrefs().ink;
    return typeof saved === "boolean" ? saved : siteIsDark();
  });
  const [chromeHidden, setChromeHidden] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef(null);
  const rain = useRainSound();
  const stats = readingStats(entry);
  const [selection, setSelection] = useState(null); // {text, x, y}
  const [quoteCard, setQuoteCard] = useState(null);
  const savedPos = hasChapters ? getReaderPos(entry.id) : null;

  const onTextMouseUp = () => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (text.length >= 12 && text.length <= 400) {
      try {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        setSelection({ text, x: rect.left + rect.width / 2, y: rect.top });
      } catch { setSelection(null); }
    } else {
      setSelection(null);
    }
  };

  const isPoem = (entry.category || "").toLowerCase().includes("poet");

  const goChapter = useCallback(
    (i) => {
      const max = hasChapters ? entry.chapters.length - 1 : -1;
      const next = Math.max(-1, Math.min(max, i));
      setChapter(next);
      setShowToc(false);
      if (hasChapters && next >= 0) saveReaderPos(entry.id, next);
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

  // Restore the saved offset once the chapter's text is on the page.
  const restored = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || restored.current) return;
    const saved = loadScroll(entry.id);
    if (saved && saved.chapter === chapter && saved.top > 0) {
      restored.current = true;
      requestAnimationFrame(() => el.scrollTo({ top: saved.top }));
    }
  }, [chapter, entry.id]);

  useEffect(() => { savePrefs({ fontSize }); }, [fontSize]);
  useEffect(() => { savePrefs({ ink }); }, [ink]);

  // The controls step out of the way once you are actually reading, and come
  // back the moment you look for them — scrolling up, moving the pointer, or
  // tapping the page.
  const lastScroll = useRef(0);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? el.scrollTop / max : 1);

    const y = el.scrollTop;
    if (y > 120 && y > lastScroll.current + 8) setChromeHidden(true);
    else if (y < lastScroll.current - 8 || y <= 120) setChromeHidden(false);
    lastScroll.current = y;
    saveScroll(entry.id, chapter, y);
  };

  const revealChrome = () => setChromeHidden(false);

  // Sideways swipe turns the chapter; the arrow keys already do this with a
  // keyboard, and a phone has no arrow keys.
  const touchStart = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !hasChapters || chapter < 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Only a decisively horizontal gesture, so it never fights the scroll.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
    goChapter(dx < 0 ? chapter + 1 : chapter - 1);
  };

  const currentChapter = hasChapters && chapter >= 0 ? entry.chapters[chapter] : null;
  const bodyText = currentChapter ? currentChapter.body : entry.body;

  // "How much is left" is the question a progress bar only half answers.
  const wordsLeft = Math.round(((bodyText || "").trim().split(/\s+/).filter(Boolean).length) * (1 - progress));
  const minutesLeft = Math.max(1, Math.round(wordsLeft / 200));

  return (
    <Portal>
    <div
      data-testid="reader-overlay"
      className={`fixed inset-0 z-[100] reader-enter ${ink ? "bg-[#141210]" : "bg-[#f6f1e7]"} transition-colors duration-500`}
      onClick={(e) => e.stopPropagation()}
      onMouseMove={revealChrome}
    >
      {/* paper grain */}
      <div className="absolute inset-0 pointer-events-none reader-grain" />
      {/* progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-black/5 z-20">
        <div className="h-full bg-[#f94b0c] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 reader-chrome ${chromeHidden ? "reader-chrome-hidden" : ""}`}
        onMouseEnter={revealChrome}
      >
        <div className="flex flex-col min-w-0 mr-2">
          {/* On a phone the six controls leave this a few characters wide, where
              "WRITIN…" tells the reader nothing. The time left does. */}
          <span className={`hidden sm:block font-mono-ui text-[9px] tracking-[0.2em] uppercase truncate ${ink ? "text-neutral-500" : "text-neutral-400"}`}>
            {notebookLabel} · {entry.category || "piece"}
          </span>
          {(chapter >= 0 || !hasChapters) && progress < 0.995 && (
            <span className={`font-mono-ui text-[9px] tracking-[0.2em] uppercase whitespace-nowrap sm:mt-0.5 ${ink ? "text-neutral-600" : "text-neutral-400/80"}`}>
              {minutesLeft} min left
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasChapters && (
            <button data-testid="reader-toc-btn" onClick={() => { setShowToc((v) => !v); setShowSettings(false); }} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Chapters">
              <List size={14} />
            </button>
          )}

          {/* Six controls fit a desktop bar and swamp a phone one — at 375px they
              take 312 of it, leaving the reading-time readout clipped. On small
              screens the four adjustments fold into one button. */}
          <div className="hidden sm:flex items-center gap-2">
            <button data-testid="reader-rain-toggle" onClick={rain.toggle} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""} ${rain.playing ? "ring-1 ring-[#f94b0c]" : ""}`} aria-label="Toggle rain ambience">
              {rain.playing ? <CloudRain size={14} className="text-[#f94b0c]" /> : <CloudOff size={14} />}
            </button>
            <button data-testid="reader-font-minus" onClick={() => setFontSize((v) => Math.max(14, v - 2))} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Smaller text">
              <Minus size={14} />
            </button>
            <button data-testid="reader-font-plus" onClick={() => setFontSize((v) => Math.min(26, v + 2))} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Larger text">
              <Plus size={14} />
            </button>
            <button data-testid="reader-ink-toggle" onClick={() => setInk((v) => !v)} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Toggle ink mode">
              {ink ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {/* Wrapped rather than carrying sm:hidden itself: .reader-ctl sets
              display:inline-flex from App.css, which loads after Tailwind and
              would win over the utility's display:none. */}
          <span className="sm:hidden">
            <button
              data-testid="reader-settings"
              onClick={() => { setShowSettings((v) => !v); setShowToc(false); }}
              className={`reader-ctl ${ink ? "reader-ctl-dark" : ""} ${showSettings ? "ring-1 ring-[#f94b0c]" : ""}`}
              aria-label="Reading settings"
              aria-expanded={showSettings}
            >
              <SlidersHorizontal size={14} />
            </button>
          </span>

          <button data-testid="reader-close" onClick={onClose} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Close reader">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* reading settings — the phone's version of the inline controls */}
      <div
        className={`sm:hidden absolute top-16 right-4 z-30 rounded-2xl shadow-xl border p-3 transition-all duration-300 origin-top-right ${
          showSettings ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        } ${ink ? "bg-[#1e1b18] border-white/10" : "bg-white border-neutral-200"}`}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => setFontSize((v) => Math.max(14, v - 2))} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Smaller text">
            <Minus size={14} />
          </button>
          <span className={`font-mono-ui text-[10px] tracking-[0.16em] uppercase w-10 text-center ${ink ? "text-neutral-400" : "text-neutral-500"}`}>{fontSize}px</span>
          <button onClick={() => setFontSize((v) => Math.min(26, v + 2))} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Larger text">
            <Plus size={14} />
          </button>
          <button onClick={() => setInk((v) => !v)} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""}`} aria-label="Toggle ink mode">
            {ink ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={rain.toggle} className={`reader-ctl ${ink ? "reader-ctl-dark" : ""} ${rain.playing ? "ring-1 ring-[#f94b0c]" : ""}`} aria-label="Toggle rain ambience">
            {rain.playing ? <CloudRain size={14} className="text-[#f94b0c]" /> : <CloudOff size={14} />}
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
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={(e) => { if (e.pointerType !== "mouse") setChromeHidden((v) => !v); }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="absolute inset-0 overflow-y-auto z-10"
      >
        <div key={chapter} className="reader-page-enter mx-auto max-w-[620px] px-6 pt-28 pb-32">
          {chapter === -1 ? (
            <div className={`text-center ${isPoem ? "" : "min-h-[50vh]"} flex flex-col items-center justify-center`}>
              <p className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-[#f94b0c] mb-6">{entry.category}</p>
              <h1 className={`font-cover text-[clamp(28px,5vw,46px)] leading-tight mb-4 ${ink ? "text-neutral-100" : "text-neutral-900"}`}>{entry.title}</h1>
              {entry.meta && <p className={`font-hand text-[22px] mb-2 ${ink ? "text-neutral-400" : "text-neutral-500"}`}>{entry.meta}</p>}
              <p className={`font-mono-ui text-[10px] tracking-[0.18em] uppercase ${ink ? "text-neutral-600" : "text-neutral-400"}`}>{entry.date}</p>
              <p data-testid="reader-stats" className={`font-mono-ui text-[10px] tracking-[0.18em] uppercase mt-2 ${ink ? "text-neutral-600" : "text-neutral-400"}`}>{stats.label}</p>
              {hasChapters ? (
                <div className="flex flex-col items-center gap-3 mt-10">
                  <button data-testid="reader-begin" onClick={() => goChapter(0)} className="pill-dark h-10 px-6 gap-2 text-[11px] font-mono-ui tracking-[0.14em] uppercase">
                    Begin reading <ChevronRight size={13} />
                  </button>
                  {savedPos !== null && savedPos >= 0 && (
                    <button data-testid="reader-continue" onClick={() => goChapter(savedPos)} className={`reader-ctl gap-2 px-4 w-auto ${ink ? "reader-ctl-dark" : ""}`}>
                      <span className="font-mono-ui text-[10px] uppercase tracking-wider">Continue · {entry.chapters[savedPos] && entry.chapters[savedPos].title ? entry.chapters[savedPos].title : `Chapter ${savedPos + 1}`}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div onMouseUp={onTextMouseUp} className={`mt-12 text-left w-full font-serif-read whitespace-pre-line ${isPoem ? "text-center" : ""} ${ink ? "text-neutral-200" : "text-neutral-800"}`}
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }}>
                    {entry.body}
                  </div>
                  <ReactionBar entryId={entry.id} ink={ink} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="font-mono-ui text-[10px] tracking-[0.24em] uppercase text-[#f94b0c] mb-2">{entry.title}</p>
              <h2 className={`font-cover text-[clamp(20px,3.4vw,30px)] leading-tight mb-8 ${ink ? "text-neutral-100" : "text-neutral-900"}`}>
                {currentChapter.title || `Chapter ${chapter + 1}`}
              </h2>
              <div onMouseUp={onTextMouseUp} className={`font-serif-read whitespace-pre-line drop-cap ${ink ? "text-neutral-200" : "text-neutral-800"}`}
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
              {chapter === entry.chapters.length - 1 && <ReactionBar entryId={entry.id} ink={ink} />}
            </div>
          )}
        </div>
      </div>

      {/* floating share-quote button near text selection */}
      {selection && !quoteCard && (
        <button
          data-testid="share-quote-btn"
          onClick={() => { setQuoteCard(selection.text); setSelection(null); }}
          className="fixed z-[110] pill-dark h-9 px-4 gap-1.5 text-[10px] font-mono-ui uppercase tracking-[0.12em] search-pop"
          style={{ left: Math.max(12, Math.min(window.innerWidth - 160, selection.x - 70)), top: Math.max(60, selection.y - 46) }}
        >
          <Share2 size={12} /> Quote card
        </button>
      )}

      {quoteCard && (
        <QuoteCard quote={quoteCard} title={entry.title} onClose={() => setQuoteCard(null)} />
      )}
    </div>
    </Portal>
  );
};

export default Reader;
