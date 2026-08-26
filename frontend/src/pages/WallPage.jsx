import React, { useCallback, useEffect, useState } from "react";
import LoadError from "../components/LoadError";
import { toast } from "sonner";
import { getNotes, submitNote } from "../api";
import { Plus } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import SubscribeCard from "../components/SubscribeCard";

const COLORS = {
  lemon: "#f8e8a0",
  peach: "#f9cfae",
  mint: "#c9e4cf",
  sky: "#c3dcef",
  lilac: "#dccdec",
};

const NOTE_ROTS = [-3.5, 2.5, -1.5, 3.5, -2.5, 1.5, -4, 2];
const PIN_COLORS = ["#d3232f", "#2f5d43", "#3b66a8", "#e8b04b", "#8a5a33"];

const Pin = ({ color }) => (
  <svg viewBox="0 0 24 30" className="w-5 h-6 absolute -top-[13px] left-1/2 -translate-x-1/2 z-10 drop-shadow-md" aria-hidden="true">
    <ellipse cx="12" cy="27" rx="2.4" ry="1.1" fill="rgba(0,0,0,0.3)" />
    <rect x="11.2" y="13" width="1.6" height="13" fill="#9aa2ad" />
    <circle cx="12" cy="8" r="7" fill={color} />
    <circle cx="9.4" cy="5.4" r="2.3" fill="rgba(255,255,255,0.45)" />
  </svg>
);

const Tape = () => (
  <span className="absolute -top-[10px] left-1/2 -translate-x-1/2 w-14 h-5 bg-[#f94b0c]/20 border-x-2 border-dashed border-[#f94b0c]/25 rotate-[-4deg] z-10" aria-hidden="true" />
);

