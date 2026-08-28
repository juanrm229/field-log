import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, FileText } from "lucide-react";
import { searchEntries, searchCrossing } from "../api";

/* Quick search overlay — finds any piece across every notebook, and any day
   across the town.
 *
 * The two halves answer different questions and are shaped differently. Juan's
 * own writing is a list of pieces: you are looking for the one you meant. The
 * Crossing is not a list — a reader typing "gorengan" does not want eighteen
 * snippets, they want to learn that the word runs through six hands over
 * thirty-eight years, and then to pick a door. So that half opens with the
 * count and offers days, because a day is what the page they land on shows.
 */
const EMPTY_CROSSING = { days: [], total: 0, hands: 0, years: [] };

const SearchOverlay = ({ open, onClose }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [crossing, setCrossing] = useState(EMPTY_CROSSING);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounce = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setCrossing(EMPTY_CROSSING);
      setSearched(false);
      setActive(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults([]);
      setCrossing(EMPTY_CROSSING);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      const term = q.trim();
      // Two searches, one keystroke. Either may fail without taking the other
      // down — a reader searching the town should not lose it because the
      // notebooks are slow.
      const [mine, town] = await Promise.all([
        searchEntries(term).catch(() => []),
        searchCrossing(term).catch(() => EMPTY_CROSSING),
      ]);
      setResults(Array.isArray(mine) ? mine : []);
      setCrossing(town && Array.isArray(town.days) ? town : EMPTY_CROSSING);
      setActive(0);
      setSearched(true);
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [q]);

  // One list for the keyboard, so Enter means the same thing in both halves.
  const flat = useMemo(() => [
    ...results.map((r) => ({ kind: "writing", r })),
    ...crossing.days.map((d) => ({ kind: "day", d })),
  ], [results, crossing]);

  const openAt = (item) => {
    if (!item) return;
    onClose();
    if (item.kind === "day") {
      navigate(`/crossing?day=${item.d.id}`);
      return;
    }
    const r = item.r;
    navigate(r.slug ? `/read/${r.slug}` : `/notebook/${r.notebook_slug}?entry=${r.id}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter" && flat[active]) openAt(flat[active]);
  };

  if (!open) return null;

  const years = crossing.years || [];
  const span = years.length === 2
    ? (years[0] === years[1] ? `${years[0]}` : `${years[0]}–${years[1]}`)
    : "";
  // The header speaks for every match; the rows are only the first few doors.
  const nDays = crossing.total || crossing.days.length;
  const hidden = Math.max(0, nDays - crossing.days.length);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[16vh] px-4" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] search-fade" onClick={onClose} />
      <div className="relative w-full max-w-[520px] rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xl overflow-hidden search-pop">
        <div className="flex items-center gap-3 px-4 border-b border-neutral-100 dark:border-neutral-800">
          <Search size={15} className="text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            data-testid="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the notebooks and the town…"
            className="w-full h-12 bg-transparent outline-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
          />
          <kbd className="font-mono-ui text-[9px] text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2" data-testid="search-results">
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center font-mono-ui text-[10px] tracking-[0.16em] uppercase text-neutral-400">
              {q.trim().length < 2 ? "type to search" : searched ? "nothing found in the drawer" : "searching…"}
            </p>
          ) : (
            <>
              {results.map((r, i) => (
                <button
                  key={r.id}
                  data-testid={`search-result-${r.id}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => openAt({ kind: "writing", r })}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 transition-colors ${
                    i === active ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                >
                  <FileText size={14} className="text-[#f94b0c] mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{r.title}</span>
                      {r.category && (
                        <span className="font-mono-ui text-[8px] tracking-[0.14em] uppercase text-neutral-400 shrink-0">{r.category}</span>
                      )}
                    </span>
                    {r.snippet && <span className="block text-[11.5px] text-neutral-500 dark:text-neutral-400 truncate font-serif-read">…{r.snippet}…</span>}
                    <span className="block font-mono-ui text-[8.5px] tracking-[0.14em] uppercase text-neutral-400 mt-0.5">{r.notebook_label}</span>
                  </span>
                  {i === active && <CornerDownLeft size={12} className="text-neutral-400 mt-1 shrink-0" />}
                </button>
              ))}

              {crossing.days.length > 0 && (
                <div data-testid="search-crossing" className={results.length ? "mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700" : ""}>
                  <div className="px-3 pb-1.5">
                    <p className="font-mono-ui text-[8px] tracking-[0.22em] uppercase text-neutral-400">from the crossing</p>
                    <p className="font-hand text-[16px] leading-tight text-neutral-600 dark:text-neutral-300">
                      {nDays} {nDays === 1 ? "day" : "days"} · {crossing.hands} {crossing.hands === 1 ? "hand" : "hands"}{span ? ` · ${span}` : ""}
                    </p>
                  </div>
                  {crossing.days.map((d, j) => {
                    const i = results.length + j;
                    return (
                      <button
                        key={d.id}
                        data-testid={`search-day-${d.id}`}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => openAt({ kind: "day", d })}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-start gap-2.5 transition-colors ${
                          i === active ? "bg-neutral-100 dark:bg-neutral-800" : ""
                        }`}
                      >
                        <span className={`ink-${d.variant || "slate"} w-2 h-2 rounded-full shrink-0 mt-1.5`}
                          style={{ background: "var(--ink-c)" }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={`ink-${d.variant || "slate"} font-cover text-[10px] tracking-[0.08em] shrink-0`}
                              style={{ color: "var(--ink-c)" }}>{d.character}</span>
                            <span className="font-mono-ui text-[8px] tracking-[0.14em] uppercase text-neutral-400 truncate">{d.date_label}</span>
                          </span>
                          {d.snippet && (
                            <span className="block text-[11.5px] text-neutral-500 dark:text-neutral-400 truncate font-serif-read">…{d.snippet}…</span>
                          )}
                        </span>
                        {i === active && <CornerDownLeft size={12} className="text-neutral-400 mt-1 shrink-0" />}
                      </button>
                    );
                  })}
                  {hidden > 0 && (
                    <p className="px-3 pt-1.5 pb-1 font-mono-ui text-[8px] tracking-[0.18em] uppercase text-neutral-400">
                      {hidden} more {hidden === 1 ? "day" : "days"} hold this word
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
