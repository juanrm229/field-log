import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, FileText } from "lucide-react";
import { searchEntries } from "../api";

// Quick search overlay — finds any piece across every notebook
const SearchOverlay = ({ open, onClose }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounce = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setSearched(false);
      setActive(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const data = await searchEntries(q.trim());
        setResults(data);
        setActive(0);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      }
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [q]);

  const openResult = (r) => {
    onClose();
    navigate(r.slug ? `/read/${r.slug}` : `/notebook/${r.notebook_slug}?entry=${r.id}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter" && results[active]) openResult(results[active]);
  };

  if (!open) return null;

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
            placeholder="Search stories, poems, journals…"
            className="w-full h-12 bg-transparent outline-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
          />
          <kbd className="font-mono-ui text-[9px] text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-2" data-testid="search-results">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center font-mono-ui text-[10px] tracking-[0.16em] uppercase text-neutral-400">
              {q.trim().length < 2 ? "type to search the field logs" : searched ? "nothing found in the drawer" : "searching…"}
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                data-testid={`search-result-${r.id}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => openResult(r)}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
