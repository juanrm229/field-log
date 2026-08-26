import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { getNotes, submitNote } from "../api";
import { Plus, StickyNote } from "lucide-react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const COLORS = {
  lemon: "#f8e8a0",
  peach: "#f9cfae",
  mint: "#c9e4cf",
  sky: "#c3dcef",
  lilac: "#dccdec",
};

const NOTE_ROTS = [-3, 2, -1.5, 3, -2.5, 1, -4, 2.5];

const WallPage = () => {
  const [notes, setNotes] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", color: "lemon" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

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
      <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="font-cover text-xl text-neutral-900 dark:text-neutral-100">The Wall</h1>
          <p className="font-mono-ui text-[10px] tracking-[0.18em] uppercase text-neutral-400 mt-1">Notes pinned by readers</p>
        </div>
        <Button data-testid="pin-note-btn" onClick={() => setOpen(true)} className="rounded-full h-9 gap-1.5 text-[12px]">
          <Plus size={14} /> Stick a note
        </Button>
      </div>

      {notes === null ? (
        <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse text-center py-20">unrolling the wall…</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-20">
          <StickyNote size={26} className="mx-auto text-neutral-300 mb-3" />
          <p className="font-hand text-[20px] text-neutral-400">The wall is empty. Be the first to stick a note!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5" data-testid="notes-wall">
          {notes.map((n, i) => (
            <div
              key={n.id}
              data-testid={`wall-note-${n.id}`}
              className="sticky-note relative p-4 min-h-[130px] flex flex-col"
              style={{ background: COLORS[n.color] || COLORS.lemon, transform: `rotate(${NOTE_ROTS[i % NOTE_ROTS.length]}deg)` }}
            >
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/50 border border-black/5 rotate-[-2deg]" />
              <p className="font-hand text-[16px] leading-snug text-[#2a2620] flex-1">{n.message}</p>
              <p className="font-mono-ui text-[8.5px] tracking-[0.14em] uppercase text-[#2a2620]/50 mt-3">
                — {n.name || "anonymous"}
              </p>
            </div>
          ))}
        </div>
      )}

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
