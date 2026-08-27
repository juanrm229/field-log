import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import NotebookCover from "./NotebookCover";
import { playPageFlip } from "../lib/sounds";

/* One person's journal, read the way the notebooks on the desk are read.
 *
 * The mechanics are the ones NotebookView already established — a cover, then
 * spreads, a single leaf that turns under the pointer, dots along the bottom —
 * because a second way of turning a page on the same site would be a second
 * thing to learn.
 *
 * What is different is what sits on the paper. A day here runs to a few hundred
 * words, far more than a notebook page holds, so an entry flows across as many
 * pages as it needs and always starts on a fresh one. The threads out of it are
 * printed at the end of its last page, where a reader has just finished it.
 */

const SENTENCE = /(?<=[.!?…])\s+/;
const PARA_GAP = 6;      // the flex gap between paragraphs
const PAGE_PAD_X = 0.09; // px-[9%]
const PAGE_PAD_Y = 0.08; // py-[8%]

const escapeHtml = (t) => String(t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Measure a column of paragraphs at the page's real width, in one layout pass.
   Returns a height for every string handed in, in order. */
const measureHeights = (texts, width, extraClass = "") => {
  if (!texts.length || !width) return [];
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    `position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;width:${width}px`;
  probe.innerHTML = texts
    .map((t) => `<p class="font-serif-read text-[10.5px] leading-[1.62] ${extraClass}">${escapeHtml(t)}</p>`)
    .join("");
  document.body.appendChild(probe);
  const out = Array.from(probe.children).map((el) => el.getBoundingClientRect().height);
  document.body.removeChild(probe);
  return out;
};

/* Flow the days onto pages of a known size. A day always starts on a fresh
   page; its first page gives room to the heading, its last to the threads. */
const flowPages = (entries, contentW, contentH, headerH, footerH) => {
  if (!contentW || !contentH) return [];

  // Everything to be measured, flattened, so the browser lays it out once.
  const items = [];
  entries.forEach((entry, ei) => {
    const paras = entry.paragraphs && entry.paragraphs.length
      ? entry.paragraphs
      : [{ text: entry.body || "", protected: false }];
    paras.forEach((para) => items.push({ ei, entry, para, text: para.text }));
  });
  let heights = measureHeights(items.map((i) => i.text), contentW);

  // A paragraph taller than a whole page has to break somewhere; sentences are
  // the only seam that does not read as damage.
  const expanded = [];
  const tooTall = [];
  items.forEach((item, i) => {
    if (heights[i] <= contentH) { expanded.push({ ...item, h: heights[i] }); return; }
    const parts = item.text.split(SENTENCE).filter(Boolean);
    tooTall.push({ item, parts, at: expanded.length });
    parts.forEach((t) => expanded.push({ ...item, text: t, h: 0 }));
  });
  if (tooTall.length) {
    const flat = [];
    tooTall.forEach(({ parts }) => parts.forEach((t) => flat.push(t)));
    const sentenceH = measureHeights(flat, contentW);
    let k = 0;
    tooTall.forEach(({ parts, at }) => {
      parts.forEach((_, j) => { expanded[at + j].h = sentenceH[k++]; });
    });
  }

  const pages = [];
  let current = null;
  let used = 0;

  const start = (entry, first) => { current = { entry, paras: [], first }; used = first ? headerH : 0; };
  const commit = () => { if (current && current.paras.length) pages.push(current); };

  let lastEi = -1;
  expanded.forEach((it, i) => {
    if (it.ei !== lastEi) {           // a new day begins on its own page
      commit();
      start(it.entry, true);
      lastEi = it.ei;
    }
    // The threads print under the last paragraph of a day, so that paragraph
    // has to leave room for them or they would be cut off with it.
    const endOfDay = !expanded[i + 1] || expanded[i + 1].ei !== it.ei;
    const room = contentH - (endOfDay ? footerH : 0);
    const cost = it.h + (current.paras.length ? PARA_GAP : 0);
    if (current.paras.length && used + cost > room) {
      commit();
      start(it.entry, false);
    }
    current.paras.push({ text: it.text, protected: it.para.protected });
    used += it.h + (current.paras.length > 1 ? PARA_GAP : 0);
  });
  commit();

  pages.forEach((pg, i) => {
    pg.last = i === pages.length - 1 || pages[i + 1].entry.id !== pg.entry.id;
  });
  return pages;
};

/* The heading and the thread list are measured too, so the space they take is
   real rather than assumed. */
const measureChrome = (width) => {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    `position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;width:${width}px`;
  probe.innerHTML =
    `<div id="h" class="pb-2 mb-2.5" style="border-bottom:1px dashed #999">
       <span class="font-cover text-[9px] tracking-[0.1em]">NAME</span>
       <span class="font-mono-ui text-[7px]">1 JANUARY 1987</span>
       <div class="font-hand text-[13px] leading-tight">a title that runs to about this length</div>
     </div>
     <div id="f" class="mt-2.5 pt-2.5" style="border-top:1px dashed #999">
       <p class="font-mono-ui text-[6.5px] mb-1">OTHERS WERE THERE</p>
       <div class="font-cover text-[8px]">A</div><div class="font-cover text-[8px]">B</div>
       <div class="font-cover text-[8px]">C</div><div class="font-cover text-[8px]">D</div>
     </div>`;
  document.body.appendChild(probe);
  const headerH = probe.querySelector("#h").getBoundingClientRect().height;
  const footerH = probe.querySelector("#f").getBoundingClientRect().height;
  document.body.removeChild(probe);
  return { headerH, footerH };
};

/* The viewport breakpoint, read from something that actually resizes.
   Events on the window and the media query are not dependable in every host, so
   the source of truth is an element on the page: whenever it changes size the
   query is read again, and the query itself is always correct when read. */
const useBreakpoint = (query, ref) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    let ro;
    if (ref.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(sync);
      ro.observe(ref.current);
    }
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      if (ro) ro.disconnect();
    };
  }, [query, ref]);
  return matches;
};

