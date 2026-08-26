import React from "react";
import { useSite } from "../context/SiteContext";

/*
  Renders a COMMONPLACE BOOK memo book cover in 3 variants:
  - orange : Expedition Orange with topographic contour lines (About me)
  - paper  : off-white with fountain pen nib ink illustration (Writings)
  - blue   : halftone blue mountains (Kind words)
  Scales fluidly — parent controls width; aspect ratio is fixed.
*/

const TopoLines = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 460" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1">
      <path d="M180,40 C230,60 260,110 250,170 C240,230 190,250 200,310 C210,370 260,390 300,400" />
      <path d="M200,20 C255,45 285,105 272,175 C260,245 205,265 215,330 C225,395 275,415 310,425" />
      <path d="M160,60 C205,80 232,120 224,170 C216,220 172,240 180,295 C188,350 230,370 268,382" />
      <path d="M140,90 C178,108 200,138 194,178 C188,218 152,236 158,282 C164,328 200,348 235,360" />
      <path d="M-20,300 C40,280 90,300 120,340 C150,380 140,430 160,470" />
      <path d="M-20,340 C35,322 80,340 108,376 C136,412 128,450 146,480" />
      <path d="M-10,120 C30,130 60,160 60,200 C60,240 30,262 36,300" />
      <circle cx="150" cy="330" r="130" strokeDasharray="2 5" strokeOpacity="0.22" />
      <circle cx="150" cy="330" r="90" strokeDasharray="2 5" strokeOpacity="0.18" />
      <line x1="20" y1="330" x2="280" y2="330" strokeDasharray="2 5" strokeOpacity="0.2" />
      <line x1="150" y1="210" x2="150" y2="452" strokeDasharray="2 5" strokeOpacity="0.2" />
    </g>
  </svg>
);

const InkIllustration = () => (
  <svg className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 w-[52%]" viewBox="0 0 120 150">
    {/* fountain pen nib, vintage engraving style */}
    <g stroke="#2f3a45" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 12 C44 42 34 66 34 88 C34 112 45 128 60 136 C75 128 86 112 86 88 C86 66 76 42 60 12 Z" fill="#f7f6f2" />
      <path d="M60 34 L60 96" />
      <circle cx="60" cy="102" r="5" fill="#2f3a45" />
      <path d="M60 107 L52 128 M60 107 L68 128" strokeWidth="1.2" />
      <path d="M42 60 C48 56 54 54 60 54 C66 54 72 56 78 60" strokeWidth="1" strokeOpacity="0.6" />
      <path d="M40 74 C47 70 53 68 60 68 C67 68 73 70 80 74" strokeWidth="1" strokeOpacity="0.5" />
    </g>
    {/* ink drops */}
    <circle cx="28" cy="128" r="3" fill="#c2410c" fillOpacity="0.85" />
    <circle cx="93" cy="120" r="2" fill="#c2410c" fillOpacity="0.6" />
    <path d="M22 138 C26 134 32 134 36 138" stroke="#c2410c" strokeWidth="1" fill="none" strokeOpacity="0.6" />
    {/* laurel strokes */}
    <path d="M18 60 C14 74 14 90 20 104" stroke="#5b6b5d" strokeWidth="1.2" fill="none" />
    <path d="M102 60 C106 74 106 90 100 104" stroke="#5b6b5d" strokeWidth="1.2" fill="none" />
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <path d={`M${17 - i * 0.5} ${66 + i * 11} q -7 -1 -10 -7 q 8 -2 10 7`} fill="#7d9180" fillOpacity="0.8" />
        <path d={`M${103 + i * 0.5} ${66 + i * 11} q 7 -1 10 -7 q -8 -2 -10 7`} fill="#7d9180" fillOpacity="0.8" />
      </g>
    ))}
  </svg>
);

const HalftoneMountains = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 460" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="halftone" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="1.6" cy="1.6" r="1.1" fill="#3b66a8" />
      </pattern>
      <pattern id="halftoneLight" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="0.8" fill="#6a8fc4" />
      </pattern>
    </defs>
    {/* sky dots upper area */}
    <rect x="0" y="120" width="300" height="140" fill="url(#halftoneLight)" opacity="0.45" />
    {/* back ridge */}
    <path d="M-10,360 L60,240 L110,320 L170,215 L235,330 L310,250 L310,470 L-10,470 Z" fill="url(#halftone)" />
    {/* snow caps */}
    <path d="M170,215 L192,255 L178,250 L168,262 L155,248 L148,254 Z" fill="#f4f6fa" />
    <path d="M60,240 L76,270 L64,265 L56,275 L46,264 Z" fill="#f4f6fa" />
    {/* front ridge darker */}
    <path d="M-10,420 L70,330 L130,400 L200,310 L260,395 L310,340 L310,470 L-10,470 Z" fill="#274b80" opacity="0.92" />
    <path d="M200,310 L216,338 L204,332 L196,344 L184,330 Z" fill="#e8edf5" />
    {/* pine hints */}
    <g fill="#1d3a63">
      <path d="M40,430 l6,-16 l6,16 Z" />
      <path d="M60,436 l5,-13 l5,13 Z" />
      <path d="M250,432 l6,-15 l6,15 Z" />
    </g>
  </svg>
);

