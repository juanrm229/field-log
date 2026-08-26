// Reading statistics helpers
export const countWords = (entry) => {
  let text = entry.body || "";
  if (entry.chapters && entry.chapters.length > 0) {
    text += " " + entry.chapters.map((c) => `${c.title} ${c.body}`).join(" ");
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
};

export const readingStats = (entry) => {
  const words = countWords(entry);
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes, label: `${words.toLocaleString()} words · ${minutes} min read` };
};