const Dot = ({ variant }) => (
  <span className={`ink-${variant} w-2 h-2 rounded-full shrink-0`}
    style={{ background: "var(--ink-c)" }} aria-hidden="true" />
);

/* ---------- what is printed on one page ---------- */
const Leaf = ({ page, char, threads, byId, onOpenEntry }) => {
  if (!page) return <div className="cream-page w-full h-full" />;
  const { entry, paras, first, last } = page;
  return (
    <div className="cream-page w-full h-full px-[9%] py-[8%] flex flex-col overflow-hidden">
      {first && (
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pb-2 mb-2.5 border-b border-dashed border-neutral-400/50">
          <Dot variant={char.variant} />
          <span className={`ink-${char.variant} font-cover text-[9px] tracking-[0.1em]`}
            style={{ color: "var(--ink-c)" }}>{char.name.toUpperCase()}</span>
          <span className="font-mono-ui text-[7px] tracking-[0.16em] uppercase text-neutral-500">
            {entry.date_label}
          </span>
          {entry.title && (
            <span className="font-hand text-[13px] text-neutral-500 basis-full leading-tight">{entry.title}</span>
          )}
        </header>
      )}

      <div className="flex flex-col gap-1.5 min-h-0">
        {paras.map((p, i) => (
          <p key={i}
            className={`font-serif-read text-[10.5px] leading-[1.62] text-[#2a2620] ${p.protected ? "protected-para" : ""}`}>
            {p.text}
          </p>
        ))}
      </div>

      {last && threads && threads.length > 0 && (
        <footer className="mt-auto pt-2.5 border-t border-dashed border-neutral-400/50">
          <p className="font-mono-ui text-[6.5px] tracking-[0.18em] uppercase text-neutral-500 mb-1">
            others were there
          </p>
          <ul className="flex flex-col gap-[3px]">
            {threads.slice(0, 4).map((t) => {
              const c = byId[t.entry.character_id];
              return (
                <li key={t.entry.id}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenEntry(t.entry.id); }}
                    data-interactive="true"
                    className="flex items-baseline gap-1.5 w-full text-left">
                    <span className={`ink-${c?.variant || "slate"} font-cover text-[8px] tracking-[0.08em]`}
                      style={{ color: "var(--ink-c)" }}>{c ? c.name : "—"}</span>
                    <span className="font-mono-ui text-[6.5px] tracking-[0.1em] uppercase text-neutral-500 whitespace-nowrap">
                      {t.when}
                    </span>
                    <span className="flex-1 border-b border-dotted border-neutral-400/50 -translate-y-[2px]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </footer>
      )}
    </div>
  );
};

const JournalBook = ({ char, entries, allEntries, moments, byId, relativeTo, startEntryId, onReadingEntry, onOpenEntry }) => {
  const [box, setBox] = useState(null);
  const [pages, setPages] = useState([]);
  const gaugeRef = useRef(null);
  const frameRef = useRef(null);
  const isMobile = useBreakpoint("(max-width: 767px)", frameRef);
  const [view, setView] = useState(0);
  const [flip, setFlip] = useState(null);   // { from, dir }
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const flipTimer = useRef(null);



  // cover, then the paper, then the back cover
  const views = useMemo(() => {
    const out = [{ kind: "cover" }];
    if (isMobile) pages.forEach((p) => out.push({ kind: "single", page: p }));
    else for (let i = 0; i < pages.length; i += 2) {
      out.push({ kind: "spread", left: pages[i], right: pages[i + 1] || null });
    }
    out.push({ kind: "back" });
    return out;
  }, [pages, isMobile]);

  // The gauge is a page of exactly the printed size, kept invisible. Reading its
  // own box — width, height, and the padding the browser resolved — leaves
  // nothing to derive, and it follows every resize on its own.
  useLayoutEffect(() => {
    const el = gaugeRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const read = () => {
      const cs = window.getComputedStyle(el);
      const next = {
        contentW: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        contentH: el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
      };
      if (!(next.contentW > 40) || !(next.contentH > 40)) return;
      setBox((prev) =>
        prev && Math.abs(prev.contentW - next.contentW) < 1 && Math.abs(prev.contentH - next.contentH) < 1
          ? prev
          : next);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!box) return;
    const { headerH, footerH } = measureChrome(box.contentW);
    setPages(flowPages(entries, box.contentW, box.contentH, headerH, footerH));
  }, [entries, box]);

  useEffect(() => { setView(0); }, [char.id, isMobile]);

  // A thread points at a day, so jump to it — but only once, and never when the
  // reader is already inside that day. An entry runs over several pages, and
  // re-applying would yank them back to its first one every time they turned.
  // Held in state, not a ref: React remounts a component in development with its
  // state reset but its refs intact, so a ref guard would report the jump as
  // already done while `view` had gone back to the cover.
  const [jumped, setJumped] = useState(null);
  useEffect(() => {
    if (!startEntryId || jumped === startEntryId) return;
    const showsIt = (v) => !!v && (
      (v.page && v.page.entry.id === startEntryId) ||
      (v.left && v.left.entry.id === startEntryId) ||
      (v.right && v.right.entry.id === startEntryId));
    if (showsIt(views[view])) { setJumped(startEntryId); return; }
    const idx = views.findIndex(showsIt);
    // Only count it as done once the page actually exists. On the first render
    // after a jump the pages may not be laid out yet, and marking it applied
    // then would strand the reader on the cover for good.
    if (idx > 0) {
      setJumped(startEntryId);
      setView(idx);
    }
  }, [startEntryId, views, view, jumped]);

  // Tell the page which day is on screen, so the trail can record it.
  useEffect(() => {
    const v = views[view];
    const day = v && (v.page || v.left || v.right);
    if (day) onReadingEntry(day.entry.id);
  }, [view, views, onReadingEntry]);

  // The days in the order they were written. Where each one *lands* is worked
  // out at the moment of the click, from the pages in force then — a stored
  // index goes stale the instant the book re-flows to a new page size.
  const days = useMemo(() => {
    const seen = new Map();
    entries.forEach((e) => { if (!seen.has(e.id)) seen.set(e.id, { entry: e }); });
    return [...seen.values()];
  }, [entries]);

  const viewOfDay = useCallback((entryId) =>
    views.findIndex((v) => [v.page, v.left, v.right].some((pg) => pg && pg.entry.id === entryId)),
    [views]);

  // A spread can straddle two days, so both of their ticks light up and both
  // are named. Highlighting only the left one made a tick you clicked appear to
  // select a different day.
  const visibleDays = useMemo(() => {
    const v = views[view];
    if (!v) return [];
    const out = [];
    [v.page, v.left, v.right].forEach((pg) => {
      if (pg && !out.some((e) => e.id === pg.entry.id)) out.push(pg.entry);
    });
    return out;
  }, [views, view]);

  const isSpread = (v) => v && v.kind === "spread";

  const goTo = useCallback((i) => {
    if (i < 0 || i > views.length - 1 || i === view) return;
    setFlip({ from: view, dir: i > view ? "next" : "prev" });
    setView(i);
    playPageFlip();
    clearTimeout(flipTimer.current);
    flipTimer.current = setTimeout(() => setFlip(null), 720);
  }, [views.length, view]);

  useEffect(() => () => clearTimeout(flipTimer.current), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") goTo(view + 1);
      if (e.key === "ArrowLeft") goTo(view - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, view]);

  // Threads belong to the day, so they are looked up per page.
  const threadsFor = useCallback((entry) => {
    if (!entry) return [];
    const mine = entry.moment_ids || (entry.moment_id ? [entry.moment_id] : []);
    const seen = new Set();
    const out = [];
    mine.forEach((mid) => {
      allEntries.forEach((e) => {
        if (e.id === entry.id || seen.has(e.id)) return;
        const theirs = e.moment_ids || (e.moment_id ? [e.moment_id] : []);
        if (!theirs.includes(mid)) return;
        seen.add(e.id);
        out.push({ entry: e, when: relativeTo(entry.date_label, e.date_label) });
      });
    });
    return out;
  }, [allEntries, relativeTo]);

  const renderPage = (page) => (
    <Leaf page={page} char={char} byId={byId}
      threads={page && page.last ? threadsFor(page.entry) : null}
      onOpenEntry={onOpenEntry} />
  );

  const renderView = (v) => {
    if (!v) return null;
    if (v.kind === "cover" || v.kind === "back") {
      const first = entries[0];
      const lastE = entries[entries.length - 1];
      const y = (e) => String(e.date_label || "").slice(-4);
      return (
        <NotebookCover
          variant={char.variant}
          coverTitle="FIELD LOG"
          subtitle={[`${y(first)} – ${y(lastE)}`, `${entries.length} entries`]}
          label={char.name}
          large
          back={v.kind === "back"}
        />
      );
    }
    if (v.kind === "single") return <div className="page-single w-full h-full">{renderPage(v.page)}</div>;
    return (
      <div className="w-full h-full flex">
        <div className="page-left w-1/2 h-full">{renderPage(v.left)}</div>
        <div className="page-right w-1/2 h-full">{renderPage(v.right)}</div>
      </div>
    );
  };

  // ---- turning ----
  const isInteractive = (e) => !!(e.target.closest && e.target.closest("button, a, [data-interactive]"));

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left > rect.width * 0.5) goTo(view + 1);
    else goTo(view - 1);
  };

  const canDrag = (dir) => isSpread(views[view]) && isSpread(views[dir === "next" ? view + 1 : view - 1]);

  const onPointerDown = (e) => {
    if (flip || drag || isInteractive(e)) { dragRef.current = null; return; }
    dragRef.current = { x: e.clientX, width: e.currentTarget.getBoundingClientRect().width, dir: null };
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
    setDrag({ dir: d.dir, angle: d.dir === "next" ? -ratio * 180 : ratio * 180, settling: false });
  };
  const onPointerUp = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.dir || d.dir === "blocked") { if (!drag) handleClick(e); return; }
    const committed = drag && Math.abs(drag.angle) > 65;
    setDrag({ dir: d.dir, angle: committed ? (d.dir === "next" ? -180 : 180) : 0, settling: true });
    setTimeout(() => {
      if (committed) { setView((v) => (d.dir === "next" ? v + 1 : v - 1)); playPageFlip(); }
      setDrag(null);
    }, 240);
  };

  const flipFrom = flip ? views[flip.from] : null;
  const flipTo = flip ? views[view] : null;
  const leafMode = flip && isSpread(flipFrom) && isSpread(flipTo);

  const renderFlipArea = () => {
    if (drag) {
      const from = views[view];
      const to = views[drag.dir === "next" ? view + 1 : view - 1];
      if (isSpread(from) && isSpread(to)) {
        const leafStyle = {
          transform: `rotateY(${drag.angle}deg)`,
          transformOrigin: drag.dir === "next" ? "left center" : "right center",
          transition: drag.settling ? "transform 0.24s cubic-bezier(0.3,0.6,0.3,1)" : "none",
        };
        return drag.dir === "next" ? (
          <>
            <div className="w-full h-full flex">
              <div className="page-left w-1/2 h-full">{renderPage(from.left)}</div>
              <div className="page-right w-1/2 h-full">{renderPage(to.right)}</div>
            </div>
            <div className="leaf absolute top-0 right-0 w-1/2 h-full" style={leafStyle}>
              <div className="leaf-face page-right w-full h-full">{renderPage(from.right)}</div>
              <div className="leaf-face leaf-back page-left w-full h-full">{renderPage(to.left)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="w-full h-full flex">
              <div className="page-left w-1/2 h-full">{renderPage(to.left)}</div>
              <div className="page-right w-1/2 h-full">{renderPage(from.right)}</div>
            </div>
            <div className="leaf absolute top-0 left-0 w-1/2 h-full" style={leafStyle}>
              <div className="leaf-face page-left w-full h-full">{renderPage(from.left)}</div>
              <div className="leaf-face leaf-back page-right w-full h-full">{renderPage(to.right)}</div>
            </div>
          </>
        );
      }
    }
    if (leafMode) {
      const next = flip.dir === "next";
      return (
        <>
          <div className="w-full h-full flex">
            <div className="page-left w-1/2 h-full">{renderPage(next ? flipFrom.left : flipTo.left)}</div>
            <div className="page-right w-1/2 h-full">{renderPage(next ? flipTo.right : flipFrom.right)}</div>
          </div>
          <div className={`leaf ${next ? "leaf-next right-0" : "leaf-prev left-0"} absolute top-0 w-1/2 h-full`}>
            <div className={`leaf-face ${next ? "page-right" : "page-left"} w-full h-full`}>
              {renderPage(next ? flipFrom.right : flipFrom.left)}
            </div>
            <div className={`leaf-face leaf-back ${next ? "page-left" : "page-right"} w-full h-full`}>
              {renderPage(next ? flipTo.left : flipTo.right)}
            </div>
          </div>
        </>
      );
    }
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

  const spreadView = isSpread(views[view]);

  return (
    <div ref={frameRef} className="flex flex-col items-center">
      <div className="notebook-open-enter relative"
        style={{
          width: spreadView ? "min(680px, 92vw, 94vh)" : "min(340px, 88vw, 47vh)",
          transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)",
        }}>
        {/* A page of exactly the printed size, twice removed from trouble: it
            sits outside the area the leaf animates, and its own width comes from
            a copy of the book's width rule that carries no transition — reading
            it mid-transition described a page that existed for 200ms. */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 invisible pointer-events-none"
          style={{ width: spreadView ? "min(680px, 92vw, 94vh)" : "min(340px, 88vw, 47vh)" }}>
          <div
            ref={gaugeRef}
            className="cream-page px-[9%] py-[8%]"
            style={{ width: spreadView ? "50%" : "100%", aspectRatio: "300/460" }}
          />
        </div>
        <div
          data-testid="journal-book"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative cursor-pointer select-none touch-none"
          style={{ aspectRatio: spreadView ? "600/460" : "300/460", perspective: "1800px" }}>
          {renderFlipArea()}
        </div>

        <div className="mt-5 flex items-end justify-center gap-[3px] flex-wrap" data-testid="journal-pages">
          {days.map((d) => (
            <button
              key={d.entry.id}
              onClick={() => { const i = viewOfDay(d.entry.id); if (i > 0) goTo(i); }}
              title={d.entry.date_label}
              aria-label={`Go to ${d.entry.date_label}`}
              aria-current={visibleDays.some((e) => e.id === d.entry.id) ? "true" : undefined}
              className="day-tick">
              <span className={visibleDays.some((e) => e.id === d.entry.id) ? "is-here" : ""} />
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-center font-mono-ui text-[9px] tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          {view === 0
            ? "tap right to open"
            : view === views.length - 1
              ? "you have reached the end of this one"
              : `${visibleDays.map((e) => e.date_label).join(" — ")} · page ${view} of ${views.length - 2}`}
        </p>
        <p className="mt-1 text-center font-mono-ui text-[8px] tracking-[0.2em] uppercase text-neutral-400/70">
          {view === 0 || view === views.length - 1 ? "\u00a0" : "tap a side to turn · drag a page · pick a day above"}
        </p>
      </div>
    </div>
  );
};

export default JournalBook;
