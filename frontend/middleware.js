import { getSEO, headTags } from './src/lib/seo.mjs';
export const config = { matcher: ['/', '/archive', '/crossing', '/wall', '/now-writing', '/studio', '/read/:path*', '/notebook/:path*'] };
// Same metadata for visitors and crawlers; no user-agent-specific response.
export default async function middleware(request) {
  const url = new URL(request.url);
  try {
    const timedFetch = (url, options = {}) => fetch(url, {...options, signal:AbortSignal.timeout(8000)});
    const meta = await getSEO(url.pathname, url.search, timedFetch);
    const source = await timedFetch(new URL('/index.html',url.origin));
    if (!source.ok) return;
    const html = (await source.text()).replace(/<title>[\s\S]*?<\/title>/gi,'')
      .replace(/<meta\s+(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/gi,'')
      .replace(/<link\s+rel="canonical"[^>]*>/gi,'').replace(/<script\s+id="seo-schema"[\s\S]*?<\/script>/gi,'')
      .replace('</head>',headTags(meta)+'</head>');
    return new Response(html,{status:meta.status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store',...(meta.noindex ? {'x-robots-tag':'noindex, nofollow'} : {})}});
  } catch { return; }
}
