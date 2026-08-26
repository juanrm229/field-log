import React, { useState } from "react";
import { toast } from "sonner";
import { subscribe } from "../api";
import { Mail, ArrowRight, Check } from "lucide-react";

export const SubscribeCard = ({ variant = "page" }) => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");

  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!/^\S+@\S+\.\S+$/.test(email) || state === "sending") return;
    setState("sending");
    try {
      const res = await subscribe({ email });
      setState("done");
      toast.success(res.already ? "You're already on the list!" : "You're on the list. Letters incoming!");
    } catch {
      setState("idle");
      toast.error("Could not subscribe. Try again?");
    }
  };

  const form = state === "done" ? (
    <div className="flex items-center gap-2 text-[#2f5d43]" data-testid="subscribe-done">
      <Check size={14} />
      <span className="font-hand text-[16px]">See you in your inbox.</span>
    </div>
  ) : (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <input
        data-testid="subscribe-email-input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 min-w-0 bg-transparent border-b border-dashed border-neutral-400/70 font-hand text-[16px] text-[#1d1b17] placeholder:text-neutral-400 outline-none py-1 focus:border-[#f94b0c] transition-colors"
      />
      <button
        data-testid="subscribe-submit-btn"
        type="submit"
        disabled={state === "sending"}
        aria-label="Subscribe"
        className="pill-dark h-8 w-8 shrink-0 disabled:opacity-40"
      >
        <ArrowRight size={13} />
      </button>
    </form>
  );

  if (variant === "board") {
    return (
      <div className="relative bg-[#fffdf6] p-4 pt-6 min-h-[150px] flex flex-col shadow-md note-paper" data-testid="subscribe-card">
        <div className="flex items-center gap-1.5 mb-1">
          <Mail size={13} className="text-[#f94b0c]" />
          <p className="font-cover text-[12px] text-[#2a2620] tracking-wide">FIELD MAIL</p>
        </div>
        <p className="font-hand text-[15px] leading-snug text-[#3a352c] flex-1 mb-2">
          Leave your email — get a letter whenever something new is published.
        </p>
        {form}
      </div>
    );
  }

  return (
    <div className="cream-page rounded-xl px-6 py-5 shadow-md rotate-1" data-testid="subscribe-card">
      <div className="flex items-center gap-1.5 mb-1">
        <Mail size={13} className="text-[#f94b0c]" />
        <p className="font-cover text-[12px] text-[#2a2620] tracking-wide">FIELD MAIL</p>
      </div>
      <p className="font-hand text-[16px] leading-snug text-[#3a352c] mb-2">
        Want a letter when a new piece is published?
      </p>
      {form}
    </div>
  );
};

export default SubscribeCard;
