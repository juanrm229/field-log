import React from "react";
import { RotateCw } from "lucide-react";

/*
  Shown when a request fails, so a network problem cannot be mistaken for an
  empty shelf. The distinction matters most on a writing site: rendering a
  failure as "nothing here" tells the reader the author has written nothing.

  The backend sleeps when idle and takes a few seconds to wake, so the copy
  points at the likeliest cause and offers a retry rather than blaming them.
*/
const LoadError = ({ what = "this page", onRetry }) => (
  <div className="flex flex-col items-center text-center gap-3 py-10 px-6" role="alert">
    <p className="font-hand text-[20px] text-neutral-500 dark:text-neutral-400">
      Couldn't reach the desk.
    </p>
    <p className="font-mono-ui text-[10px] tracking-[0.18em] uppercase text-neutral-400 dark:text-neutral-500 max-w-[16rem] leading-relaxed">
      {what} didn't load — the notebook is there, the connection isn't.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] uppercase text-[#f94b0c] border border-[#f94b0c]/40 rounded-full px-4 py-2 hover:bg-[#f94b0c]/10 transition-colors"
      >
        <RotateCw size={12} aria-hidden="true" />
        try again
      </button>
    )}
  </div>
);

export default LoadError;
