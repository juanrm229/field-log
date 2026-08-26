import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getArchive } from "../api";
import { Library } from "lucide-react";

const SPINE_COLORS = ["#f94b0c", "#3b66a8", "#2f5d43", "#a4243b", "#465260", "#8a5a33"];

const ArchivePage = () => {
  const navigate = useNavigate();
  const [years, setYears] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    getArchive().then((d) => {
      setYears(d);
      if (d.length > 0) setSel(d[0].year);
    }).catch(() => setYears([]));
  }, []);

  if (years === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">dusting the shelf…</p>
      </main>
    );
  }

  const selected = years.find((y) => y.year === sel);

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 sm:px-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <p className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-[#f94b0c] mb-1">The Archive</p>
        <h1 className="font-cover text-xl text-neutral-900 dark:text-neutral-100">A shelf of years</h1>
        <p className="font-hand text-[17px] text-neutral-400 mt-1">pull a spine to see what that year held</p>
      </div>

      {years.length === 0 ? (
        <div className="text-center py-16">
          <Library size={26} className="mx-auto text-neutral-300 mb-3" />
          <p className="font-hand text-[20px] text-neutral-400">The shelf is still empty.</p>
        </div>
      ) : (
        <>
          {/* the shelf */}
          <div className="relative mx-auto max-w-xl" data-testid="archive-shelf">
            <div className="flex items-end justify-center gap-2.5 px-6 min-h-[230px]">
              {years.map((y, i) => {
                const active = y.year === sel;
                return (
                  <button
                    key={y.year}
                    data-testid={`spine-${y.year}`}
                    onClick={() => setSel(y.year)}
                    className={`book-spine ${active ? "book-spine-active" : ""}`}
                    style={{
                      background: SPINE_COLORS[i % SPINE_COLORS.length],
                      height: 150 + Math.min(y.count * 10, 60),
                    }}
                    aria-label={`Open year ${y.year}`}
                  >
                    <span className="spine-band" />
                    <span className="spine-text font-cover">{y.year}</span>
                    <span className="spine-count font-mono-ui">{y.count}</span>
                  </button>
                );
              })}
              {/* leaning decorative book */}
              <div className="book-lean hidden sm:block" aria-hidden="true" />
            </div>
            <div className="shelf-plank" />
            <p className="mt-2 text-right font-hand text-[14px] text-neutral-400 -rotate-1 pr-2" aria-hidden="true">everything I've let go of</p>
          </div>

          {/* selected year contents */}
          {selected && (
            <div key={selected.year} className="mt-10 cream-page rounded-xl shadow-lg px-6 sm:px-9 py-7 year-panel" data-testid={`year-panel-${selected.year}`}>
              <div className="flex items-baseline justify-between mb-4 border-b border-dashed border-neutral-400/50 pb-2">
                <h2 className="font-hand font-bold text-[26px] text-[#2a2620]">{selected.year}</h2>
                <span className="font-mono-ui text-[9px] tracking-[0.18em] uppercase text-neutral-400">
                  {selected.count} piece{selected.count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-1">
                {selected.entries.map((e) => (
                  <button
                    key={e.id}
                    data-testid={`archive-entry-${e.id}`}
                    onClick={() => navigate(`/notebook/${e.notebook_slug}?entry=${e.id}`)}
                    className="w-full flex items-baseline gap-2 text-left group py-1.5"
                  >
                    <span className="font-hand text-[17px] text-[#2a2620] group-hover:text-[#f94b0c] transition-colors underline decoration-dashed decoration-neutral-400/50 underline-offset-4">
                      {e.title}
                    </span>
                    {e.category && (
                      <span className="font-mono-ui text-[8px] tracking-[0.16em] uppercase text-white bg-[#f94b0c] px-1.5 py-0.5 rounded-sm shrink-0">{e.category}</span>
                    )}
                    <span className="flex-1 border-b border-dotted border-neutral-400/40 mx-1" />
                    <span className="font-mono-ui text-[8.5px] uppercase tracking-wider text-neutral-400 shrink-0">
                      {e.words.toLocaleString()} w · {e.minutes} min
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default ArchivePage;
