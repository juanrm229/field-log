import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import NotebookCover from "../components/NotebookCover";
import {
  getNotebookFullStudio, createNotebook, updateNotebook, deleteNotebook,
  createEntry, updateEntry, deleteEntry,
  studioAuth, setStudioKey, hasStudioKey, clearStudioKey,
  getIdeas, deleteIdea,
  getAllNotes, approveNote, deleteNote,
  getNowWriting, updateNowWriting,
  getSubscribers, deleteSubscriber, sendNotify,
  getMusic, uploadMusic, deleteMusic,
} from "../api";
import { useNotebooks } from "../context/NotebooksContext";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Plus, Trash2, Pencil, BookMarked, GripVertical, KeyRound, LogOut, Lightbulb, StickyNote, Check, PenLine, Mail, Send, Music, Upload } from "lucide-react";

const VARIANTS = [
  { value: "orange", color: "#f94b0c" },
  { value: "paper", color: "#e8e6de" },
  { value: "blue", color: "#3b66a8" },
  { value: "forest", color: "#2f5d43" },
  { value: "night", color: "#1c2233" },
  { value: "crimson", color: "#a4243b" },
  { value: "sand", color: "#dcc29a" },
  { value: "mint", color: "#b9d6c6" },
  { value: "slate", color: "#465260" },
];

const EMPTY_ENTRY = { type: "piece", category: "", title: "", date: "", meta: "", body: "", chapters: [], draft: false };

// ---- password gate (owner only) ----
const StudioGate = ({ onUnlock }) => {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || checking) return;
    setChecking(true);
    try {
      await studioAuth(password);
      setStudioKey(password);
      onUnlock();
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Wrong password");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className={`w-full max-w-[320px] rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg p-6 text-center ${shake ? "gate-shake" : ""}`}>
        <div className="mx-auto w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
          <KeyRound size={16} className="text-neutral-500" />
        </div>
        <p className="font-cover text-[15px] text-neutral-900 dark:text-neutral-100 mb-1">Owner's desk</p>
        <p className="font-mono-ui text-[9px] tracking-[0.18em] uppercase text-neutral-400 mb-4">This notebook drawer is locked</p>
        <Input
          data-testid="studio-password-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="h-10 rounded-xl text-center text-[14px] tracking-widest"
        />
        <Button data-testid="studio-unlock-btn" type="submit" disabled={checking} className="rounded-full h-9 w-full mt-3 text-[12px]">
          {checking ? "Checking…" : "Unlock studio"}
        </Button>
      </form>
    </main>
  );
};