const DuneLines = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 460" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="#8a6a3f" strokeWidth="1.2" strokeOpacity="0.35">
      <path d="M-10,300 C60,270 120,310 180,285 C240,262 280,290 310,275" />
      <path d="M-10,330 C55,305 125,342 185,318 C245,296 285,322 310,308" />
      <path d="M-10,360 C50,338 130,372 190,350 C250,330 288,352 310,340" />
      <path d="M-10,392 C58,372 128,402 192,382 C252,364 290,384 310,372" />
      <path d="M-10,424 C62,406 132,432 196,414 C254,398 292,416 310,404" />
    </g>
    <circle cx="235" cy="215" r="24" fill="none" stroke="#8a6a3f" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="3 4" />
    <circle cx="235" cy="215" r="14" fill="#8a6a3f" fillOpacity="0.22" />
  </svg>
);

const InkWaves = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 460" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="#28504a" strokeWidth="1.2" strokeOpacity="0.3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M-10,${290 + i * 26} q 20,-12 40,0 t 40,0 t 40,0 t 40,0 t 40,0 t 40,0 t 40,0 t 40,0`} />
      ))}
    </g>
    <path d="M60 210 q 12 -30 40 -34 q -4 26 -26 34 q 22 2 34 -12 q 2 24 -22 32 q -22 6 -26 -20 Z" fill="#28504a" fillOpacity="0.25" />
  </svg>
);

const NightStars = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 460" preserveAspectRatio="xMidYMid slice">
    <g fill="#e7ecf7">
      {[[30, 320, 1.4], [70, 380, 1], [120, 340, 1.8], [180, 400, 1.2], [230, 350, 1.5], [260, 300, 1], [50, 260, 1.1], [200, 280, 1], [150, 420, 1.3], [90, 430, 1], [250, 430, 1.6], [35, 415, 1.2]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} opacity="0.85" />
      ))}
    </g>
    <circle cx="235" cy="255" r="26" fill="#f0f3fa" opacity="0.92" />
    <circle cx="226" cy="248" r="22" fill="#1c2233" opacity="0.55" />
    <g fill="none" stroke="#e7ecf7" strokeWidth="1" strokeOpacity="0.35">
      <path d="M20 300 L60 340 L110 310 L170 370 L230 330 L280 360" strokeDasharray="2 5" />
    </g>
  </svg>
);

const VARIANT_STYLES = {
  orange: {
    bg: "bg-[#f94b0c]",
    title: "text-white",
    sub: "text-white/90",
    label: "text-white/95",
  },
  paper: {
    bg: "bg-[#f0efe9]",
    title: "text-[#20303c]",
    sub: "text-[#20303c]/80",
    label: "text-[#20303c]/90",
  },
  blue: {
    bg: "bg-[#dfe7f2]",
    title: "text-[#1d3a63]",
    sub: "text-[#1d3a63]/85",
    label: "text-[#12294a]",
  },
  forest: {
    bg: "bg-[#2f5d43]",
    title: "text-[#f2efe4]",
    sub: "text-[#f2efe4]/85",
    label: "text-[#f2efe4]/95",
  },
  night: {
    bg: "bg-[#1c2233]",
    title: "text-[#e7ecf7]",
    sub: "text-[#e7ecf7]/80",
    label: "text-[#e7ecf7]/95",
  },
  crimson: {
    bg: "bg-[#a4243b]",
    title: "text-[#f7ecdf]",
    sub: "text-[#f7ecdf]/85",
    label: "text-[#f7ecdf]/95",
  },
  sand: {
    bg: "bg-[#dcc29a]",
    title: "text-[#4a3820]",
    sub: "text-[#4a3820]/80",
    label: "text-[#4a3820]/90",
  },
  mint: {
    bg: "bg-[#b9d6c6]",
    title: "text-[#1f4038]",
    sub: "text-[#1f4038]/80",
    label: "text-[#1f4038]/90",
  },
  slate: {
    bg: "bg-[#465260]",
    title: "text-[#e8ecf2]",
    sub: "text-[#e8ecf2]/80",
    label: "text-[#e8ecf2]/95",
  },
};

