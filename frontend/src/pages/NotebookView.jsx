import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NotebookCover from "../components/NotebookCover";
import Reader from "../components/Reader";
import { getNotebookFull } from "../api";
import { Quote, BookOpen } from "lucide-react";

const buildPages = (entries) => {
  const pieces = entries.filter((e) => e.type === "piece");
  const pages = [{ type: "cover" }];
  if (pieces.length > 0) pages.push({ type: "toc", data: pieces });
  entries.forEach((e) => pages.push({ type: e.type, data: e }));
  pages.push({ type: "back" });
  return pages;
};

const PageShell = ({ children, pageNo, total, label }) => (
  <div className="notebook-page relative w-full h-full flex flex-col">
    <div className="flex items-center justify-between px-[9%] pt-[6%]">
      <span className="font-mono-ui text-[8px] tracking-[0.22em] uppercase text-neutral-400">Field Log</span>
      <span className="font-mono-ui text-[8px] tracking-[0.22em] uppercase text-neutral-400">{label}</span>
    </div>
    <div className="flex-1 px-[9%] pt-[4%] pb-[3%] overflow-hidden">{children}</div>
    <div className="px-[9%] pb-[5%] flex justify-between items-center">
      <div className="h-px flex-1 bg-neutral-200 mr-3" />
      <span className="font-mono-ui text-[8px] text-neutral-400">{pageNo} / {total}</span>
    </div>
  </div>
);

const AboutPage = ({ data }) => (
  <div>
    <p className="font-hand text-[15px] text-[#f94b0c] leading-none mb-1">{data.meta}</p>
    <h3 className="font-cover text-[19px] leading-tight text-neutral-900 mb-3">{data.title}</h3>
    <p className="font-serif-read text-[12px] leading-[1.75] text-neutral-700 whitespace-pre-line">{data.body}</p>
  </div>
);

const TocPage = ({ data, goToEntry }) => (
  <div>
    <p className="font-hand text-[22px] text-neutral-900 mb-3">Contents</p>
    <div className="space-y-[7px]">
      {data.map((w) => (
        <button
          key={w.id}
          data-testid={`toc-item-${w.id}`}
          onClick={(e) => { e.stopPropagation(); goToEntry(w.id); }}
          className="w-full flex items-baseline gap-2 text-left group"
        >
          <span className="font-serif-read text-[11.5px] text-neutral-800 group-hover:text-[#f94b0c] transition-colors whitespace-nowrap overflow-hidden text-ellipsis">{w.title}</span>
          <span className="flex-1 border-b border-dotted border-neutral-300 translate-y-[-2px]" />
          <span className="font-mono-ui text-[8.5px] uppercase tracking-wider text-neutral-400">{w.category}</span>
        </button>
      ))}
    </div>
  </div>
);

const PiecePage = ({ data, onRead }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
      {data.category && <span className="font-mono-ui text-[8px] tracking-[0.2em] uppercase text-white bg-[#f94b0c] px-1.5 py-0.5 rounded-sm">{data.category}</span>}
      <span className="font-mono-ui text-[8px] text-neutral-400">{data.date}</span>
    </div>
    <h3 className="font-cover text-[16px] leading-snug text-neutral-900 mb-0.5">{data.title}</h3>
    {data.meta && <p className="font-hand text-[13px] text-neutral-500 mb-2">{data.meta}</p>}
    <p className="font-serif-read text-[11.5px] leading-[1.7] text-neutral-700 whitespace-pre-line overflow-hidden fade-bottom flex-1">{data.body}</p>
    <div className="pt-2 flex items-center justify-between">
      {data.chapters && data.chapters.length > 0 ? (
        <span className="font-mono-ui text-[8.5px] uppercase tracking-[0.14em] text-neutral-400">{data.chapters.length} chapters</span>
      ) : <span />}
      <button
        data-testid={`read-btn-${data.id}`}
        onClick={(e) => { e.stopPropagation(); onRead(data); }}
        className="pill-dark h-7 px-3.5 gap-1.5 text-[10px] font-mono-ui tracking-[0.1em] uppercase"
      >
        <BookOpen size={11} /> Read
      </button>
    </div>
  </div>
);

const KindPage = ({ data }) => (
  <div className="h-full flex flex-col justify-center">
    <Quote size={18} className="text-[#f94b0c] mb-3 rotate-180" />
    <p className="font-serif-read italic text-[13px] leading-[1.8] text-neutral-800 mb-4">{data.body}</p>
    <p className="font-hand text-[17px] text-neutral-900 leading-none">{data.title}</p>
    <p className="font-mono-ui text-[8.5px] tracking-[0.16em] uppercase text-neutral-400 mt-1">{data.meta}</p>
  </div>
);