const Studio = () => {
  const { notebooks, refresh } = useNotebooks();
  const [unlocked, setUnlocked] = useState(hasStudioKey());
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [full, setFull] = useState(null);
  const [coverForm, setCoverForm] = useState(null);
  const [entryDialog, setEntryDialog] = useState(null); // {mode:'new'|'edit', data}
  const [ideas, setIdeas] = useState([]);
  const [wallNotes, setWallNotes] = useState([]);
  const [now, setNow] = useState(null);
  const [subs, setSubs] = useState([]);
  const [notify, setNotify] = useState({ subject: "", message: "", link: "" });
  const [sendingMail, setSendingMail] = useState(false);
  const [music, setMusic] = useState({ exists: false, filename: "" });
  const [uploadingMusic, setUploadingMusic] = useState(false);

  useEffect(() => {
    if (unlocked) {
      getIdeas().then(setIdeas).catch(() => setIdeas([]));
      getAllNotes().then(setWallNotes).catch(() => setWallNotes([]));
      getNowWriting().then(setNow).catch(() => setNow(null));
      getSubscribers().then(setSubs).catch(() => setSubs([]));
      getMusic().then(setMusic).catch(() => {});
    }
  }, [unlocked]);

  const handleMusicUpload = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f || uploadingMusic) return;
    if (f.size > 20 * 1024 * 1024) { toast.error("Max file size is 20MB"); return; }
    setUploadingMusic(true);
    try {
      const res = await uploadMusic(f);
      setMusic({ exists: true, filename: res.filename });
      toast.success("Music uploaded — it now plays across the site");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleDeleteMusic = async () => {
    try {
      await deleteMusic();
      setMusic({ exists: false, filename: "" });
      toast.success("Music removed");
    } catch { toast.error("Failed to remove music"); }
  };

  const handleDeleteSub = async (id) => {
    try {
      await deleteSubscriber(id);
      setSubs((prev) => prev.filter((s) => s.id !== id));
      toast.success("Subscriber removed");
    } catch { toast.error("Failed to remove"); }
  };

  const handleSendNotify = async () => {
    if (!notify.subject.trim() || !notify.message.trim() || sendingMail) return;
    setSendingMail(true);
    try {
      const res = await sendNotify(notify);
      if (res.failed && res.failed.length > 0) {
        toast.warning(`Sent ${res.sent}/${res.total} — ${res.failed.length} failed. Resend testing mode only delivers to your verified email until you verify a domain.`);
      } else {
        toast.success(`Letter sent to ${res.sent} reader${res.sent === 1 ? "" : "s"}`);
      }
      setNotify({ subject: "", message: "", link: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send the letter");
    } finally {
      setSendingMail(false);
    }
  };

  const handleApproveNote = async (id) => {
    try {
      await approveNote(id);
      setWallNotes((prev) => prev.map((n) => (n.id === id ? { ...n, approved: true } : n)));
      toast.success("Note approved");
    } catch { toast.error("Failed to approve"); }
  };

  const handleDeleteNote = async (id) => {
    try {
      await deleteNote(id);
      setWallNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note removed");
    } catch { toast.error("Failed to remove"); }
  };

  const handleSaveNow = async () => {
    try {
      const saved = await updateNowWriting({
        title: now.title || "",
        goal_words: parseInt(now.goal_words, 10) || 0,
        current_words: parseInt(now.current_words, 10) || 0,
        note: now.note || "",
        active: !!now.active,
      });
      setNow(saved);
      toast.success("Now Writing updated");
    } catch { toast.error("Failed to save"); }
  };

  const handleDeleteIdea = async (id) => {
    try {
      await deleteIdea(id);
      setIdeas((prev) => prev.filter((i) => i.id !== id));
      toast.success("Idea removed");
    } catch {
      toast.error("Failed to remove idea");
    }
  };

  const selected = notebooks.find((n) => n.slug === selectedSlug) || notebooks[0];

  useEffect(() => {
    if (!selected) return;
    setCoverForm({
      label: selected.label,
      cover_title: selected.cover_title,
      sub1: selected.subtitle[0] || "",
      sub2: selected.subtitle[1] || "",
      variant: selected.variant,
    });
    getNotebookFullStudio(selected.slug).then(setFull).catch(() => setFull(null));
  }, [selected]);

  const loadEntries = async () => {
    if (selected) {
      const data = await getNotebookFullStudio(selected.slug);
      setFull(data);
    }
  };

  const handleNewNotebook = async () => {
    try {
      const nb = await createNotebook({
        label: "New notebook",
        cover_title: "FIELD LOG",
        subtitle: ["Graph Paper Memo Book", "Custom / Written in Indonesia"],
        variant: "forest",
      });
      await refresh();
      setSelectedSlug(nb.slug);
      toast.success("Notebook created");
    } catch {
      toast.error("Failed to create notebook");
    }
  };

  const handleSaveCover = async () => {
    try {
      await updateNotebook(selected.id, {
        label: coverForm.label,
        cover_title: coverForm.cover_title,
        subtitle: [coverForm.sub1, coverForm.sub2].filter(Boolean),
        variant: coverForm.variant,
      });
      await refresh();
      toast.success("Cover saved");
    } catch {
      toast.error("Failed to save cover");
    }
  };

  const handleDeleteNotebook = async () => {
    if (!window.confirm(`Delete "${selected.label}" and all its contents?`)) return;
    try {
      await deleteNotebook(selected.id);
      await refresh();
      setSelectedSlug(null);
      toast.success("Notebook deleted");
    } catch {
      toast.error("Failed to delete notebook");
    }
  };

  const handleSaveEntry = async () => {
    const d = entryDialog.data;
    const payload = {
      type: d.type, category: d.category, title: d.title, date: d.date,
      meta: d.meta, body: d.body, chapters: d.chapters, draft: !!d.draft,
    };
    try {
      if (entryDialog.mode === "new") {
        await createEntry({ ...payload, notebook_id: selected.id });
        toast.success("Entry added");
      } else {
        await updateEntry(d.id, payload);
        toast.success("Entry saved");
      }
      setEntryDialog(null);
      await loadEntries();
    } catch {
      toast.error("Failed to save entry");
    }
  };

  const handleDeleteEntry = async (e) => {
    if (!window.confirm(`Delete "${e.title}"?`)) return;
    try {
      await deleteEntry(e.id);
      await loadEntries();
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const setEntryField = (field, value) =>
    setEntryDialog((prev) => ({ ...prev, data: { ...prev.data, [field]: value } }));

  const setChapter = (i, field, value) =>
    setEntryDialog((prev) => {
      const chapters = [...prev.data.chapters];
      chapters[i] = { ...chapters[i], [field]: value };
      return { ...prev, data: { ...prev.data, chapters } };
    });

  if (!unlocked) {
    return <StudioGate onUnlock={() => setUnlocked(true)} />;
  }

  if (!selected || !coverForm) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">loading studio…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-16 px-4 sm:px-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cover text-xl text-neutral-900 dark:text-neutral-100">Studio</h1>
          <p className="font-mono-ui text-[10px] tracking-[0.18em] uppercase text-neutral-400 mt-1">Manage your notebooks & writings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button data-testid="new-notebook-btn" onClick={handleNewNotebook} className="rounded-full h-9 gap-1.5 text-[12px]">
            <Plus size={14} /> New notebook
          </Button>
          <Button
            data-testid="studio-lock-btn"
            variant="outline"
            onClick={() => { clearStudioKey(); setUnlocked(false); }}
            className="rounded-full h-9 w-9 p-0"
            aria-label="Lock studio"
          >
            <LogOut size={13} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* left : notebooks + cover editor */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-3">
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400 px-2 pb-2">Notebooks</p>
            {notebooks.map((nb) => (
              <button
                key={nb.id}
                data-testid={`studio-nb-${nb.slug}`}
                onClick={() => setSelectedSlug(nb.slug)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] transition-colors ${
                  nb.id === selected.id ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: (VARIANTS.find((v) => v.value === nb.variant) || VARIANTS[0]).color }} />
                <span className="truncate">{nb.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Cover editor</p>
            <div className="w-[140px] mx-auto">
              <NotebookCover
                variant={coverForm.variant}
                label={coverForm.label}
                coverTitle={coverForm.cover_title}
                subtitle={[coverForm.sub1, coverForm.sub2].filter(Boolean)}
              />
            </div>
            <Input data-testid="cover-label-input" value={coverForm.label} onChange={(e) => setCoverForm({ ...coverForm, label: e.target.value })} placeholder="Label (handwritten)" className="h-9 text-[13px] rounded-xl" />
            <Input data-testid="cover-title-input" value={coverForm.cover_title} onChange={(e) => setCoverForm({ ...coverForm, cover_title: e.target.value })} placeholder="Cover title" className="h-9 text-[13px] rounded-xl" />
            <Input value={coverForm.sub1} onChange={(e) => setCoverForm({ ...coverForm, sub1: e.target.value })} placeholder="Subtitle line 1" className="h-9 text-[13px] rounded-xl" />
            <Input value={coverForm.sub2} onChange={(e) => setCoverForm({ ...coverForm, sub2: e.target.value })} placeholder="Subtitle line 2" className="h-9 text-[13px] rounded-xl" />
            <div className="flex items-center gap-2 flex-wrap">
              {VARIANTS.map((v) => (
                <button
                  key={v.value}
                  data-testid={`variant-${v.value}`}
                  onClick={() => setCoverForm({ ...coverForm, variant: v.value })}
                  aria-label={v.value}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${coverForm.variant === v.value ? "border-neutral-900 dark:border-white scale-110" : "border-transparent"}`}
                  style={{ background: v.color }}
                />
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button data-testid="save-cover-btn" onClick={handleSaveCover} className="rounded-full h-8 text-[12px] flex-1">Save cover</Button>
              <Button data-testid="delete-notebook-btn" onClick={handleDeleteNotebook} variant="outline" className="rounded-full h-8 w-8 p-0 text-red-500 hover:text-red-600">
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        </div>

        {/* right : entries */}
        <div className="space-y-6">
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Contents of “{selected.label}”</p>
            <Button data-testid="new-entry-btn" onClick={() => setEntryDialog({ mode: "new", data: { ...EMPTY_ENTRY } })} variant="outline" className="rounded-full h-8 gap-1.5 text-[12px]">
              <Plus size={13} /> New entry
            </Button>
          </div>
          {!full || full.entries.length === 0 ? (
            <div className="py-12 text-center">
              <BookMarked size={22} className="mx-auto text-neutral-300 mb-2" />
              <p className="text-[13px] text-neutral-400">No entries yet. Add your first page.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {full.entries.map((e) => (
                <div key={e.id} data-testid={`entry-row-${e.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors group">
                  <GripVertical size={13} className="text-neutral-300 shrink-0" />
                  <span className="font-mono-ui text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0">
                    {e.type === "piece" ? e.category || "piece" : e.type}
                  </span>
                  <span className="text-[13px] text-neutral-800 dark:text-neutral-200 truncate flex-1">{e.title}</span>
                  {e.draft && (
                    <span data-testid={`draft-badge-${e.id}`} className="font-mono-ui text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded-sm bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 shrink-0">draft</span>
                  )}
                  {e.chapters && e.chapters.length > 0 && (
                    <span className="font-mono-ui text-[9px] text-neutral-400 shrink-0">{e.chapters.length} ch</span>
                  )}
                  <button data-testid={`edit-entry-${e.id}`} onClick={() => setEntryDialog({ mode: "edit", data: { ...e, chapters: e.chapters || [], draft: !!e.draft } })} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button data-testid={`delete-entry-${e.id}`} onClick={() => handleDeleteEntry(e)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* story ideas from readers */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4" data-testid="ideas-panel">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={13} className="text-[#f94b0c]" />
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Story ideas from readers</p>
            <span className="font-mono-ui text-[9px] text-neutral-400 ml-auto">{ideas.length}</span>
          </div>
          {ideas.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-neutral-400">No ideas dropped in the box yet.</p>
          ) : (
            <div className="space-y-1.5">
              {ideas.map((i) => (
                <div key={i.id} data-testid={`idea-row-${i.id}`} className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <Lightbulb size={13} className="text-neutral-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-neutral-800 dark:text-neutral-200 leading-snug">{i.idea}</p>
                    <p className="font-mono-ui text-[8.5px] tracking-[0.14em] uppercase text-neutral-400 mt-1">
                      {i.name || "anonymous"} · {new Date(i.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button data-testid={`delete-idea-${i.id}`} onClick={() => handleDeleteIdea(i.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* wall moderation */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4" data-testid="wall-moderation-panel">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote size={13} className="text-[#f94b0c]" />
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Wall notes (moderation)</p>
            <span className="font-mono-ui text-[9px] text-neutral-400 ml-auto">{wallNotes.filter((n) => !n.approved).length} pending</span>
          </div>
          {wallNotes.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-neutral-400">No notes on the wall yet.</p>
          ) : (
            <div className="space-y-1.5">
              {wallNotes.map((n) => (
                <div key={n.id} data-testid={`mod-note-${n.id}`} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${n.approved ? "border-neutral-100 dark:border-neutral-800" : "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-neutral-800 dark:text-neutral-200 leading-snug">{n.message}</p>
                    <p className="font-mono-ui text-[8.5px] tracking-[0.14em] uppercase text-neutral-400 mt-1">
                      {n.name || "anonymous"} · {n.approved ? "live" : "pending"}
                    </p>
                  </div>
                  {!n.approved && (
                    <button data-testid={`approve-note-${n.id}`} onClick={() => handleApproveNote(n.id)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors shrink-0" aria-label="Approve">
                      <Check size={14} />
                    </button>
                  )}
                  <button data-testid={`del-note-${n.id}`} onClick={() => handleDeleteNote(n.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0" aria-label="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* now writing editor */}
        {now && (
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4" data-testid="now-writing-panel">
            <div className="flex items-center gap-2 mb-3">
              <PenLine size={13} className="text-[#f94b0c]" />
              <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Now Writing</p>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-neutral-400">Show publicly</span>
                <Switch data-testid="now-active-switch" checked={!!now.active} onCheckedChange={(v) => setNow({ ...now, active: v })} />
              </div>
            </div>
            <div className="space-y-3">
              <Input data-testid="now-title-input" value={now.title || ""} onChange={(e) => setNow({ ...now, title: e.target.value })} placeholder="Manuscript title" className="h-9 rounded-xl text-[13px]" />
              <div className="grid grid-cols-2 gap-3">
                <Input data-testid="now-current-input" type="number" value={now.current_words ?? 0} onChange={(e) => setNow({ ...now, current_words: e.target.value })} placeholder="Current words" className="h-9 rounded-xl text-[13px]" />
                <Input data-testid="now-goal-input" type="number" value={now.goal_words ?? 0} onChange={(e) => setNow({ ...now, goal_words: e.target.value })} placeholder="Goal words" className="h-9 rounded-xl text-[13px]" />
              </div>
              <Textarea data-testid="now-note-input" value={now.note || ""} onChange={(e) => setNow({ ...now, note: e.target.value })} placeholder="A handwritten note about the process…" className="rounded-xl text-[13px] min-h-[70px]" />
              <div className="flex justify-end">
                <Button data-testid="now-save-btn" onClick={handleSaveNow} className="rounded-full h-8 text-[12px]">Save progress</Button>
              </div>
            </div>
          </div>
        )}

        {/* reader mail list + notify */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4" data-testid="subscribers-panel">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={13} className="text-[#f94b0c]" />
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Reader mail list</p>
            <span className="font-mono-ui text-[9px] text-neutral-400 ml-auto">{subs.length}</span>
          </div>
          {subs.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-neutral-400">No readers on the list yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {subs.map((s) => (
                <div key={s.id} data-testid={`sub-row-${s.id}`} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[13px] text-neutral-800 dark:text-neutral-200 truncate flex-1">{s.email}</span>
                  <span className="font-mono-ui text-[8.5px] tracking-[0.12em] uppercase text-neutral-400 shrink-0">{new Date(s.created_at).toLocaleDateString()}</span>
                  <button data-testid={`del-sub-${s.id}`} onClick={() => handleDeleteSub(s.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0" aria-label="Remove subscriber">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Send a letter to everyone</p>
            <Input data-testid="notify-subject-input" value={notify.subject} onChange={(e) => setNotify({ ...notify, subject: e.target.value })} placeholder="Subject — e.g. A new piece just landed" className="h-9 rounded-xl text-[13px]" />
            <Textarea data-testid="notify-message-input" value={notify.message} onChange={(e) => setNotify({ ...notify, message: e.target.value })} placeholder="A short letter about what you just published…" className="rounded-xl text-[13px] min-h-[80px]" />
            <Input data-testid="notify-link-input" value={notify.link} onChange={(e) => setNotify({ ...notify, link: e.target.value })} placeholder="Link to the piece (optional)" className="h-9 rounded-xl text-[13px]" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10.5px] text-neutral-400 leading-snug">Resend testing mode: letters only reach your own verified email until you verify a domain at resend.com.</p>
              <Button data-testid="notify-send-btn" onClick={handleSendNotify} disabled={sendingMail || subs.length === 0 || !notify.subject.trim() || !notify.message.trim()} className="rounded-full h-9 gap-1.5 text-[12px] shrink-0">
                <Send size={12} /> {sendingMail ? "Sending…" : `Send to ${subs.length}`}
              </Button>
            </div>
          </div>
        </div>

        {/* background music */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4" data-testid="music-panel">
          <div className="flex items-center gap-2 mb-3">
            <Music size={13} className="text-[#f94b0c]" />
            <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Background music</p>
          </div>
          {music.exists ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <Music size={13} className="text-neutral-400 shrink-0" />
              <span data-testid="music-filename" className="text-[13px] text-neutral-800 dark:text-neutral-200 truncate flex-1">{music.filename || "background track"}</span>
              <span className="font-mono-ui text-[8.5px] tracking-[0.12em] uppercase text-emerald-600 shrink-0">playing site-wide</span>
              <button data-testid="delete-music-btn" onClick={handleDeleteMusic} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0" aria-label="Remove music">
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <p className="py-4 text-center text-[13px] text-neutral-400">No music yet. Upload a track to play softly across the whole site.</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10.5px] text-neutral-400 leading-snug">mp3 / m4a / ogg, max 20MB. Loops quietly; visitors get a mute toggle at the bottom-left.</p>
            <label className="shrink-0">
              <input data-testid="music-file-input" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" className="hidden" onChange={handleMusicUpload} disabled={uploadingMusic} />
              <span className={`pill-dark h-9 px-4 gap-1.5 text-[12px] cursor-pointer ${uploadingMusic ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload size={12} /> {uploadingMusic ? "Uploading…" : music.exists ? "Replace" : "Upload music"}
              </span>
            </label>
          </div>
        </div>
        </div>
      </div>

      {/* entry editor dialog */}
      <Dialog open={!!entryDialog} onOpenChange={(open) => !open && setEntryDialog(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          {entryDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="font-cover text-base">
                  {entryDialog.mode === "new" ? "New entry" : "Edit entry"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select value={entryDialog.data.type} onValueChange={(v) => setEntryField("type", v)}>
                    <SelectTrigger data-testid="entry-type-select" className="h-9 rounded-xl text-[13px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="piece">Piece (writing)</SelectItem>
                      <SelectItem value="about">About page</SelectItem>
                      <SelectItem value="kind">Kind word (testimonial)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input data-testid="entry-category-input" value={entryDialog.data.category} onChange={(e) => setEntryField("category", e.target.value)} placeholder="Category (Novel, Poetry…)" className="h-9 rounded-xl text-[13px]" />
                </div>
                <Input data-testid="entry-title-input" value={entryDialog.data.title} onChange={(e) => setEntryField("title", e.target.value)} placeholder={entryDialog.data.type === "kind" ? "Name" : "Title"} className="h-9 rounded-xl text-[13px]" />
                <div className="grid grid-cols-2 gap-3">
                  <Input value={entryDialog.data.date} onChange={(e) => setEntryField("date", e.target.value)} placeholder="Date (free text)" className="h-9 rounded-xl text-[13px]" />
                  <Input value={entryDialog.data.meta} onChange={(e) => setEntryField("meta", e.target.value)} placeholder={entryDialog.data.type === "kind" ? "Role" : "Meta / subheading"} className="h-9 rounded-xl text-[13px]" />
                </div>
                <Textarea data-testid="entry-body-input" value={entryDialog.data.body} onChange={(e) => setEntryField("body", e.target.value)} placeholder={entryDialog.data.type === "kind" ? "Quote" : "Body / synopsis"} className="rounded-xl text-[13px] min-h-[110px]" />

                <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
                  <div>
                    <p className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">Draft</p>
                    <p className="text-[11px] text-neutral-400">Hidden from visitors until you publish it</p>
                  </div>
                  <Switch data-testid="entry-draft-switch" checked={!!entryDialog.data.draft} onCheckedChange={(v) => setEntryField("draft", v)} />
                </div>

                {entryDialog.data.type === "piece" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-mono-ui text-[9px] tracking-[0.2em] uppercase text-neutral-400">Chapters (for novels)</p>
                      <Button variant="outline" data-testid="add-chapter-btn" onClick={() => setEntryField("chapters", [...entryDialog.data.chapters, { title: "", body: "" }])} className="rounded-full h-7 gap-1 text-[11px]">
                        <Plus size={12} /> Add chapter
                      </Button>
                    </div>
                    {entryDialog.data.chapters.map((c, i) => (
                      <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input value={c.title} onChange={(e) => setChapter(i, "title", e.target.value)} placeholder={`Chapter ${i + 1} title`} className="h-8 rounded-lg text-[12.5px]" />
                          <button onClick={() => setEntryField("chapters", entryDialog.data.chapters.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <Textarea value={c.body} onChange={(e) => setChapter(i, "body", e.target.value)} placeholder="Chapter text…" className="rounded-lg text-[12.5px] min-h-[80px]" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEntryDialog(null)} className="rounded-full h-9 text-[12px]">Cancel</Button>
                  <Button data-testid="save-entry-btn" onClick={handleSaveEntry} className="rounded-full h-9 text-[12px]">
                    {entryDialog.mode === "new" ? "Add entry" : "Save changes"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Studio;
