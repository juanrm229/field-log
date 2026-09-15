/*
  Generated rather than committed: the notebooks and the pieces inside them
  change whenever something is written, and a sitemap checked into the repo
  would be stale the moment it was.

  Served at /sitemap.xml via the rewrite in vercel.json.
*/


const STATIC_PATHS = [
  { path: "/", priority: "1.0" },
  { path: "/archive", priority: "0.7" },
  { path: "/crossing", priority: "0.8" },
  { path: "/wall", priority: "0.5" },
  { path: "/now-writing", priority: "0.5" },
];

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default async function handler(req, res) {
  const origin = 'https://www.kodarchive.ink';
  const BACKEND = origin;
  const urls = STATIC_PATHS.map((p) => ({ loc: origin + p.path, priority: p.priority }));

  if (BACKEND) {
    try {
      const read = async (url) => {
        const r = await fetch(url, {signal:AbortSignal.timeout(8000)});
        if (!r.ok) throw new Error('Sitemap API unavailable');
        return r.json();
      };
      const notebooks = await read(`${BACKEND}/api/notebooks`);

      await Promise.all(notebooks.map(async (nb) => {
        urls.push({ loc: `${origin}/notebook/${encodeURIComponent(nb.slug)}`, priority: "0.9" });

        const full = await read(`${BACKEND}/api/notebooks/${encodeURIComponent(nb.slug)}/full`);
        for (const entry of full.entries || []) {
          if (entry.draft || entry.type !== "piece" || !entry.slug) continue;
          urls.push({ loc: `${origin}/read/${encodeURIComponent(entry.slug)}`, priority: "0.8" });
        }
      }));
    } catch (e) {
      // A sitemap listing the fixed pages is far better than a 500. The backend
      // sleeps when idle, and a crawler arriving mid-wake should not be told the
      // site is broken.
      console.error("sitemap: could not reach the API", e);
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <priority>${u.priority}</priority>\n  </url>`)
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(body);
}
