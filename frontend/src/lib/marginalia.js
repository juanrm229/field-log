const KEY_PREFIX = "field_log_marginalia_v1_";

const keyFor = (entryId) => `${KEY_PREFIX}${entryId}`;

export const loadMarginalia = (entryId) => {
  if (!entryId) return [];
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(entryId)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeMarginalia = (entryId, marks) => {
  try { localStorage.setItem(keyFor(entryId), JSON.stringify(marks)); } catch { /* private mode */ }
  return marks;
};

export const addMarginalia = (entryId, draft) => {
  const marks = loadMarginalia(entryId);
  const mark = {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    quote: draft.quote.trim(),
    note: (draft.note || "").trim(),
    mood: draft.mood || "trace",
    chapter: Number.isInteger(draft.chapter) ? draft.chapter : -1,
    chapterTitle: draft.chapterTitle || "",
    createdAt: new Date().toISOString(),
  };
  return writeMarginalia(entryId, [mark, ...marks]);
};

export const removeMarginalia = (entryId, markId) =>
  writeMarginalia(entryId, loadMarginalia(entryId).filter((mark) => mark.id !== markId));

export const markAge = (createdAt) => {
  const then = new Date(createdAt).getTime();
  if (!Number.isFinite(then)) return "kept here";
  const days = Math.max(0, Math.floor((Date.now() - then) / 86400000));
  if (days === 0) return "kept just now";
  if (days === 1) return "waited here overnight";
  return `waited here ${days} days`;
};
