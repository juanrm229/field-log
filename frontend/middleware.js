/*
  Link previews for a single-page app.

  Social crawlers do not run JavaScript, so anything React writes into <head>
  arrives too late for them — every shared link previewed with the same generic
  site blurb no matter which piece it pointed at. This intercepts the crawlers
  only, fetches the piece, and hands them an index.html with the meta tags
  filled in. Real visitors are untouched and still get the static file straight
  from the CDN.

  Matched narrowly so the rest of the site pays nothing for it.
*/

export const config = { matcher: "/notebook/:path*" };

const CRAWLER = /facebookexternalhit|facebookcatalog|Twitterbot|WhatsApp|Slackbot|LinkedInBot|TelegramBot|Discordbot|Pinterest|redditbot|SkypeUriPreview|Googlebot|bingbot|Applebot|iframely|embedly/i;

const escapeAttr = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// First couple of sentences, trimmed to something a preview card will show.
const summarise = (text, limit = 180) => {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + "…");
};

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  if (!CRAWLER.test(ua)) return; // hand it back to the CDN

  const backend = process.env.REACT_APP_BACKEND_URL;
  const url = new URL(request.url);
  const slug = url.pathname.split("/")[2];
  if (!backend || !slug) return;

  try {
    const data = await fetch(`${backend}/api/notebooks/${slug}/full`).then((r) => (r.ok ? r.json() : null));
    if (!data) return;

    const entryId = url.searchParams.get("entry");
    const entry = entryId ? (data.entries || []).find((e) => e.id === entryId) : null;

    const title = entry
      ? `${entry.title} — Juan Maulana`
      : `${data.notebook.label} — Juan Maulana`;

    const description = entry
      ? summarise(entry.body || (entry.chapters && entry.chapters[0] && entry.chapters[0].body))
      : summarise(`${data.notebook.label}. ${(data.notebook.subtitle || []).join(" · ")}`);

    // The origin's own index.html, so the app still boots for crawlers that do
    // render (Googlebot does) — only the head is rewritten.
    const html = await fetch(new URL("/index.html", url.origin)).then((r) => r.text());

    const head = `
    <title>${escapeAttr(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeAttr(url.href)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />`;

    const rewritten = html
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+name="description"[\s\S]*?\/>/i, "")
      .replace(/<meta\s+property="og:[\s\S]*?\/>/gi, "")
      .replace("</head>", `${head}\n  </head>`);

    return new Response(rewritten, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    // A generic preview is a far better outcome than a broken link.
    console.error("preview middleware failed", e);
    return;
  }
}
