import React, { useEffect, useState } from "react";
import { Heart, Sparkles, Feather, Coffee } from "lucide-react";
import { getReactions, sendReaction } from "../api";

const TYPES = [
  { key: "heart", icon: Heart, label: "Loved it" },
  { key: "sparkles", icon: Sparkles, label: "Beautiful" },
  { key: "feather", icon: Feather, label: "Inspired" },
  { key: "coffee", icon: Coffee, label: "Cozy" },
];

// Reader reactions — one tap per type per entry (guarded via localStorage)
const ReactionBar = ({ entryId, ink }) => {
  const [counts, setCounts] = useState(null);
  const [mine, setMine] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`reacted_${entryId}`)) || {}; } catch { return {}; }
  });

  useEffect(() => {
    getReactions(entryId).then(setCounts).catch(() => setCounts(null));
  }, [entryId]);

  const react = async (type) => {
    if (mine[type]) return;
    const nextMine = { ...mine, [type]: true };
    setMine(nextMine);
    localStorage.setItem(`reacted_${entryId}`, JSON.stringify(nextMine));
    setCounts((c) => ({ ...(c || {}), [type]: ((c && c[type]) || 0) + 1 })); // optimistic
    try {
      const fresh = await sendReaction(entryId, type);
      setCounts(fresh);
    } catch (e) { /* keep optimistic */ }
  };

  return (
    <div className="mt-12 pt-6 border-t border-dashed border-neutral-300/60" data-testid="reaction-bar">
      <p className={`font-mono-ui text-[9px] tracking-[0.24em] uppercase mb-3 ${ink ? "text-neutral-500" : "text-neutral-400"}`}>
        Leave a reaction
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {TYPES.map(({ key, icon: Icon, label }) => {
          const active = !!mine[key];
          const n = counts ? counts[key] || 0 : 0;
          return (
            <button
              key={key}
              data-testid={`react-${key}`}
              onClick={() => react(key)}
              title={label}
              className={`flex items-center gap-1.5 h-9 px-3.5 rounded-full border transition-all duration-200 ${
                active
                  ? "border-[#f94b0c] bg-[#f94b0c]/10 text-[#f94b0c] scale-[1.03]"
                  : ink
                    ? "border-white/15 text-neutral-400 hover:border-white/30 hover:text-neutral-200"
                    : "border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800"
              }`}
            >
              <Icon size={14} fill={active && key === "heart" ? "currentColor" : "none"} />
              <span className="font-mono-ui text-[10px]">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReactionBar;