const NotebookView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [flip, setFlip] = useState(null); // { from, dir }
  const [closing, setClosing] = useState(false);
  const [readerEntry, setReaderEntry] = useState(null);
  const flipTimer = useRef(null);

  useEffect(() => {
    setData(null);
    setError(false);
    setPage(0);
    setClosing(false);
    getNotebookFull(slug)
      .then(setData)
      .catch(() => setError(true));
  }, [slug]);

  const pages = useMemo(() => (data ? buildPages(data.entries) : null), [data]);

  const closeBook = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => navigate("/"), 520);
  }, [closing, navigate]);

  const goTo = useCallback(
    (i) => {
      if (!pages || closing) return;
      if (i < 0) { closeBook(); return; }
      if (i > pages.length - 1) { closeBook(); return; }
      if (i === page) return;
      const dir = i > page ? "next" : "prev";
      setFlip({ from: page, dir });
      setPage(i);
      clearTimeout(flipTimer.current);
      flipTimer.current = setTimeout(() => setFlip(null), 620);
    },
    [pages, page, closing, closeBook]
  );

  const goToEntry = useCallback(
    (entryId) => {
      if (!pages) return;
      const idx = pages.findIndex((p) => p.data && p.data.id === entryId);
      if (idx >= 0) goTo(idx);
    },
    [pages, goTo]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (readerEntry) return;
      if (e.key === "ArrowRight") goTo(page + 1);
      if (e.key === "ArrowLeft") goTo(page - 1);
      if (e.key === "Escape") closeBook();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page, closeBook, readerEntry]);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-mono-ui text-sm text-neutral-500">notebook not found</p>
        <button onClick={() => navigate("/")} className="pill-dark h-9 px-5 text-[13px]">Go home</button>
      </main>
    );
  }

  if (!data || !pages) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">opening notebook…</p>
      </main>
    );
  }

  const notebook = data.notebook;
  const total = pages.length;

  const renderPage = (idx) => {
    const p = pages[idx];
    if (!p) return null;
    if (p.type === "cover") {
      return <NotebookCover variant={notebook.variant} label={notebook.label} coverTitle={notebook.cover_title} subtitle={notebook.subtitle} large />;
    }
    if (p.type === "back") {
      return <NotebookCover variant={notebook.variant} label={notebook.label} coverTitle={notebook.cover_title} subtitle={notebook.subtitle} large back />;
    }
    return (
      <PageShell pageNo={idx} total={total - 2} label={notebook.label}>
        {p.type === "about" && <AboutPage data={p.data} />}
        {p.type === "toc" && <TocPage data={p.data} goToEntry={goToEntry} />}
        {p.type === "piece" && <PiecePage data={p.data} onRead={setReaderEntry} />}
        {p.type === "kind" && <KindPage data={p.data} />}
      </PageShell>
    );
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width * 0.45) goTo(page + 1);
    else goTo(page - 1);
  };

  // during a "prev" flip the old page stays as base and the new page swings in on top
  const baseIdx = flip && flip.dir === "prev" ? flip.from : page;
  const overlayIdx = flip ? (flip.dir === "next" ? flip.from : page) : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16 pb-8">
      <div className={closing ? "notebook-close-leave" : "notebook-open-enter"} style={{ width: "min(340px, 82vw, 47vh)" }}>
        <div
          data-testid="open-notebook"
          onClick={handleClick}
          className="relative cursor-pointer select-none"
          style={{ aspectRatio: "300/460", perspective: "1600px" }}
        >
          <div className="w-full h-full">{renderPage(baseIdx)}</div>
          {overlayIdx !== null && (
            <div className={`absolute inset-0 ${flip.dir === "next" ? "page-turn-out" : "page-turn-in"}`}>
              {renderPage(overlayIdx)}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-[7px] flex-wrap" data-testid="page-indicator">
          {pages.map((_, i) => (
            <button key={i} aria-label={`Go to page ${i}`} onClick={() => goTo(i)} className="flex items-center justify-center h-4 w-2">
              {i === page ? (
                <span className="block w-[2px] h-[13px] bg-[#f94b0c]" />
              ) : (
                <span className="block w-[3.5px] h-[3.5px] rounded-full bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 transition-colors" />
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center font-mono-ui text-[9px] tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          {page === 0 ? "click right to open · left to close" : page === total - 1 ? "click right to close the notebook" : "click right to flip · left to go back"}
        </p>
      </div>

      {readerEntry && (
        <Reader entry={readerEntry} notebookLabel={notebook.label} onClose={() => setReaderEntry(null)} />
      )}
    </main>
  );
};

export default NotebookView;
