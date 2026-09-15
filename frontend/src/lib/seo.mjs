export const ORIGIN = 'https://www.kodarchive.ink';
export const DESCRIPTION = 'Kodarchive — arsip cerita, puisi, novel, dan jurnal Juan Maulana. Jelajahi hubungan antarkarakter dan peristiwa dalam The Crossing.';
const pages = {
  '/': ['Kodarchive — Cerita, Puisi & Jurnal Juan Maulana', DESCRIPTION],
  '/archive': ['Arsip Tulisan — Kodarchive', 'Telusuri arsip cerita, puisi, dan jurnal Juan Maulana berdasarkan tahun.'],
  '/crossing': ['The Crossing — Kodarchive', 'Jelajahi jurnal lintas karakter, peristiwa yang beririsan, dan benang merah cerita dalam The Crossing.'],
  '/wall': ['The Wall — Kodarchive', 'Catatan dan pesan pembaca untuk arsip tulisan Kodarchive.'],
  '/now-writing': ['Sedang Ditulis — Kodarchive', 'Ikuti perkembangan karya dan catatan proses menulis Juan Maulana.'],
  '/studio': ['Studio — Kodarchive', 'Ruang pengelolaan pribadi Kodarchive.'],
};
export const escapeHTML = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const summary = value => String(value || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,180);
export async function getSEO(path, search = '', fetcher = fetch) {
  const page = pages[path];
  const meta = {title:page?.[0] || 'Kodarchive',description:page?.[1] || DESCRIPTION,canonical:ORIGIN+path,
    image:ORIGIN+'/api/og?title=Kodarchive&label=Cerita%20%26%20Jurnal&variant=night',type:'website',status:200,noindex:path==='/studio'};
  const match = path.match(/^\/(read|notebook)\/([^/]+)\/?$/);
  if (!page && !match) return {...meta,title:'Halaman tidak ditemukan — Kodarchive',noindex:true,status:404};
  if (match) {
    const [,section,slug] = match;
    const response = await fetcher(`${ORIGIN}/api/${section==='read' ? 'read/'+slug : 'notebooks/'+slug+'/full'}`);
    if (response.status===404) return {...meta,title:'Tulisan tidak ditemukan — Kodarchive',noindex:true,status:404};
    if (!response.ok) throw new Error('Metadata API unavailable');
    const data = await response.json();
    const entryId = new URLSearchParams(search).get('entry');
    const entry = section==='read' ? data.entry : entryId ? data.entries?.find(e=>e.id===entryId) : null;
    const notebook = data.notebook;
    meta.title = `${entry?.title || notebook.label} — Kodarchive`;
    meta.description = summary(entry ? entry.meta || entry.body || entry.chapters?.[0]?.body : `${notebook.label}. ${(notebook.subtitle || []).join(' · ')}`) || DESCRIPTION;
    meta.canonical = entry?.slug ? `${ORIGIN}/read/${encodeURIComponent(entry.slug)}` : `${ORIGIN}/notebook/${encodeURIComponent(notebook.slug)}`;
    meta.type = entry ? 'article' : 'website';
    meta.image = `${ORIGIN}/api/og?`+new URLSearchParams({title:entry?.title || notebook.label,label:notebook.label,variant:notebook.variant || 'night'});
    meta.schema = entry ? {'@context':'https://schema.org','@type':'Article',headline:entry.title,description:meta.description,author:{'@type':'Person',name:'Juan Maulana'},mainEntityOfPage:meta.canonical,image:meta.image,
      ...(entry.created_at && !Number.isNaN(Date.parse(entry.created_at)) ? {datePublished:new Date(entry.created_at).toISOString()} : {})} : {'@context':'https://schema.org','@type':'CollectionPage',name:notebook.label,url:meta.canonical,description:meta.description};
  } else if (path==='/') meta.schema = {'@context':'https://schema.org','@type':'WebSite',name:'Kodarchive',url:ORIGIN+'/',description:DESCRIPTION,author:{'@type':'Person',name:'Juan Maulana'}};
  return meta;
}
export function headTags(meta) {
  const e = escapeHTML;
  const tags = `<title>${e(meta.title)}</title><meta name="description" content="${e(meta.description)}"><link rel="canonical" href="${e(meta.canonical)}"><meta name="robots" content="${meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}"><meta property="og:site_name" content="Kodarchive"><meta property="og:title" content="${e(meta.title)}"><meta property="og:description" content="${e(meta.description)}"><meta property="og:type" content="${meta.type}"><meta property="og:url" content="${e(meta.canonical)}"><meta property="og:image" content="${e(meta.image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(meta.title)}"><meta name="twitter:description" content="${e(meta.description)}"><meta name="twitter:image" content="${e(meta.image)}">`;
  return tags+(meta.schema ? '<script id="seo-schema" type="application/ld+json">'+JSON.stringify(meta.schema).replace(/</g,'\\u003c')+'</script>' : '');
}
