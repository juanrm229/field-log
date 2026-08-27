import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { getSimpang } from "../api";
import LoadError from "../components/LoadError";
import NotebookCover from "../components/NotebookCover";
import JournalBook from "../components/JournalBook";
import { playPageFlip, playPaperTick } from "../lib/sounds";

/* Simpang — where the journals cross.
 *
 * An earlier version drew this as lines running left to right, one per person.
 * That was a lie about the material: nobody is continuously present between two
 * entries written twenty years apart. The corpus is not routes, it is dated
 * marks, so the page is a ledger — a name down the side, a year along the top,
 * and a chit of paper wherever somebody wrote something.
 *
 * The way in is the desk the homepage already uses: eighteen private journals
 * are eighteen notebooks. Pick a hand, read their days in order, and follow the
 * threads at the foot of each one into somebody else's notebook. The ledger
 * underneath is the archive index, for a second visit.
 */

const CELL = 20;      // width of one year column
const ROW = 26;       // height of one person's row
const GUTTER = 104;   // the name column

const yearOf = (dateLabel) => parseInt(String(dateLabel || "").slice(-4), 10) || null;

const dateOf = (label) => {
  const ms = Date.parse(label);
  return Number.isNaN(ms) ? null : new Date(ms);
};

/* "the next day", "seven months later" — a reader needs the distance, not the
   date, when they are being handed somebody else's page. */
const relativeTo = (from, to) => {
  const a = dateOf(from);
  const b = dateOf(to);
  if (!a || !b) return to;
  const days = Math.round((b - a) / 86400000);
  const n = Math.abs(days);
  const dir = days < 0 ? "earlier" : "later";
  if (n === 0) return "the same day";
  if (n === 1) return days < 0 ? "the day before" : "the next day";
  if (n < 31) return `${n} days ${dir}`;
  const months = Math.round(n / 30.4);
  if (n < 365) return `${months} month${months === 1 ? "" : "s"} ${dir}`;
  const years = Math.round(n / 365);
  return `${years} year${years === 1 ? "" : "s"} ${dir}`;
};

/* Which days a reader has already dug out, in story order rather than the order
   they happened to open them. Kept on their own machine, like the bookmark
   ribbon; nothing about it leaves the browser. */
const DUG_KEY = "simpang_dug";
const readDug = () => {
  try { return JSON.parse(localStorage.getItem(DUG_KEY) || "[]"); } catch { return []; }
};
const writeDug = (ids) => {
  try { localStorage.setItem(DUG_KEY, JSON.stringify(ids.slice(-120))); } catch { /* private mode */ }
};

const Dot = ({ variant, size = "w-2.5 h-2.5" }) => (
  <span className={`ink-${variant} ${size} rounded-full shrink-0`}
    style={{ background: "var(--ink-c)" }} aria-hidden="true" />
);

const Pin = ({ color = "#d3232f", className = "" }) => (
  <span className={`absolute w-4 h-4 rounded-full ${className}`}
    style={{ background: color, boxShadow: "inset -1px -1px 2px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.35)" }}
    aria-hidden="true" />
);

/* What the reader has dug out, stacked in story order rather than reading
   order. A time capsule needs a table to lay the papers on; the gaps between
   what you have found are as much of the shape as the papers are. */
