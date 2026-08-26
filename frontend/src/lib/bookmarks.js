// Red ribbon bookmark helpers (localStorage)
const KEY = "fieldlog_bookmarks";

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};

export const getBookmark = (slug) => load()[slug] || null;

export const saveBookmark = (slug, view) => {
  const all = load();
  if (view <= 0) delete all[slug];
  else all[slug] = { view, at: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(all));
};

export const hasBookmark = (slug) => !!load()[slug];

// reader chapter positions
export const saveReaderPos = (entryId, chapter) => {
  try { localStorage.setItem(`reader_pos_${entryId}`, String(chapter)); } catch { /* noop */ }
};
export const getReaderPos = (entryId) => {
  const v = localStorage.getItem(`reader_pos_${entryId}`);
  return v === null ? null : parseInt(v, 10);
};
export const clearReaderPos = (entryId) => localStorage.removeItem(`reader_pos_${entryId}`);
