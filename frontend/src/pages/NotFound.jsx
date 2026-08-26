import React, { useRef, useState } from "react";

// 404 page — giant orange digits, draggable & sliceable (double-click)
const Digit = ({ char }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [sliced, setSliced] = useState(false);
  const drag = useRef(null);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX - pos.x, sy: e.clientY - pos.y };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setPos({ x: e.clientX - drag.current.sx, y: e.clientY - drag.current.sy });
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onDoubleClick = () => {
    setSliced(true);
    setTimeout(() => setSliced(false), 1300);
  };

  return (
    <div
      className="relative touch-none cursor-grab active:cursor-grabbing select-none"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {sliced ? (
        <>
          <span className="digit-404 block slice-top" style={{ clipPath: "polygon(0 0, 100% 0, 100% 46%, 0 56%)" }}>{char}</span>
          <span className="digit-404 block slice-bottom absolute inset-0" style={{ clipPath: "polygon(0 56%, 100% 46%, 100% 100%, 0 100%)" }}>{char}</span>
        </>
      ) : (
        <span className="digit-404 block">{char}</span>
      )}
    </div>
  );
};

const NotFound = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="flex items-center gap-[2vw]" data-testid="notfound-404">
        <Digit char="4" />
        <Digit char="0" />
        <Digit char="4" />
      </div>
      <p className="absolute bottom-7 font-mono-ui text-[11px] text-neutral-500 dark:text-neutral-400">slice or drag</p>
    </main>
  );
};

export default NotFound;