const Trail = ({ dugDays, byId, entries, openEntryId, onOpen, onClear }) => (
  <section className="mt-8" data-testid="simpang-trail">
    <div className="flex items-baseline justify-between gap-3 mb-2">
      <p className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-[#f94b0c]">
        What you have dug out
      </p>
      <button onClick={onClear}
        className="font-mono-ui text-[8.5px] tracking-[0.16em] uppercase text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
        put it back
      </button>
    </div>
    <div className="trail cream-page px-4 py-3 overflow-x-auto">
      <ol className="flex items-stretch gap-0">
        {dugDays.map((e, i) => {
          const c = byId[e.character_id];
          const prev = dugDays[i - 1];
          const leap = prev && yearOf(e.date_label) - yearOf(prev.date_label) > 1;
          return (
            <React.Fragment key={e.id}>
              {leap && (
                <li className="trail-gap font-mono-ui" aria-hidden="true">
                  {yearOf(e.date_label) - yearOf(prev.date_label)} yrs
                </li>
              )}
              <li>
                <button onClick={() => onOpen(e.id)}
                  className={`ink-${c?.variant || "slate"} trail-card ${e.id === openEntryId ? "is-here" : ""}`}>
                  <span className="trail-year font-mono-ui">{yearOf(e.date_label)}</span>
                  <span className="trail-who font-cover" style={{ color: "var(--ink-c)" }}>
                    {c ? c.name : "—"}
                  </span>
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </div>
    <p className="font-hand text-[16px] text-neutral-400 mt-1.5">
      {dugDays.length} of {entries.length} days, in the order they happened — not the order you found them
    </p>
  </section>
);

const ROTS = [-6, -2, 3, -4, 2, -3, 4, -5, 1];

/* One hand, one notebook. The cover print is uniform the way the desk's are —
   the name is the handwritten label, not the title. */
const HandCover = ({ char, years, count }) => (
  <NotebookCover
    variant={char.variant}
    coverTitle="FIELD LOG"
    subtitle={[years, `${count} ${count === 1 ? "entry" : "entries"}`]}
    label={char.name}
  />
);

const Desk = ({ shelf, onOpen }) => {
  const [hovered, setHovered] = useState(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onCardMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ rx: -((e.clientY - r.top) / r.height - 0.5) * 14, ry: ((e.clientX - r.left) / r.width - 0.5) * 16 });
  };

  const Card = ({ item, i }) => {
    const isHover = hovered === item.char.id;
    return (
      <button
        data-testid={`hand-${item.char.slug}`}
        aria-label={`Open ${item.char.name}'s journal, ${item.count} entries`}
        onMouseEnter={() => { setHovered(item.char.id); playPaperTick(); }}
        onMouseLeave={() => { setHovered(null); setTilt({ rx: 0, ry: 0 }); }}
        onMouseMove={isHover ? onCardMove : undefined}
        onClick={() => onOpen(item.char.id)}
        className="notebook-slot focus:outline-none w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: isHover
            ? `translateY(-14px) scale(1.06) rotate(0deg) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
            : `rotate(${ROTS[i % ROTS.length] * 0.3}deg)`,
          filter: isHover ? "drop-shadow(0 26px 26px rgba(0,0,0,0.22))" : "none",
          zIndex: isHover ? 30 : 1,
        }}
      >
        <HandCover char={item.char} years={item.years} count={item.count} />
      </button>
    );
  };

  return (
    <div data-testid="simpang-desk">
      {/* The shelf, for a narrow screen */}
      <div className="-mx-4 sm:hidden">
        <div className="shelf-track flex gap-4 overflow-x-auto px-[22vw] snap-x snap-mandatory pt-3 pb-5">
          {shelf.map((item, i) => (
            <div key={item.char.id} className="shrink-0 w-[56vw] snap-center">
              <Card item={item} i={i} />
            </div>
          ))}
        </div>
        <p className="font-mono-ui text-[10px] tracking-[0.24em] uppercase text-neutral-400 text-center">
          swipe · tap to open
        </p>
      </div>

      {/* The desk itself, from sm up */}
      <div className="relative hidden sm:block">
      <div className="desk-pad absolute -inset-x-6 -top-5 -bottom-8 rounded-xl pointer-events-none"
        style={{ transform: "rotate(-0.6deg)" }} aria-hidden="true">
        <span className="absolute -top-2 left-[9%] w-14 h-4 bg-white/55 dark:bg-white/10 rotate-[-5deg] shadow-sm" />
        <span className="absolute -bottom-2 right-[11%] w-14 h-4 bg-white/55 dark:bg-white/10 rotate-[4deg] shadow-sm" />
      </div>
      {/* Six columns left the covers touching once they were tilted: a rotated
          card needs more room than its own width. Fewer, larger covers with a
          wider gutter, and a gentler tilt. */}
      <div className="relative grid grid-cols-3 gap-x-6 gap-y-9 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        style={{ perspective: "1200px" }}>
        {shelf.map((item, i) => <Card key={item.char.id} item={item} i={i} />)}
      </div>
        <p className="font-mono-ui text-[8.5px] tracking-[0.26em] uppercase text-neutral-400 text-right mt-6">
          pick a hand to open →
        </p>
      </div>
    </div>
  );
};

const SimpangPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [openCharId, setOpenCharId] = useState(null);   // whose notebook is off the desk
  const [openEntryId, setOpenEntryId] = useState(null); // the day showing inside it
  const [dug, setDug] = useState(readDug);
  const [turn, setTurn] = useState(null);
  const [solo, setSolo] = useState(null);
  const [hover, setHover] = useState(null);

  const load = useCallback(() => {
    setFailed(false);
    setData(null);
    getSimpang()
      .then(setData)
      .catch(() => { setFailed(true); setData({ characters: [], moments: [], entries: [] }); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const characters = useMemo(() => data?.characters || [], [data]);
  const moments = useMemo(() => data?.moments || [], [data]);
  const entries = useMemo(() => data?.entries || [], [data]);
  const byId = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters]);

  // The ledger: which years exist, and what sits in each person-and-year.
  const { years, grid } = useMemo(() => {
    const ys = new Set();
    const g = {};
    entries.forEach((e) => {
      const y = yearOf(e.date_label);
      if (!y) return;
      ys.add(y);
      (g[e.character_id] = g[e.character_id] || {});
      (g[e.character_id][y] = g[e.character_id][y] || []).push(e);
    });
    Object.values(g).forEach((row) =>
      Object.values(row).forEach((list) => list.sort((a, b) => a.t - b.t)));
    const sorted = [...ys].sort((a, b) => a - b);
    // Fill the gaps so an empty decade reads as an empty decade, not as absence.
    const full = sorted.length
      ? Array.from({ length: sorted[sorted.length - 1] - sorted[0] + 1 }, (_, i) => sorted[0] + i)
      : [];
    return { years: full, grid: g };
  }, [entries]);

  // In story order, not the order they were opened. That is the whole point:
  // the reader is assembling a town, not a history of their own clicking.
  const dugDays = useMemo(() => {
    const map = new Map(entries.map((e) => [e.id, e]));
    return dug.map((id) => map.get(id)).filter(Boolean).sort((a, b) => a.t - b.t);
  }, [dug, entries]);

  const clearTrail = useCallback(() => { setDug([]); writeDug([]); }, []);

  // One shelf entry per hand: their ink, how long they wrote, how much.
  const shelf = useMemo(() => characters.map((c) => {
    const mine = entries.filter((e) => e.character_id === c.id).sort((a, b) => a.t - b.t);
    if (!mine.length) return null;
    const from = yearOf(mine[0].date_label);
    const to = yearOf(mine[mine.length - 1].date_label);
    return { char: c, entries: mine, count: mine.length, years: from === to ? `${from}` : `${from} – ${to}` };
  }).filter(Boolean), [characters, entries]);

  const openChar = byId[openCharId] || null;
  const current = entries.find((e) => e.id === openEntryId) || null;

  // Turning a page moves through one person's whole journal in order, the way
  // a notebook does — not through one square of the ledger.
  const journal = useMemo(
    () => (openChar ? (shelf.find((x) => x.char.id === openChar.id) || {}).entries || [] : []),
    [shelf, openChar]
  );
  const cell = current
    ? { charId: current.character_id, year: yearOf(current.date_label) }
    : null;
  const page = journal.findIndex((e) => e.id === openEntryId);

  const openEntry = useCallback((entryId) => {
    if (!entryId) return;
    const e = entries.find((x) => x.id === entryId);
    if (e) setOpenCharId(e.character_id);
    setOpenEntryId(entryId);
    setSearchParams({ day: entryId }, { replace: true });
  }, [entries, setSearchParams]);

  // Anything that used to hand over a person and a year still can; it just
  // resolves to the first day in that square now.
  const openCell = useCallback((charId, year) => {
    const list = (grid[charId] || {})[year] || [];
    if (list.length) openEntry(list[0].id);
  }, [grid, openEntry]);

  // Taking a notebook off the desk hands you the closed book, cover up. The
  // opening tap belongs to the reader, the way it does on the desk at home.
  const openHand = useCallback((charId) => {
    setOpenCharId(charId);
    setOpenEntryId(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const closeBook = useCallback(() => {
    setOpenCharId(null);
    setOpenEntryId(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Left and right stay inside one journal: the same hand, the next day.
  const step = useCallback((delta) => {
    if (!current || page < 0) return;
    const next = journal[page + delta];
    if (!next) return;
    setOpenEntryId(next.id);
    setTurn(delta > 0 ? "next" : "prev");
    playPageFlip();
    setSearchParams({ day: next.id }, { replace: true });
  }, [current, page, journal, setSearchParams]);

  // Anything opened is kept, however it was reached — including the day the
  // page opens by itself, which is still the first thing the reader read.
  useEffect(() => {
    if (!openEntryId) return;
    setDug((prev) => {
      if (prev[prev.length - 1] === openEntryId) return prev;
      const next = [...prev.filter((id) => id !== openEntryId), openEntryId];
      writeDug(next);
      return next;
    });
  }, [openEntryId]);

  // A day has an address, the way a piece does. Applied once, on arrival only:
  // closing the book clears the query, and re-reading it here would race that
  // and drag the reader straight back into the day they just shut.
  const addressApplied = useRef(false);
  useEffect(() => {
    if (addressApplied.current || !entries.length) return;
    addressApplied.current = true;
    const day = searchParams.get("day");
    const found = entries.find((e) => e.id === day);
    if (found) {
      // The address names a day, but a day is inside somebody's notebook — take
      // that off the desk too, or the link lands on the desk it came from.
      setOpenCharId(found.character_id);
      setOpenEntryId(found.id);
    }
  }, [entries, searchParams]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e) => {
      if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Escape") closeBook();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, step, closeBook]);

  if (data === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">opening the ledger…</p>
      </main>
    );
  }

  const flipClass = turn === "next" ? "page-flip-next" : turn === "prev" ? "page-flip-prev" : "";

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 sm:px-8 max-w-5xl mx-auto">
      {/* The taped label used to hang over the cork frame, so it carried a
          negative margin. The frame moved to the foot of the page and the
          margin stayed, dragging the label down onto the opening lines. */}
      <div className="relative z-20 flex justify-center mb-7">
        <div className="relative bg-[#fffdf6] dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg px-8 py-2.5 rotate-[-1.5deg] note-drop">
          <span className="absolute -top-2 -left-4 w-10 h-4 bg-[#c3dcef]/70 dark:bg-[#c3dcef]/30 rotate-[-30deg]" />
          <span className="absolute -top-2 -right-4 w-10 h-4 bg-[#f8e8a0]/80 dark:bg-[#f8e8a0]/30 rotate-[30deg]" />
          <p className="font-cover text-[16px] text-[#2a2620] dark:text-neutral-100 tracking-wide text-center">SIMPANG</p>
          <p className="font-mono-ui text-[8px] tracking-[0.24em] uppercase text-neutral-400 text-center">where the journals cross</p>
        </div>
      </div>

      {!openChar ? (
        <>
          {characters.length > 0 && (
            <div className="text-center mb-9" data-testid="simpang-preamble">
              <p className="font-mono-ui text-[10px] tracking-[0.32em] uppercase text-neutral-400">
                {characters.length} people · {years.length} years · one town
              </p>
              <p className="font-hand text-[20px] text-neutral-500 dark:text-neutral-400 mt-1.5 leading-snug">
                none of them read anyone else&rsquo;s.<br />
                nobody wrote down what happened here — only their part of it.
              </p>
            </div>
          )}

          {failed ? (
            <LoadError what="The journals" onRetry={load} />
          ) : shelf.length === 0 ? (
            <div className="text-center py-16">
              <Users size={26} className="mx-auto text-neutral-300 mb-3" />
              <p className="font-hand text-[20px] text-neutral-400">The desk is empty.</p>
            </div>
          ) : (
            <Desk shelf={shelf} onOpen={openHand} />
          )}

          {dugDays.length > 1 && <Trail
            dugDays={dugDays} byId={byId} entries={entries}
            openEntryId={openEntryId} onOpen={openEntry} onClear={clearTrail} />}

          {shelf.length > 0 && (
            <>
              <div className="flex items-baseline justify-between gap-3 mt-12 mb-2">
                <div>
                  <p className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-[#f94b0c]">The whole record</p>
                  <p className="font-hand text-[16px] text-neutral-400">
                    a row for each person, a column for each year — every mark is a day they wrote
                  </p>
                </div>
                <span className="font-mono-ui text-[9px] tracking-[0.16em] uppercase text-neutral-400">
                  {entries.length} entries
                </span>
              </div>
              <div className="cork-frame">
                <div className="cork-board relative px-3 sm:px-6 pt-8 pb-6" data-testid="simpang-board">
                  <Ledger
                    characters={characters} years={years} grid={grid}
                    solo={solo} cell={cell}
                    onPick={openCell} onHover={setHover}
                  />
                  <p className="font-hand text-[15px] text-[#fffdf6]/85 mt-2 px-1 -rotate-1 drop-shadow-sm">
                    {hover
                      ? `${byId[hover.charId]?.name} · ${hover.year} · ${hover.count} entr${hover.count === 1 ? "y" : "ies"}`
                      : "open a square to read that person's year"}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <section data-testid="simpang-reading">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <button onClick={closeBook} data-testid="simpang-close-book"
              className="pill h-8 px-3.5 flex items-center gap-1.5 text-[11px] font-mono-ui tracking-[0.1em] uppercase text-neutral-700 dark:text-neutral-200">
              <ChevronLeft size={13} /> Back to the desk
            </button>
            <span className="font-mono-ui text-[9px] tracking-[0.18em] uppercase text-neutral-400">
              {openChar.name} · {journal.length} days
            </span>
          </div>

          <JournalBook
            key={openChar.id}
            char={openChar}
            entries={journal}
            allEntries={entries}
            moments={moments}
            byId={byId}
            relativeTo={relativeTo}
            startEntryId={openEntryId}
            onReadingEntry={setOpenEntryId}
            onOpenEntry={openEntry}
          />

          {dugDays.length > 1 && <Trail
            dugDays={dugDays} byId={byId} entries={entries}
            openEntryId={openEntryId} onOpen={openEntry} onClear={clearTrail} />}
        </section>
      )}

    </main>
  );
};

/* ---------- the ledger ---------- */
const Ledger = ({ characters, years, grid, solo, cell, onPick, onHover }) => {
  // Only some years get a printed label; forty-four of them at twenty pixels
  // apart is a smear. Every fifth, plus the first and the last.
  const labelled = new Set(
    years.filter((y, i) => y % 5 === 0 || i === 0 || i === years.length - 1)
  );
  return (
    <div className="map-sheet cream-page px-3 pt-3 pb-2 overflow-x-auto" data-testid="simpang-ledger">
      <Pin className="left-5 top-2 z-10" color="#d3232f" />
      <Pin className="right-5 top-2 z-10" color="#2f5d43" />
      <div className="inline-block min-w-full pt-4">
        <div className="grid"
          style={{ gridTemplateColumns: `${GUTTER}px repeat(${years.length}, ${CELL}px)` }}>
          {/* years across the top */}
          <div />
          {years.map((y) => (
            <div key={y} className="relative" style={{ height: 22 }}>
              {labelled.has(y) && (
                <span className="absolute left-1/2 bottom-0 -translate-x-1/2 font-mono-ui text-[8px] text-[#6e6659] dark:text-[#8d8577] whitespace-nowrap">
                  {String(y).slice(2)}
                </span>
              )}
              <span className="absolute left-1/2 bottom-[-2px] w-px h-1 bg-[rgba(120,100,70,0.35)] dark:bg-[rgba(240,225,200,0.2)]" />
            </div>
          ))}

          {characters.map((c) => {
            const faded = solo && solo !== c.id;
            return (
              <React.Fragment key={c.id}>
                <div className={`ink-${c.variant} flex items-center gap-1.5 pr-2 justify-end transition-opacity`}
                  style={{ height: ROW, opacity: faded ? 0.25 : 1 }}>
                  <span className="font-cover text-[9.5px] tracking-[0.1em] truncate"
                    style={{ color: "var(--ink-c)" }}>{c.name.toUpperCase()}</span>
                  <Dot variant={c.variant} size="w-1.5 h-1.5" />
                </div>
                {years.map((y) => {
                  const list = (grid[c.id] || {})[y] || [];
                  const isOpen = cell && cell.charId === c.id && cell.year === y;
                  return (
                    <Chit key={y} variant={c.variant} count={list.length}
                      faded={faded} open={isOpen}
                      label={`${c.name}, ${y}, ${list.length} entries`}
                      onPick={() => list.length && onPick(c.id, y)}
                      onHover={(on) => onHover(on && list.length ? { charId: c.id, year: y, count: list.length } : null)}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Chit = ({ variant, count, faded, open, label, onPick, onHover }) => {
  if (!count) {
    return <div style={{ height: ROW }} className="ledger-empty" aria-hidden="true" />;
  }
  // Height carries how much was written that year without needing a number.
  const h = Math.min(ROW - 8, 8 + (count - 1) * 3);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className={`ink-${variant} ledger-chit ${open ? "is-open" : ""}`}
      style={{ height: ROW, opacity: faded ? 0.18 : 1 }}
    >
      <span className="ledger-mark" style={{ height: h }} />
      {count > 1 && <span className="ledger-count">{count}</span>}
    </button>
  );
};

/* ---------- one day, whole, with the threads out of it ---------- */
const EntryPage = ({ entry, char, moments, entries, byId, onOpenEntry }) => {
  if (!entry || !char) return null;

  const paras = entry.paragraphs && entry.paragraphs.length
    ? entry.paragraphs : [{ text: entry.body, protected: false }];
  const mine = entry.moment_ids || (entry.moment_id ? [entry.moment_id] : []);

  // For each thing this day touches: who else wrote about it, and how far away
  // in time they were. Not a list of index terms — a list of people.
  const threads = mine.map((mid) => {
    const m = moments.find((x) => x.id === mid);
    if (!m) return null;
    const others = entries
      .filter((e) => e.id !== entry.id &&
        (e.moment_ids || (e.moment_id ? [e.moment_id] : [])).includes(mid))
      .sort((a, b) => a.t - b.t);
    if (!others.length) return null;
    return { moment: m, others };
  }).filter(Boolean);

  // A paragraph of this day that somebody else's page pulls against. Matched on
  // the text itself, because that is what the writer keyed.
  const contested = {};
  (entry.claims || []).forEach((c) => {
    if (c.kind !== "claims") return;
    const rivals = entries
      .filter((e) => e.id !== entry.id)
      .flatMap((e) => (e.claims || [])
        .filter((x) => x.kind === "irony" && x.key === c.key)
        .map(() => e))
      .filter((e, i, arr) => arr.indexOf(e) === i);
    if (rivals.length) contested[c.text] = rivals;
  });

  return (
    <div className="cream-page page-single px-5 sm:px-12 py-9 flex flex-col" data-testid={`simpang-entry-${entry.source_id || entry.id}`}>
      <header className="flex items-baseline gap-2.5 pb-3 mb-5 border-b border-dashed border-neutral-400/50 flex-wrap">
        <Dot variant={char.variant} />
        <span className={`ink-${char.variant} font-cover text-[13px] tracking-[0.08em]`}
          style={{ color: "var(--ink-c)" }}>{char.name.toUpperCase()}</span>
        <span className="font-mono-ui text-[9px] tracking-[0.18em] uppercase text-neutral-500 dark:text-neutral-400">
          {entry.date_label}
        </span>
        {entry.title && (
          <span className="font-hand text-[19px] text-neutral-500 dark:text-neutral-400 basis-full">
            {entry.title}
          </span>
        )}
      </header>

      <div className="flex flex-col gap-3 max-w-[60ch]">
        {paras.map((p, i) => {
          const rivals = contested[p.text];
          return (
            <div key={i} className="relative">
              <p className={`font-serif-read text-[17px] leading-[1.8] text-[#2a2620] ${
                p.protected ? "protected-para" : ""} ${i === 0 && !p.protected ? "drop-cap" : ""}`}>
                {p.text}
              </p>
              {rivals && (
                <p className="thread-note font-hand">
                  {rivals.length === 1 ? "Someone remembers this differently — " : "Two of them remember this differently — "}
                  {rivals.slice(0, 2).map((r, k) => {
                    const rc = byId[r.character_id];
                    return (
                      <React.Fragment key={r.id}>
                        {k > 0 && ", "}
                        <button onClick={() => onOpenEntry(r.id)} className="thread-link">
                          {rc ? rc.name : "another"}, {relativeTo(entry.date_label, r.date_label)}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {threads.length > 0 && (
        <footer className="mt-8 pt-5 border-t border-dashed border-neutral-400/50 flex flex-col gap-4">
          {threads.map(({ moment, others }) => (
            <div key={moment.id}>
              <p className="font-serif-read text-[16px] leading-relaxed text-[#2a2620]">
                {others.length === 1 ? "One other person" : `${others.length} other people`} wrote about{" "}
                <span className="font-hand text-[19px]">{String(moment.label).toLowerCase()}</span>.
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {others.map((o) => {
                  const oc = byId[o.character_id];
                  return (
                    <li key={o.id}>
                      <button onClick={() => onOpenEntry(o.id)} className="thread-row">
                        <span className={`ink-${oc?.variant || "slate"} thread-name font-cover`}
                          style={{ color: "var(--ink-c)" }}>
                          {oc ? oc.name : "—"}
                        </span>
                        <span className="thread-when font-mono-ui">
                          {relativeTo(entry.date_label, o.date_label)}
                        </span>
                        <span className="thread-rule" />
                        <span className="thread-go font-hand">read it</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </footer>
      )}

      {threads.length === 0 && (
        <p className="font-hand text-[18px] text-neutral-400 mt-8 pt-5 border-t border-dashed border-neutral-400/50">
          nobody else wrote about this day. it is only his.
        </p>
      )}
    </div>
  );
};

export default SimpangPage;
