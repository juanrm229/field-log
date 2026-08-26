/*
  Generated rather than committed: the notebooks and the pieces inside them
  change whenever something is written, and a sitemap checked into the repo
  would be stale the moment it was.

  Served at /sitemap.xml via the rewrite in vercel.json.
*/

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const STATIC_PATHS = [
  { path: "/", priority: "1.0" },
  { path: "/archive", priority: "0.7" },
  { path: "/wall", priority: "0.5" },
  { path: "/now-writing", priority: "0.5" },
];

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default async function handler(req, res) {
  const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const urls = STATIC_PATHS.map((p) => ({ loc: origin + p.path, priority: p.priority }));

  if (BACKEND) {
    try {
      const notebooks = await fetch(`${BACKEND}/api/notebooks`).then((r) => r.json());

      for (const nb of notebooks) {
        urls.push({ loc: `${origin}/notebook/${nb.slug}`, priority: "0.9" });

        const full = await fetch(`${BACKEND}/api/notebooks/${nb.slug}/full`).then((r) => r.json());
        for (const entry of full.entries || []) {
          if (entry.type !== "piece" || !entry.slug) continue;
          urls.push({ loc: `${origin}/read/${entry.slug}`, priority: "0.8" });
        }
      }
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
