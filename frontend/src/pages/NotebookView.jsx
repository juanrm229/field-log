import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import NotebookCover from "../components/NotebookCover";
import Reader from "../components/Reader";
import { getNotebookFull, submitIdea } from "../api";
import { readingStats } from "../lib/reading";
import { saveBookmark, getBookmark } from "../lib/bookmarks";
import { playPageFlip } from "../lib/sounds";
import { Quote, BookOpen, Lightbulb, Send, BookmarkCheck } from "lucide-react";

// ---------- responsive : spread on desktop, single page on mobile ----------
const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = (e) => setMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return mobile;
};

const buildItems = (entries, slug) => {
  const pieces = entries.filter((e) => e.type === "piece");
  const items = [{ type: "inside" }];
  if (pieces.length > 0) items.push({ type: "toc", data: pieces });
  entries.forEach((e) => items.push({ type: e.type, data: e }));
  if (slug === "writings") items.push({ type: "ideabox" });
  return items;
};

const buildViews = (items, isMobile) => {
  const views = [{ kind: "cover" }];
  if (isMobile) {
    items.forEach((it) => views.push({ kind: "single", page: it }));
  } else {
    for (let i = 0; i < items.length; i += 2) {
      views.push({ kind: "spread", left: items[i], right: items[i + 1] || { type: "blank" } });
    }
  }
  views.push({ kind: "back" });
  return views;
};

// ---------- inside front cover (BELONGS TO ...) ----------
const BoxedSection = ({ label, children }) => (
  <div className="relative border-[1.5px] border-[#33302a] px-4 pt-4 pb-3">
    <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 bg-[#f6f5f0] px-2 font-mono-ui text-[8px] tracking-[0.24em] uppercase text-[#33302a] whitespace-nowrap">
      {label}
    </span>
    {children}
  </div>
);

const DashLine = ({ children, small }) => (
  <div className={`border-b border-dashed border-neutral-400/70 ${small ? "min-h-[16px]" : "min-h-[22px]"} flex items-end pb-0.5`}>
    {children}
  </div>
);

const InsideCover = () => (
  <div className="w-full h-full bg-[#f6f5f0] flex flex-col justify-between px-[9%] py-[8%]">
    <div className="space-y-4">
      <BoxedSection label="Belongs to">
        <p className="font-logo text-[26px] text-[#1d1b17] -rotate-3 translate-y-1 pl-4">Juan</p>
        <DashLine small />
      </BoxedSection>
      <BoxedSection label="Pertinent coordinates">
        <DashLine><span className="font-hand text-[14px] text-[#1d1b17]">@kodawrites</span></DashLine>
        <DashLine><span className="font-hand text-[14px] text-[#1d1b17]">koda.substack.com</span></DashLine>
        <DashLine small />
      </BoxedSection>
      <BoxedSection label="For internal records">
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <p className="font-mono-ui text-[7px] tracking-[0.18em] uppercase text-neutral-400 mt-1">Start date</p>
            <DashLine small><span className="font-hand text-[13px] text-[#1d1b17]">the first rain of 2024</span></DashLine>
          </div>
          <div>
            <p className="font-mono-ui text-[7px] tracking-[0.18em] uppercase text-neutral-400 mt-1">Location</p>
            <DashLine small><span className="font-hand text-[13px] text-[#1d1b17]">a desk facing a wall</span></DashLine>
          </div>
          <div>
            <p className="font-mono-ui text-[7px] tracking-[0.18em] uppercase text-neutral-400 mt-2">Completion date</p>
            <DashLine small />
          </div>
          <div>
            <p className="font-mono-ui text-[7px] tracking-[0.18em] uppercase text-neutral-400 mt-2">Location</p>
            <DashLine small />
          </div>
        </div>
      </BoxedSection>
      <BoxedSection label="If misplaced">
        <p className="font-mono-ui text-[7px] tracking-[0.18em] uppercase text-neutral-400 mb-1">Please contact:</p>
        <div className="flex items-end gap-2">
          <DashLine><span className="font-hand text-[14px] text-[#1d1b17]">hello</span></DashLine>
          <span className="font-mono-ui text-[10px] text-neutral-500 pb-0.5">@</span>
          <DashLine><span className="font-hand text-[14px] text-[#1d1b17]">juanmaulana.id</span></DashLine>
        </div>
      </BoxedSection>
    </div>
    <p className="text-center font-mono-ui text-[9px] tracking-[0.3em] uppercase text-neutral-500 pt-3">juanmaulana.id</p>
  </div>
);

// ---------- content pages (cream graph paper, handwritten) ----------
const CreamPage = ({ children, pageNo }) => (
  <div className="cream-page w-full h-full flex flex-col">
    <div className="flex-1 px-[9%] pt-[9%] pb-[3%] overflow-hidden">{children}</div>
    {pageNo && (
      <p className="px-[9%] pb-[4%] text-right font-mono-ui text-[8px] text-neutral-400">{pageNo}</p>
    )}
  </div>
);

const AboutPage = ({ data }) => (
  <div>
    <h3 className="font-hand font-bold text-[24px] leading-tight text-[#2a2620] mb-3">{data.title}</h3>
    <p className="font-hand text-[16px] leading-[1.65] text-[#3a352c] whitespace-pre-line">{data.body}</p>
  </div>
);

const TocPage = ({ data, goToEntry }) => (
  <div>
    <h3 className="font-hand font-bold text-[24px] text-[#2a2620] mb-3">Contents</h3>
    <div className="space-y-[8px]">
      {data.map((w) => (
        <button
          key={w.id}
          data-testid={`toc-item-${w.id}`}
          onClick={(e) => { e.stopPropagation(); goToEntry(w.id); }}
          className="w-full flex items-baseline gap-2 text-left group"
        >
          <span className="font-hand text-[15px] text-[#3a352c] group-hover:text-[#f94b0c] transition-colors whitespace-nowrap overflow-hidden text-ellipsis underline decoration-dashed decoration-neutral-400/50 underline-offset-4">{w.title}</span>
          <span className="flex-1" />
          <span className="font-mono-ui text-[8px] uppercase tracking-wider text-neutral-400 shrink-0">{w.category}{w.category ? " · " : ""}{readingStats(w).minutes} min</span>
        </button>
      ))}
    </div>
  </div>
);

const PiecePage = ({ data, onRead }) => {
  const stats = readingStats(data);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {data.category && <span className="font-mono-ui text-[8px] tracking-[0.2em] uppercase text-white bg-[#f94b0c] px-1.5 py-0.5 rounded-sm">{data.category}</span>}
        <span className="font-mono-ui text-[8px] text-neutral-400">{data.date}</span>
      </div>
      <h3 className="font-hand font-bold text-[22px] leading-tight text-[#2a2620]">{data.title}</h3>
      <p data-testid={`stats-${data.id}`} className="font-mono-ui text-[8px] tracking-[0.12em] uppercase text-neutral-400 mb-2">{stats.label}</p>
      <p className="font-hand text-[15px] leading-[1.6] text-[#3a352c] whitespace-pre-line overflow-hidden fade-bottom flex-1">{data.body}</p>
      <div className="pt-2 flex items-center justify-between">
        {data.chapters && data.chapters.length > 0 ? (
          <span className="font-mono-ui text-[8.5px] uppercase tracking-[0.14em] text-neutral-400">{data.chapters.length} chapters</span>
        ) : <span />}
        <button
          data-testid={`read-btn-${data.id}`}
          onClick={(e) => { e.stopPropagation(); onRead(data); }}
          className="pill-dark h-8 px-4 gap-1.5 text-[10px] font-mono-ui tracking-[0.1em] uppercase"
        >
          <BookOpen size={11} /> Read
        </button>
      </div>
    </div>
  );
};

