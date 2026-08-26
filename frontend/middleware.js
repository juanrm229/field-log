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

export const config = { matcher: ["/read/:path*", "/notebook/:path*"] };

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
  const [, section, slug] = url.pathname.split("/");
  if (!backend || !slug) return;

  try {
    let entry = null;
    let notebook = null;

    if (section === "read") {
      const data = await fetch(`${backend}/api/read/${slug}`).then((r) => (r.ok ? r.json() : null));
      if (!data) return;
      entry = data.entry;
      notebook = data.notebook;
    } else {
      const data = await fetch(`${backend}/api/notebooks/${slug}/full`).then((r) => (r.ok ? r.json() : null));
      if (!data) return;
      notebook = data.notebook;
      // The older ?entry=<id> form still gets a proper preview: links already
      // shared in that shape should not degrade because the app moved on.
      const entryId = url.searchParams.get("entry");
      entry = entryId ? (data.entries || []).find((e) => e.id === entryId) : null;
    }

    const title = entry ? `${entry.title} — Juan Maulana` : `${notebook.label} — Juan Maulana`;

    const description = entry
      ? summarise(entry.meta || entry.body || (entry.chapters && entry.chapters[0] && entry.chapters[0].body))
      : summarise(`${notebook.label}. ${(notebook.subtitle || []).join(" · ")}`);

    // The origin's own index.html, so the app still boots for crawlers that do
    // render (Googlebot does) — only the head is rewritten.
    const html = await fetch(new URL("/index.html", url.origin)).then((r) => r.text());

    // Drawn on demand in the notebook's own colours, so a shared link looks
    // like the thing it came from instead of a stock card.
    const image = new URL("/api/og", url.origin);
    image.searchParams.set("title", entry ? entry.title : notebook.label);
    image.searchParams.set("label", notebook.label);
    image.searchParams.set("variant", notebook.variant || "orange");
    if (entry && entry.category) image.searchParams.set("category", entry.category);

    const head = `
    <title>${escapeAttr(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeAttr(url.href)}" />
    <meta property="og:image" content="${escapeAttr(image.href)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${escapeAttr(image.href)}" />`;

    const rewritten = html
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+name="description"[\s\S]*?\/>/i, "")
      .replace(/<meta\s+property="og:[\s\S]*?\/>/gi, "")
      .replace(/<meta\s+name="twitter:[\s\S]*?\/>/gi, "")
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
