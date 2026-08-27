import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getSimpangStudio, createCharacter, updateCharacter, deleteCharacter,
  createMoment, updateMoment, deleteMoment,
  createJournalEntry, updateJournalEntry, deleteJournalEntry,
  loadSimpangSample, clearSimpang,
} from "../api";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Trash2, Route, Users, Eye, EyeOff, Sparkles, AlertTriangle } from "lucide-react";

/* The Simpang panel.
 *
 * The hard part of this feature is not the map, it is marking which sentence
 * contradicts which. That is done with keys: give two sentences the same key,
 * and if they say different things the server flags them and the Overlay page
 * brackets them in red. Marking a contradiction is just typing the same word
 * twice.
 */

const VARIANTS = ["orange", "paper", "blue", "forest", "night", "crimson", "sand", "mint", "slate"];
const EMPTY_CHAR = { name: "", role: "", variant: "orange", t_start: 1, t_end: 12 };
const EMPTY_MOMENT = { label: "", place: "", t: 1, date_label: "", character_ids: [], note: "", above: true, hidden: false };

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1">
    <span className="font-mono-ui text-[8.5px] tracking-[0.16em] uppercase text-neutral-400">{label}</span>
    {children}
  </label>
);

const SimpangPanel = () => {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newChar, setNewChar] = useState(EMPTY_CHAR);
  const [newMoment, setNewMoment] = useState(EMPTY_MOMENT);
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({}); // entry_id -> { body, claims }

  const load = useCallback(async () => {
    try {
      setData(await getSimpangStudio());
    } catch {
      toast.error("Failed to load Simpang");
      setData({ characters: [], moments: [], entries: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const characters = useMemo(() => data?.characters || [], [data]);
  const moments = data?.moments || [];
  const entries = data?.entries || [];
  const byId = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      await load();
      if (okMsg) toast.success(okMsg);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const addCharacter = () => {
    if (!newChar.name.trim()) { toast.error("Give the character a name"); return; }
    if (newChar.t_end <= newChar.t_start) { toast.error("The last beat has to come after the first"); return; }
    run(async () => { await createCharacter(newChar); setNewChar(EMPTY_CHAR); }, "Character added");
  };

  const addMoment = () => {
    if (!newMoment.label.trim()) { toast.error("Give the crossing a name"); return; }
    if (newMoment.character_ids.length < 2) { toast.error("A crossing needs at least two people"); return; }
    run(async () => {
      const m = await createMoment(newMoment);
      setNewMoment(EMPTY_MOMENT);
      setOpenId(m.id);
    }, "Crossing added");
  };

  // One entry per character per junction; the button creates it if missing.
  const entryFor = (charId) => entries.find((e) => e.moment_id === openId && e.character_id === charId);

  const draftOf = (entry) => drafts[entry.id] || { body: entry.body, claims: entry.claims || [] };
  const setDraft = (entry, patch) =>
    setDrafts((d) => ({ ...d, [entry.id]: { ...draftOf(entry), ...patch } }));

  const saveEntry = (entry) =>
    run(async () => {
      const d = draftOf(entry);
      await updateJournalEntry(entry.id, {
        body: d.body,
        claims: d.claims.filter((c) => c.key.trim() && c.text.trim()),
      });
      setDrafts((x) => { const n = { ...x }; delete n[entry.id]; return n; });
    }, "Entry saved");

  if (data === null) {
    return (
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
        <p className="py-6 text-center font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">loading simpang…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4" data-testid="simpang-panel">
      <div className="flex items-center gap-2 mb-1">
        <Route size={13} className="text-[#f94b0c]" />
        <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Simpang — journals that cross</p>
        <span className="font-mono-ui text-[9px] text-neutral-400 ml-auto">
          {characters.length} {characters.length === 1 ? "person" : "people"} · {moments.length} {moments.length === 1 ? "crossing" : "crossings"}
        </span>
      </div>
      <p className="text-[10.5px] text-neutral-400 leading-snug mb-3">
        Give two sentences the <b>same key</b>. If they say different things, both are flagged as a contradiction on the Overlay page.
      </p>

      {characters.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 p-4 mb-3 text-center">
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mb-2.5">
            Nothing here yet. Load the sample to see how it works — five characters, five crossings, two contradictions.
          </p>
          <Button size="sm" variant="outline" disabled={busy} data-testid="simpang-load-sample"
            onClick={() => run(loadSimpangSample, "Sample loaded")} className="rounded-full text-[12px] gap-1.5">
            <Sparkles size={12} /> Load sample
          </Button>
        </div>
      )}

      {/* ---- karakter ---- */}
      <div className="flex items-center gap-1.5 mb-2">
        <Users size={12} className="text-neutral-400" />
        <p className="font-mono-ui text-[8.5px] tracking-[0.18em] uppercase text-neutral-400">Characters</p>
      </div>
      <div className="space-y-1.5 mb-3">
        {characters.map((c) => (
          <div key={c.id} data-testid={`simpang-char-row-${c.id}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <span className={`ink-${c.variant} w-3 h-3 rounded-full shrink-0`} style={{ background: "var(--ink-c)" }} />
            <span className="text-[13px] text-neutral-800 dark:text-neutral-200 font-medium">{c.name}</span>
            <span className="font-mono-ui text-[8.5px] tracking-[0.14em] uppercase text-neutral-400 truncate">{c.role}</span>
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
              <Input type="number" value={c.t_start} aria-label={`First beat for ${c.name}`}
                onChange={(e) => run(() => updateCharacter(c.id, { t_start: Number(e.target.value) || 1 }))}
                className="h-7 w-14 rounded-lg text-[11px] font-mono-ui" />
              <span className="text-neutral-300 text-[11px]">→</span>
              <Input type="number" value={c.t_end} aria-label={`Last beat for ${c.name}`}
                onChange={(e) => run(() => updateCharacter(c.id, { t_end: Number(e.target.value) || 1 }))}
                className="h-7 w-14 rounded-lg text-[11px] font-mono-ui" />
              <button data-testid={`simpang-delete-char-${c.id}`} disabled={busy}
                onClick={() => run(() => deleteCharacter(c.id), "Character removed")}
                title="Remove the character and their journals"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                <Trash2 size={13} />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <Field label="Name">
          <Input value={newChar.name} onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
            data-testid="simpang-new-char-name" placeholder="Ratri" className="h-8 rounded-lg text-[12px]" />
        </Field>
        <Field label="Role">
          <Input value={newChar.role} onChange={(e) => setNewChar({ ...newChar, role: e.target.value })}
            placeholder="Ticket clerk" className="h-8 rounded-lg text-[12px]" />
        </Field>
        <Field label="Ink">
          <Select value={newChar.variant} onValueChange={(v) => setNewChar({ ...newChar, variant: v })}>
            <SelectTrigger className="h-8 rounded-lg text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VARIANTS.map((v) => (
                <SelectItem key={v} value={v} className="text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className={`ink-${v} w-2.5 h-2.5 rounded-full`} style={{ background: "var(--ink-c)" }} />
                    {v}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Beats">
          <span className="flex items-center gap-1">
            <Input type="number" value={newChar.t_start} onChange={(e) => setNewChar({ ...newChar, t_start: Number(e.target.value) || 1 })}
              className="h-8 rounded-lg text-[12px] font-mono-ui" />
            <Input type="number" value={newChar.t_end} onChange={(e) => setNewChar({ ...newChar, t_end: Number(e.target.value) || 1 })}
              className="h-8 rounded-lg text-[12px] font-mono-ui" />
          </span>
        </Field>
        <div className="flex items-end">
          <Button size="sm" disabled={busy} onClick={addCharacter} data-testid="simpang-add-char"
            className="rounded-full w-full h-8 text-[12px] gap-1"><Plus size={12} /> Add</Button>
        </div>
      </div>

      {/* ---- simpang ---- */}
      <div className="flex items-center gap-1.5 mb-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <Route size={12} className="text-neutral-400" />
        <p className="font-mono-ui text-[8.5px] tracking-[0.18em] uppercase text-neutral-400">Crossings</p>
      </div>
      <div className="space-y-1.5 mb-3">
        {moments.map((m) => {
          const clashes = (m.clashes || []).length;
          return (
            <div key={m.id} data-testid={`simpang-moment-row-${m.id}`}
              className={`rounded-xl border ${openId === m.id ? "border-[#f94b0c]/50" : "border-neutral-100 dark:border-neutral-800"}`}>
              <div className="flex items-center gap-2.5 px-3 py-2">
                <button onClick={() => setOpenId(openId === m.id ? null : m.id)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <span className="font-mono-ui text-[10px] text-neutral-400 shrink-0">{String(m.t).padStart(2, "0")}</span>
                  <span className="text-[13px] text-neutral-800 dark:text-neutral-200 truncate">{m.label}</span>
                  {clashes > 0 && (
                    <span className="shrink-0 flex items-center gap-1 font-mono-ui text-[8px] tracking-[0.14em] uppercase text-[#a4243b] bg-[#a4243b]/10 px-1.5 py-0.5 rounded-full">
                      <AlertTriangle size={9} /> {clashes} {clashes === 1 ? "clash" : "clashes"}
                    </span>
                  )}
                </button>
                <button onClick={() => run(() => updateMoment(m.id, { hidden: !m.hidden }))} disabled={busy}
                  title={m.hidden ? "Hidden from readers" : "Visible to readers"}
                  data-testid={`simpang-hide-${m.id}`}
                  className={`p-1.5 rounded-lg transition-colors ${m.hidden ? "text-[#f94b0c]" : "text-neutral-300 hover:text-neutral-500"}`}>
                  {m.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button data-testid={`simpang-delete-moment-${m.id}`} disabled={busy}
                  onClick={() => run(() => deleteMoment(m.id), "Crossing removed")}
                  title="Remove the crossing (its entries are kept)"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>

              {openId === m.id && (
                <div className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Field label="Story date (free text)">
                      <Input defaultValue={m.date_label} placeholder="the third day, before dawn"
                        onBlur={(e) => e.target.value !== m.date_label && run(() => updateMoment(m.id, { date_label: e.target.value }))}
                        className="h-8 rounded-lg text-[12px]" />
                    </Field>
                    <Field label="Place">
                      <Input defaultValue={m.place} placeholder="The Crossing"
                        onBlur={(e) => e.target.value !== m.place && run(() => updateMoment(m.id, { place: e.target.value }))}
                        className="h-8 rounded-lg text-[12px]" />
                    </Field>
                  </div>
                  <Field label="Editor's note (shown under the red bracket)">
                    <Textarea defaultValue={m.note} rows={2} placeholder="One of these memories was assembled later…"
                      onBlur={(e) => e.target.value !== m.note && run(() => updateMoment(m.id, { note: e.target.value }))}
                      className="rounded-lg text-[12px]" />
                  </Field>

                  <div>
                    <p className="font-mono-ui text-[8.5px] tracking-[0.16em] uppercase text-neutral-400 mb-1.5">Who is here</p>
                    <div className="flex flex-wrap gap-1.5">
                      {characters.map((c) => {
                        const on = m.character_ids.includes(c.id);
                        return (
                          <button key={c.id} disabled={busy}
                            onClick={() => run(() => updateMoment(m.id, {
                              character_ids: on ? m.character_ids.filter((x) => x !== c.id) : [...m.character_ids, c.id],
                            }))}
                            className={`h-7 px-2.5 rounded-full border text-[11px] flex items-center gap-1.5 transition-colors ${
                              on ? "border-neutral-800 dark:border-neutral-200 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                                 : "border-neutral-200 dark:border-neutral-700 text-neutral-500"}`}>
                            <span className={`ink-${c.variant} w-2 h-2 rounded-full`} style={{ background: "var(--ink-c)" }} />
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* jurnal tiap orang di simpang ini */}
                  {m.character_ids.map((cid) => {
                    const c = byId[cid];
                    if (!c) return null;
                    const entry = entryFor(cid);
                    if (!entry) {
                      return (
                        <div key={cid} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                          <span className={`ink-${c.variant} w-2.5 h-2.5 rounded-full`} style={{ background: "var(--ink-c)" }} />
                          <span className="text-[12px] text-neutral-500">{c.name} hasn’t written anything here.</span>
                          <Button size="sm" variant="outline" disabled={busy} className="ml-auto rounded-full h-7 text-[11px] gap-1"
                            data-testid={`simpang-add-entry-${cid}`}
                            onClick={() => run(() => createJournalEntry({
                              character_id: cid, moment_id: m.id, t: m.t,
                              date_label: m.date_label, place: m.place, title: m.label, body: "", claims: [],
                            }), "Journal started")}>
                            <Plus size={11} /> Write
                          </Button>
                        </div>
                      );
                    }
                    const d = draftOf(entry);
                    const dirty = !!drafts[entry.id];
                    return (
                      <div key={cid} data-testid={`simpang-entry-${entry.id}`}
                        className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`ink-${c.variant} w-2.5 h-2.5 rounded-full`} style={{ background: "var(--ink-c)" }} />
                          <span className="font-cover text-[11px] tracking-[0.08em] text-neutral-800 dark:text-neutral-200">{c.name.toUpperCase()}</span>
                          <button disabled={busy} onClick={() => run(() => deleteJournalEntry(entry.id), "Journal removed")}
                            className="ml-auto p-1 rounded-lg text-neutral-400 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <Textarea value={d.body} rows={4} placeholder="What they wrote down about this moment…"
                          onChange={(e) => setDraft(entry, { body: e.target.value })}
                          className="rounded-lg text-[12.5px] leading-relaxed" />

                        <div className="space-y-1.5">
                          <p className="font-mono-ui text-[8px] tracking-[0.16em] uppercase text-neutral-400">
                            Keyed sentences — same key, different text, is a contradiction
                          </p>
                          {d.claims.map((claim, i) => (
                            <div key={i} className="grid grid-cols-[100px_1fr_28px] gap-1.5 items-center">
                              <Input value={claim.key} placeholder="weather"
                                onChange={(e) => {
                                  const claims = d.claims.map((x, j) => (j === i ? { ...x, key: e.target.value } : x));
                                  setDraft(entry, { claims });
                                }}
                                className="h-7 rounded-lg text-[11px] font-mono-ui" />
                              <Input value={claim.text} placeholder="That afternoon was dry."
                                onChange={(e) => {
                                  const claims = d.claims.map((x, j) => (j === i ? { ...x, text: e.target.value } : x));
                                  setDraft(entry, { claims });
                                }}
                                className="h-7 rounded-lg text-[11px]" />
                              <button onClick={() => setDraft(entry, { claims: d.claims.filter((_, j) => j !== i) })}
                                className="p-1 rounded-lg text-neutral-400 hover:text-red-500 transition-colors">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="rounded-full h-7 text-[11px] gap-1"
                              onClick={() => setDraft(entry, { claims: [...d.claims, { key: "", text: "" }] })}>
                              <Plus size={11} /> Keyed sentence
                            </Button>
                            <Button size="sm" disabled={busy || !dirty} onClick={() => saveEntry(entry)}
                              data-testid={`simpang-save-entry-${entry.id}`}
                              className="rounded-full h-7 text-[11px] ml-auto">
                              {dirty ? "Save" : "Saved"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-[1fr_1fr_80px_auto] gap-2 items-end">
        <Field label="Crossing">
          <Input value={newMoment.label} onChange={(e) => setNewMoment({ ...newMoment, label: e.target.value })}
            data-testid="simpang-new-moment-label" placeholder="Rain in the Ninth Year" className="h-8 rounded-lg text-[12px]" />
        </Field>
        <Field label="Tempat">
          <Input value={newMoment.place} onChange={(e) => setNewMoment({ ...newMoment, place: e.target.value })}
            placeholder="Simpang Jalan" className="h-8 rounded-lg text-[12px]" />
        </Field>
        <Field label="Ketukan">
          <Input type="number" value={newMoment.t} onChange={(e) => setNewMoment({ ...newMoment, t: Number(e.target.value) || 1 })}
            className="h-8 rounded-lg text-[12px] font-mono-ui" />
        </Field>
        <Button size="sm" disabled={busy} onClick={addMoment} data-testid="simpang-add-moment"
          className="rounded-full h-8 text-[12px] gap-1"><Plus size={12} /> Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="font-mono-ui text-[8.5px] tracking-[0.16em] uppercase text-neutral-400 self-center mr-1">Who is in it</span>
        {characters.map((c) => {
          const on = newMoment.character_ids.includes(c.id);
          return (
            <button key={c.id}
              onClick={() => setNewMoment({
                ...newMoment,
                character_ids: on ? newMoment.character_ids.filter((x) => x !== c.id) : [...newMoment.character_ids, c.id],
              })}
              className={`h-7 px-2.5 rounded-full border text-[11px] flex items-center gap-1.5 transition-colors ${
                on ? "border-neutral-800 dark:border-neutral-200 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                   : "border-neutral-200 dark:border-neutral-700 text-neutral-500"}`}>
              <span className={`ink-${c.variant} w-2 h-2 rounded-full`} style={{ background: "var(--ink-c)" }} />
              {c.name}
            </button>
          );
        })}
      </div>

      {characters.length > 0 && (
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-[10.5px] text-neutral-400 leading-snug">
            A hidden crossing never reaches readers — and neither do the entries attached to it.
          </p>
          <Button size="sm" variant="outline" disabled={busy} data-testid="simpang-clear"
            onClick={() => {
              if (!window.confirm("Remove every character, crossing and journal? Notebooks and entries are left alone.")) return;
              run(clearSimpang, "Simpang cleared");
            }}
            className="rounded-full text-[12px] gap-1.5 shrink-0 text-red-600 hover:text-red-700">
            <Trash2 size={12} /> Clear
          </Button>
        </div>
      )}
    </div>
  );
};

export default SimpangPanel;
