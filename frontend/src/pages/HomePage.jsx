import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NotebookCover from "../components/NotebookCover";
import { useNotebooks } from "../context/NotebooksContext";

const ROTS = [-7, -2, 3, -4, 2, -3, 4];

const HomePage = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const { notebooks, loading } = useNotebooks();

  const n = notebooks.length;
  const spread = n <= 3 ? 63 : n === 4 ? 52 : 44;

  return (
    <main className="min-h-screen flex items-center justify-center overflow-hidden">
      {loading ? (
        <div className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">opening the drawer…</div>
      ) : (
        <div className="relative w-[min(58vw,300px)]" style={{ aspectRatio: "300/460", maxHeight: "50vh" }}>
          {notebooks.map((nb, i) => {
            const x = (i - (n - 1) / 2) * spread;
            const rot = ROTS[i % ROTS.length];
            const isHover = hovered === nb.slug;
            return (
              <button
                key={nb.id}
                data-testid={`notebook-${nb.slug}`}
                aria-label={`Open ${nb.label} notebook`}
                onMouseEnter={() => setHovered(nb.slug)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/notebook/${nb.slug}`)}
                className="absolute top-0 w-[62%] cursor-pointer notebook-slot focus:outline-none"
                style={{
                  left: "19%",
                  zIndex: isHover ? 50 : 40 - i * 5,
                  transform: `translateX(${x}%) rotate(${isHover ? 0 : rot}deg) translateY(${isHover ? "-18px" : "0px"}) scale(${isHover ? 1.07 : 1})`,
                }}
              >
                <NotebookCover variant={nb.variant} label={nb.label} coverTitle={nb.cover_title} subtitle={nb.subtitle} />
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default HomePage;
