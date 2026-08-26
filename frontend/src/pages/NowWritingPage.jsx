import React, { useCallback, useEffect, useState } from "react";
import LoadError from "../components/LoadError";
import { getNowWriting } from "../api";
import { PenLine } from "lucide-react";
import SubscribeCard from "../components/SubscribeCard";

const Ring = ({ percent }) => {
  const r = 84;
  const c = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, percent)) * c;
  return (
    <svg width="210" height="210" viewBox="0 0 210 210" className="-rotate-90">
      <circle cx="105" cy="105" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" />
      <circle
        cx="105" cy="105" r={r} fill="none" stroke="#f94b0c" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
};

const NowWritingPage = () => {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [animate, setAnimate] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setData(null);
    getNowWriting().then((d) => {
      setData(d);
      setTimeout(() => setAnimate(true), 150);
    }).catch(() => {
      // "The desk is quiet" is a real state the owner can choose; a failed
      // request should not impersonate it.
      setFailed(true);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (failed) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadError what="The desk" onRetry={load} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">checking the desk…</p>
      </main>
    );
  }

  if (!data.active) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <PenLine size={22} className="text-neutral-300" />
        <p className="font-hand text-[24px] text-neutral-500">The desk is quiet right now.</p>
        <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">no active manuscript — check back soon</p>
        <div className="mt-6 w-full max-w-sm"><SubscribeCard /></div>
      </main>
    );
  }

  const pct = data.goal_words > 0 ? data.current_words / data.goal_words : 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-20 pb-16">
      <div className="w-full max-w-md text-center">
        <p className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-[#f94b0c] mb-2">Now writing</p>
        <h1 className="font-cover text-[clamp(22px,4vw,32px)] text-neutral-900 dark:text-neutral-100 mb-8">{data.title || "Untitled manuscript"}</h1>
        <div className="relative inline-block text-neutral-400" data-testid="progress-ring">
          <Ring percent={animate ? pct : 0} />
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <p className="font-cover text-[26px] text-neutral-900 dark:text-neutral-100">{Math.round(pct * 100)}%</p>
            <p className="font-mono-ui text-[9px] tracking-[0.16em] uppercase text-neutral-400 mt-1">
              {(data.current_words || 0).toLocaleString()} / {(data.goal_words || 0).toLocaleString()} words
            </p>
          </div>
        </div>
        {data.note && (
          <div className="mt-8 mx-auto max-w-sm cream-page rounded-xl px-6 py-5 shadow-md -rotate-1">
            <p className="font-hand text-[17px] leading-relaxed text-[#3a352c] whitespace-pre-line">{data.note}</p>
          </div>
        )}
        {data.updated_at && (
          <p className="mt-6 font-mono-ui text-[9px] tracking-[0.16em] uppercase text-neutral-400">
            last logged {new Date(data.updated_at).toLocaleDateString()}
          </p>
        )}
        <div className="mt-8 mx-auto max-w-sm text-left"><SubscribeCard /></div>
      </div>
    </main>
  );
};

export default NowWritingPage;