const WallPage = () => {
  const [notes, setNotes] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", color: "lemon" });
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setNotes(null);
    // An empty board and an unreachable board used to render identically.
    getNotes().then(setNotes).catch(() => { setFailed(true); setNotes([]); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (form.message.trim().length < 3 || sending) return;
    setSending(true);
    try {
      await submitNote(form);
      toast.success("Note pinned! It will appear once Juan approves it.");
      setOpen(false);
      setForm({ name: "", message: "", color: "lemon" });
    } catch {
      toast.error("Could not pin the note. Try again?");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 sm:px-8 max-w-5xl mx-auto">
      {/* taped title label overlapping the frame */}
      <div className="relative z-20 flex justify-center -mb-6">
        <div className="relative bg-[#fffdf6] dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg px-8 py-2.5 rotate-[-1.5deg] note-drop">
          <span className="absolute -top-2 -left-4 w-10 h-4 bg-[#c3dcef]/70 dark:bg-[#c3dcef]/30 rotate-[-30deg]" />
          <span className="absolute -top-2 -right-4 w-10 h-4 bg-[#f8e8a0]/80 dark:bg-[#f8e8a0]/30 rotate-[30deg]" />
          <p className="font-cover text-[16px] text-[#2a2620] dark:text-neutral-100 tracking-wide text-center">THE WALL</p>
          <p className="font-mono-ui text-[8px] tracking-[0.24em] uppercase text-neutral-400 text-center">notes pinned by readers</p>
        </div>
      </div>

      <div className="cork-frame">
        <div className="cork-board relative px-5 sm:px-9 pt-12 pb-9" data-testid="notes-wall">
          {notes === null ? (
            <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-[#5a3a1a]/60 animate-pulse text-center py-24">unrolling the wall…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8 items-start">
              {/* CTA note */}
              <button
                data-testid="pin-note-btn"
                onClick={() => setOpen(true)}
                className="group note-drop text-left"
                style={{ animationDelay: "0ms" }}
              >
                <div className="pinned-note relative p-4 pt-6 min-h-[150px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#fffdf6]/70 bg-[#5a3a1a]/10 hover:bg-[#5a3a1a]/20 transition-colors" style={{ "--rot": "-2deg" }}>
                  <span className="w-9 h-9 rounded-full bg-[#fffdf6] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Plus size={16} className="text-[#f94b0c]" />
                  </span>
                  <p className="font-hand text-[17px] text-[#fffdf6] text-center leading-tight drop-shadow-sm">stick your own note</p>
                </div>
              </button>

              {/* subscribe card pinned to the board */}
              <div className="note-drop" style={{ animationDelay: "70ms", marginTop: 10 }}>
                <div className="pinned-note relative" style={{ "--rot": "1.8deg" }}>
                  <Pin color="#d3232f" />
                  <SubscribeCard variant="board" />
                </div>
              </div>

              {failed ? (
                <div className="col-span-2">
                  <LoadError what="The notes" onRetry={load} />
                </div>
              ) : notes.length === 0 ? (
                <div className="note-drop col-span-2" style={{ animationDelay: "140ms" }}>
                  <div className="pinned-note relative p-4 pt-6 min-h-[150px] flex flex-col justify-center shadow-md note-paper" style={{ "--rot": "-1.5deg", background: COLORS.lemon }}>
                    <Pin color="#2f5d43" />
                    <p className="font-hand text-[18px] text-[#2a2620] text-center leading-snug">The board is empty. Be the first to pin something kind, weird, or true.</p>
                  </div>
                </div>
              ) : (
                notes.map((n, i) => (
                  <div
                    key={n.id}
                    data-testid={`wall-note-${n.id}`}
                    className="group note-drop"
                    style={{ animationDelay: `${(i + 2) * 70}ms`, marginTop: (i % 3) * 9 }}
                  >
                    <div
                      className="pinned-note relative p-4 pt-6 min-h-[150px] flex flex-col shadow-md note-paper note-fold"
                      style={{ "--rot": `${NOTE_ROTS[i % NOTE_ROTS.length]}deg`, background: COLORS[n.color] || COLORS.lemon }}
                    >
                      {i % 4 === 3 ? <Tape /> : <Pin color={PIN_COLORS[i % PIN_COLORS.length]} />}
                      <p className="font-hand text-[16px] leading-snug text-[#2a2620] flex-1">{n.message}</p>
                      <p className="font-mono-ui text-[8.5px] tracking-[0.14em] uppercase text-[#2a2620]/50 mt-3">
                        — {n.name || "anonymous"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* board doodles */}
          <p className="absolute bottom-2 right-5 font-hand text-[14px] text-[#5a3a1a]/50 -rotate-3 select-none hidden sm:block" aria-hidden="true">
        be kind. leave a trace. ✎
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cover text-base">Stick a note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ background: COLORS[form.color] }}>
              <textarea
                data-testid="note-message-input"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value.slice(0, 280) })}
                placeholder="Write something kind, weird, or true…"
                className="w-full bg-transparent outline-none font-hand text-[17px] text-[#2a2620] placeholder:text-[#2a2620]/40 resize-none min-h-[90px]"
              />
              <p className="text-right font-mono-ui text-[9px] text-[#2a2620]/40">{form.message.length}/280</p>
            </div>
            <Input data-testid="note-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name (optional)" className="h-9 rounded-xl text-[13px]" />
            <div className="flex items-center gap-2">
              {Object.entries(COLORS).map(([key, hex]) => (
                <button key={key} aria-label={key} onClick={() => setForm({ ...form, color: key })} className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === key ? "border-neutral-900 dark:border-white scale-110" : "border-transparent"}`} style={{ background: hex }} />
              ))}
              <Button data-testid="note-submit-btn" onClick={send} disabled={sending || form.message.trim().length < 3} className="rounded-full h-9 ml-auto text-[12px]">
                {sending ? "Pinning…" : "Pin it"}
              </Button>
            </div>
            <p className="font-mono-ui text-[9px] tracking-[0.1em] uppercase text-neutral-400">Notes appear after the owner approves them.</p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default WallPage;