const KindPage = ({ data }) => (
  <div className="h-full flex flex-col justify-center">
    <Quote size={18} className="text-[#f94b0c] mb-3 rotate-180" />
    <p className="font-hand text-[17px] leading-[1.6] text-[#3a352c] mb-4">{data.body}</p>
    <p className="font-hand font-bold text-[18px] text-[#2a2620] leading-none">{data.title}</p>
    <p className="font-mono-ui text-[8.5px] tracking-[0.16em] uppercase text-neutral-400 mt-1">{data.meta}</p>
  </div>
);

const IdeaBoxPage = () => {
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (e) => {
    e.stopPropagation();
    if (idea.trim().length < 5 || sending) return;
    setSending(true);
    try {
      await submitIdea({ name, idea });
      toast.success("Idea dropped in the box. Thank you!");
      setName("");
      setIdea("");
    } catch {
      toast.error("Could not send the idea. Try again?");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb size={15} className="text-[#f94b0c]" />
        <h3 className="font-hand font-bold text-[22px] text-[#2a2620]">Idea box</h3>
      </div>
      <p className="font-hand text-[14.5px] leading-[1.55] text-[#3a352c] mb-3">
        Got a story you wish existed? Drop it here — Koda reads every note at 3 AM.
      </p>
      <input
        data-testid="idea-name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        className="w-full bg-transparent border-b border-dashed border-neutral-400/70 font-hand text-[15px] text-[#1d1b17] placeholder:text-neutral-400 outline-none py-1 mb-2"
      />
      <textarea
        data-testid="idea-text-input"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Once upon a time…"
        className="w-full flex-1 bg-transparent border border-dashed border-neutral-400/70 rounded-lg font-hand text-[15px] text-[#1d1b17] placeholder:text-neutral-400 outline-none p-2 resize-none min-h-[80px] focus:border-[#f94b0c] transition-colors"
      />
      <div className="pt-2 flex justify-end">
        <button
          data-testid="idea-submit-btn"
          onClick={send}
          disabled={sending || idea.trim().length < 5}
          className="pill-dark h-8 px-4 gap-1.5 text-[10px] font-mono-ui tracking-[0.1em] uppercase disabled:opacity-40"
        >
          <Send size={11} /> {sending ? "Sending…" : "Send idea"}
        </button>
      </div>
    </div>
  );
};

const BlankPage = () => (
  <div className="w-full h-full flex items-end justify-center pb-[10%]">
    <p className="font-hand text-[14px] text-neutral-400 -rotate-2">more pages coming soon…</p>
  </div>
);

// ---------- main view ----------
const NotebookView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState(0);
  const [flip, setFlip] = useState(null); // { from, dir }
  const [closing, setClosing] = useState(false);
  const [readerEntry, setReaderEntry] = useState(null);
  const [drag, setDrag] = useState(null); // { dir, angle, settling }
  const dragRef = useRef(null);
  const flipTimer = useRef(null);

  useEffect(() => {
    setData(null);
    setError(false);
    setView(0);
    setClosing(false);
    getNotebookFull(slug).then(setData).catch(() => setError(true));
  }, [slug]);

  const items = useMemo(() => (data ? buildItems(data.entries, slug) : null), [data, slug]);
  const views = useMemo(() => (items ? buildViews(items, isMobile) : null), [items, isMobile]);

  useEffect(() => setView((v) => 0), [isMobile]); // reset when layout mode flips

  const closeBook = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => navigate("/"), 520);
  }, [closing, navigate]);

  const goTo = useCallback(
    (i) => {
      if (!views || closing) return;
      if (i < 0 || i > views.length - 1) { closeBook(); return; }
      if (i === view) return;
      const dir = i > view ? "next" : "prev";
      setFlip({ from: view, dir });
      setView(i);
      playPageFlip();
      clearTimeout(flipTimer.current);
      flipTimer.current = setTimeout(() => setFlip(null), 720);
    },
    [views, view, closing, closeBook]
  );

  const findEntryView = useCallback(
    (entryId) => {
      if (!views) return -1;
      return views.findIndex((v) =>
        (v.page && v.page.data && v.page.data.id === entryId) ||
        (v.left && v.left.data && v.left.data.id === entryId) ||
        (v.right && v.right.data && v.right.data.id === entryId)
      );
    },
    [views]
  );

  const goToEntry = useCallback((entryId) => {
    const idx = findEntryView(entryId);
    if (idx >= 0) goTo(idx);
  }, [findEntryView, goTo]);

  // deep-link from search
  useEffect(() => {
    const entryId = searchParams.get("entry");
    if (!entryId || !views || !data) return;
    const idx = findEntryView(entryId);
    if (idx >= 0) {
      setView(idx);
      const entry = data.entries.find((e) => e.id === entryId);
      if (entry && entry.type === "piece") setReaderEntry(entry);
    }
    setSearchParams({}, { replace: true });
  }, [views, data, searchParams, setSearchParams, findEntryView]);

  // remember where the reader stopped (red ribbon bookmark)
  useEffect(() => {
    if (!views) return;
    if (view > 0 && view < views.length - 1) saveBookmark(slug, view);
    if (view === views.length - 1) saveBookmark(slug, 0); // finished -> clear
  }, [view, views, slug]);

  useEffect(() => {
    const onKey = (e) => {
      if (readerEntry) return;
      if (e.key === "ArrowRight") goTo(view + 1);
      if (e.key === "ArrowLeft") goTo(view - 1);
      if (e.key === "Escape") closeBook();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, view, closeBook, readerEntry]);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-mono-ui text-sm text-neutral-500">notebook not found</p>
        <button onClick={() => navigate("/")} className="pill-dark h-9 px-5 text-[13px]">Go home</button>
      </main>
    );
  }

  if (!data || !views) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">opening notebook…</p>
      </main>
    );
  }

  const notebook = data.notebook;
  const current = views[view];
  const isSpreadView = current.kind === "spread";
  const isSpread = (v) => v && v.kind === "spread";

  const renderContentPage = (item) => {
    switch (item.type) {
      case "inside": return <InsideCover />;
      case "toc": return <CreamPage><TocPage data={item.data} goToEntry={goToEntry} /></CreamPage>;
      case "about": return <CreamPage><AboutPage data={item.data} /></CreamPage>;
      case "piece": return <CreamPage><PiecePage data={item.data} onRead={setReaderEntry} /></CreamPage>;
      case "kind": return <CreamPage><KindPage data={item.data} /></CreamPage>;
      case "ideabox": return <CreamPage><IdeaBoxPage /></CreamPage>;
      default: return <CreamPage><BlankPage /></CreamPage>;
    }
  };

  const renderView = (v) => {
    if (!v) return null;
    if (v.kind === "cover") {
      return <NotebookCover variant={notebook.variant} label={notebook.label} coverTitle={notebook.cover_title} subtitle={notebook.subtitle} large />;
    }
    if (v.kind === "back") {
      return <NotebookCover variant={notebook.variant} label={notebook.label} coverTitle={notebook.cover_title} subtitle={notebook.subtitle} large back />;
    }
    if (v.kind === "single") {
      return <div className="page-single w-full h-full">{renderContentPage(v.page)}</div>;
    }
    // spread
    return (
      <div className="w-full h-full flex">
        <div className="page-left w-1/2 h-full">{renderContentPage(v.left)}</div>
        <div className="page-right w-1/2 h-full">{renderContentPage(v.right)}</div>
      </div>
    );
  };

  const singleWidth = "min(340px, 88vw, 47vh)";
  const spreadWidth = "min(680px, 92vw, 94vh)";

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width * 0.5) goTo(view + 1);
    else goTo(view - 1);
  };

  // ---- drag-to-flip (spread views only) ----
  const canDrag = (dir) => {
    const target = views[dir === "next" ? view + 1 : view - 1];
    return isSpread(views[view]) && isSpread(target);
  };

  // ignore flips/drags that start on an interactive element (Read button, TOC, inputs…)
  const isInteractive = (e) =>
    !!(e.target && e.target.closest && e.target.closest('button, a, input, textarea, [role="button"], [contenteditable="true"]'));

  const onPointerDown = (e) => {
    if (flip || closing || drag) return;
    if (isInteractive(e)) { dragRef.current = null; return; }
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { x: e.clientX, width: rect.width, dir: null };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || (drag && drag.settling)) return;
    const dx = e.clientX - d.x;
    if (!d.dir) {
      if (Math.abs(dx) < 14) return;
      const dir = dx < 0 ? "next" : "prev";
      if (!canDrag(dir)) { d.dir = "blocked"; return; }
      d.dir = dir;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.dir === "blocked") return;
    const ratio = Math.min(1, Math.abs(dx) / (d.width * 0.75));
    const angle = d.dir === "next" ? -ratio * 180 : ratio * 180;
    setDrag({ dir: d.dir, angle, settling: false });
  };

  const onPointerUp = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.dir || d.dir === "blocked") {
      if (!drag) handleClick(e); // plain click
      return;
    }
    const committed = drag && Math.abs(drag.angle) > 65;
    const finalAngle = committed ? (d.dir === "next" ? -180 : 180) : 0;
    setDrag({ dir: d.dir, angle: finalAngle, settling: true });
    setTimeout(() => {
      if (committed) {
        setView((v) => (d.dir === "next" ? v + 1 : v - 1));
        playPageFlip();
      }
      setDrag(null);
    }, 240);
  };

  // realistic single-leaf turn when flipping between two spreads
  const flipFrom = flip ? views[flip.from] : null;
  const flipTo = flip ? views[view] : null;
  const leafMode = flip && isSpread(flipFrom) && isSpread(flipTo);

  const renderFlipArea = () => {
    // interactive drag leaf follows the pointer
    if (drag) {
      const from = views[view];
      const to = views[drag.dir === "next" ? view + 1 : view - 1];
      if (isSpread(from) && isSpread(to)) {
        const leafStyle = {
          transform: `rotateY(${drag.angle}deg)`,
          transformOrigin: drag.dir === "next" ? "left center" : "right center",
          transition: drag.settling ? "transform 0.24s cubic-bezier(0.3,0.6,0.3,1)" : "none",
        };
        if (drag.dir === "next") {
          return (
            <>
              <div className="w-full h-full flex">
                <div className="page-left w-1/2 h-full">{renderContentPage(from.left)}</div>
                <div className="page-right w-1/2 h-full">{renderContentPage(to.right)}</div>
              </div>
              <div className="leaf absolute top-0 right-0 w-1/2 h-full" style={leafStyle}>
                <div className="leaf-face page-right w-full h-full">{renderContentPage(from.right)}</div>
                <div className="leaf-face leaf-back page-left w-full h-full">{renderContentPage(to.left)}</div>
              </div>
            </>
          );
        }
        return (
          <>
            <div className="w-full h-full flex">
              <div className="page-left w-1/2 h-full">{renderContentPage(to.left)}</div>
              <div className="page-right w-1/2 h-full">{renderContentPage(from.right)}</div>
            </div>
            <div className="leaf absolute top-0 left-0 w-1/2 h-full" style={leafStyle}>
              <div className="leaf-face page-left w-full h-full">{renderContentPage(from.left)}</div>
              <div className="leaf-face leaf-back page-right w-full h-full">{renderContentPage(to.right)}</div>
            </div>
          </>
        );
      }
    }
    if (leafMode && flip.dir === "next") {
      return (
        <>
          <div className="w-full h-full flex">
            <div className="page-left w-1/2 h-full">{renderContentPage(flipFrom.left)}</div>
            <div className="page-right w-1/2 h-full">{renderContentPage(flipTo.right)}</div>
          </div>
          <div className="leaf leaf-next absolute top-0 right-0 w-1/2 h-full">
            <div className="leaf-face page-right w-full h-full">{renderContentPage(flipFrom.right)}</div>
            <div className="leaf-face leaf-back page-left w-full h-full">{renderContentPage(flipTo.left)}</div>
          </div>
        </>
      );
    }
    if (leafMode && flip.dir === "prev") {
      return (
        <>
          <div className="w-full h-full flex">
            <div className="page-left w-1/2 h-full">{renderContentPage(flipTo.left)}</div>
            <div className="page-right w-1/2 h-full">{renderContentPage(flipFrom.right)}</div>
          </div>
          <div className="leaf leaf-prev absolute top-0 left-0 w-1/2 h-full">
            <div className="leaf-face page-left w-full h-full">{renderContentPage(flipFrom.left)}</div>
            <div className="leaf-face leaf-back page-right w-full h-full">{renderContentPage(flipTo.right)}</div>
          </div>
        </>
      );
    }
    // covers, back, mobile single pages & mixed transitions
    return (
      <>
        <div className="w-full h-full">{renderView(views[flip && flip.dir === "prev" ? flip.from : view])}</div>
        {flip && (
          <div className={`absolute inset-0 ${flip.dir === "next" ? "page-turn-out" : "page-turn-in"}`}>
            {renderView(views[flip.dir === "next" ? flip.from : view])}
          </div>
        )}
      </>
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16 pb-8 px-3">
      <div className={closing ? "notebook-close-leave" : "notebook-open-enter"} style={{ width: isSpreadView ? spreadWidth : singleWidth, transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
        <div
          data-testid="open-notebook"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative cursor-pointer select-none touch-none"
          style={{ aspectRatio: isSpreadView ? "600/460" : "300/460", perspective: "1800px" }}
        >
          {renderFlipArea()}
        </div>

        <div className="mt-5 flex items-center justify-center gap-[7px] flex-wrap" data-testid="page-indicator">
          {views.map((_, i) => (
            <button key={i} aria-label={`Go to page ${i}`} onClick={() => goTo(i)} className="flex items-center justify-center h-4 w-2">
              {i === view ? (
                <span className="block w-[2px] h-[13px] bg-[#f94b0c]" />
              ) : (
                <span className="block w-[3.5px] h-[3.5px] rounded-full bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 transition-colors" />
              )}
            </button>
          ))}
        </div>
        {view === 0 && (() => {
          const bm = getBookmark(slug);
          return bm && bm.view > 0 && bm.view < views.length - 1 ? (
            <div className="mt-3 flex justify-center">
              <button
                data-testid="resume-bookmark-btn"
                onClick={() => goTo(Math.min(bm.view, views.length - 2))}
                className="pill h-8 px-4 flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-200"
              >
                <BookmarkCheck size={13} className="text-[#d3232f]" /> Resume where you left off
              </button>
            </div>
          ) : null;
        })()}
        <p className="mt-2 text-center font-mono-ui text-[9px] tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          {view === 0 ? "tap right to open · left to close" : view === views.length - 1 ? "tap right to close the notebook" : "tap right to flip · left to go back"}
        </p>
      </div>

      {readerEntry && (
        <Reader entry={readerEntry} notebookLabel={notebook.label} onClose={() => setReaderEntry(null)} />
      )}
    </main>
  );
};

export default NotebookView;
