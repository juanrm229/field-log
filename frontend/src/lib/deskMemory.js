// A reader's desk is private and local-first. Nothing here is sent to the API:
// it merely lets the physical scene remember which books this browser touched.
const KEY = "fieldlog_desk_memory_v1";
const VISIT_KEY = "fieldlog_desk_visit_v1";

const blank = () => ({
  visits: 0,
  firstSeenAt: null,
  lastSeenAt: null,
  opened: {},
  lastNotebook: null,
  lastRead: null,
});

export const getDeskMemory = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === "object"
      ? { ...blank(), ...saved, opened: saved.opened || {} }
      : blank();
  } catch {
    return blank();
  }
};

const save = (memory) => {
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* storage may be disabled */ }
  return memory;
};

export const recordDeskVisit = () => {
  const now = Date.now();
  const memory = getDeskMemory();
  let isNewVisit = true;
  try {
    isNewVisit = sessionStorage.getItem(VISIT_KEY) !== "1";
    sessionStorage.setItem(VISIT_KEY, "1");
  } catch { /* count the visit when session storage is unavailable */ }

  return save({
    ...memory,
    visits: memory.visits + (isNewVisit ? 1 : 0),
    firstSeenAt: memory.firstSeenAt || now,
    lastSeenAt: now,
  });
};

export const rememberNotebook = (notebook) => {
  if (!notebook || !notebook.slug) return getDeskMemory();
  const now = Date.now();
  const memory = getDeskMemory();
  const previous = memory.opened[notebook.slug] || {};
  // React's development StrictMode runs effects twice. Treat two immediate
  // records of the same opening as one physical visit to the book.
  const repeated = previous.lastOpenedAt && now - previous.lastOpenedAt < 2000;
  const item = {
    slug: notebook.slug,
    label: notebook.label || notebook.slug,
    variant: notebook.variant || "paper",
    times: (previous.times || 0) + (repeated ? 0 : 1),
    lastOpenedAt: now,
  };
  return save({
    ...memory,
    opened: { ...memory.opened, [notebook.slug]: item },
    lastNotebook: item,
  });
};

export const rememberEntry = (entry, notebook) => {
  if (!entry || !notebook) return getDeskMemory();
  const memory = rememberNotebook(notebook);
  return save({
    ...memory,
    lastRead: {
      id: entry.id,
      slug: entry.slug || "",
      title: entry.title || "Untitled page",
      notebookSlug: notebook.slug,
      notebookLabel: notebook.label || notebook.slug,
      at: Date.now(),
    },
  });
};