const NotebookCover = ({ variant = "orange", label, subtitle = [], coverTitle = "COMMONPLACE BOOK", large = false, back = false }) => {
  const s = VARIANT_STYLES[variant] || VARIANT_STYLES.orange;
  // The back-cover blurb is owner-editable; the defaults only cover a first
  // paint before the settings request lands.
  const { site } = useSite();
  const backLines = site.back_lines && site.back_lines.length ? site.back_lines : [];
  const backEnd = site.back_end || "fin.";
  const titleText = (coverTitle || "COMMONPLACE BOOK").split(" ").join("\n");

  // The cover title was sized for a five-letter word. "COMMONPLACE" is eleven,
  // and ran straight off the edge. Archivo Black with 0.22em tracking takes
  // roughly 0.95em per character and the print area is about 80% of the cover,
  // so the type has to come down as the longest word grows.
  const longestWord = titleText.split("\n").reduce((m, w) => Math.max(m, w.length), 1);
  const fit = Math.min(1, 5.5 / longestWord);
  const titleStyle = large
    ? { fontSize: `clamp(${Math.round(28 * fit)}px, ${(4.6 * fit).toFixed(2)}vh, ${Math.round(44 * fit)}px)` }
    : { fontSize: `clamp(${Math.round(13 * fit)}px, ${(14 * fit).toFixed(2)}cqw, ${Math.round(30 * fit)}px)` };
  // The back cover prints it on one line, with wider tracking still.
  const backFit = Math.min(1, 9 / (coverTitle || "COMMONPLACE BOOK").length);
  const backTitleStyle = large
    ? { fontSize: `${Math.round(13 * backFit)}px` }
    : { fontSize: `clamp(${Math.round(7 * backFit)}px, ${(5.9 * backFit).toFixed(2)}cqw, ${Math.round(12 * backFit)}px)` };

  if (back) {
    return (
      <div className={`notebook-cover notebook-cover-back relative overflow-hidden ${s.bg}`} style={{ aspectRatio: "300 / 460" }}>
        {/* binding edge mirrored to the right */}
        <div className="absolute right-0 top-0 bottom-0 w-[6%] bg-gradient-to-l from-black/25 via-black/10 to-transparent" />
        <div className="absolute right-[5%] top-0 bottom-0 w-px bg-black/10" />
        <div className={`absolute inset-0 flex flex-col items-center justify-between px-[12%] py-[10%] ${s.sub}`}>
          <p style={backTitleStyle} className={`font-cover ${large ? "text-[13px]" : "cover-back-title text-[clamp(7px,1vw,11px)]"} tracking-[0.28em] ${s.title}`}>{coverTitle || "COMMONPLACE BOOK"}</p>
          <div className="text-center space-y-[6px]">
            <div className={`mx-auto w-10 h-px ${variant === "paper" || variant === "blue" ? "bg-black/20" : "bg-white/30"}`} />
            {subtitle.map((line, i) => (
              <p key={i} className={`font-mono-ui ${large ? "text-[8.5px]" : "cover-back-sub text-[clamp(4.5px,0.7vw,7px)]"} tracking-[0.16em] uppercase leading-relaxed`}>{line}</p>
            ))}
            {backLines.map((line, i) => (
              <p key={i} className={`font-mono-ui ${large ? "text-[8.5px]" : "cover-back-sub text-[clamp(4.5px,0.7vw,7px)]"} tracking-[0.16em] uppercase`}>{line}</p>
            ))}
            <div className={`mx-auto w-10 h-px ${variant === "paper" || variant === "blue" ? "bg-black/20" : "bg-white/30"}`} />
          </div>
          <p className={`font-hand ${large ? "text-[18px]" : "cover-fin text-[clamp(9px,1.4vw,14px)]"} ${s.label}`}>{backEnd}</p>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(245deg, rgba(255,255,255,0.10) 0%, transparent 30%, transparent 75%, rgba(0,0,0,0.06) 100%)" }} />
      </div>
    );
  }

  return (
    <div
      className={`notebook-cover relative overflow-hidden ${s.bg}`}
      style={{ aspectRatio: "300 / 460" }}
    >
      {variant === "orange" && <TopoLines />}
      {variant === "paper" && <InkIllustration />}
      {variant === "blue" && <HalftoneMountains />}
      {variant === "forest" && <TopoLines />}
      {variant === "night" && <NightStars />}
      {variant === "crimson" && <TopoLines />}
      {variant === "sand" && <DuneLines />}
      {variant === "mint" && <InkWaves />}
      {variant === "slate" && <NightStars />}

      {/* binding edge */}
      <div className="absolute left-0 top-0 bottom-0 w-[6%] bg-gradient-to-r from-black/25 via-black/10 to-transparent" />
      <div className="absolute left-[5%] top-0 bottom-0 w-px bg-black/10" />

      {/* cover print */}
      <div className="absolute inset-0 flex flex-col items-center pt-[13%] px-[10%]">
        <h2 style={titleStyle} className={`font-cover ${s.title} ${large ? "text-[clamp(28px,4.6vh,44px)]" : "cover-title text-[clamp(15px,2.6vw,26px)]"} leading-[1.05] tracking-[0.22em] text-center whitespace-pre-line`}>
          {titleText}
        </h2>
        <div className={`mt-[7%] text-center ${s.sub}`}>
          {subtitle.map((line, i) => (
            <p key={i} className={`font-semibold ${large ? "text-[11px]" : "cover-sub text-[clamp(5px,0.85vw,9px)]"} tracking-wide leading-snug`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* handwritten label */}
      <p className={`absolute bottom-[4.5%] left-0 right-0 text-center font-hand ${s.label} ${large ? "text-[22px]" : "cover-label text-[clamp(10px,1.6vw,16px)]"}`}>
        {label}
      </p>

      {/* paper texture sheen */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, transparent 30%, transparent 75%, rgba(0,0,0,0.06) 100%)" }} />
    </div>
  );
};

export default NotebookCover;
