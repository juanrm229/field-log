import test from 'node:test';
import assert from 'node:assert/strict';
import {getSEO,headTags,ORIGIN} from './src/lib/seo.mjs';
import {readFile} from 'node:fs/promises';
test('static pages, private studio, missing pages',async()=>{
  for (const path of ['/','/crossing','/archive','/wall','/now-writing']) {
    const meta=await getSEO(path); assert.equal(meta.noindex,false); assert.equal(meta.canonical,ORIGIN+path); assert.match(meta.title,/Kodarchive/);
  }
  assert.equal((await getSEO('/studio')).noindex,true);
  assert.equal((await getSEO('/missing')).status,404);
});
test('published article metadata escapes text and serializes schema safely',async()=>{
  const fetcher=async()=>({ok:true,json:async()=>({entry:{title:'A </script> & B',slug:'piece',body:'Writing',created_at:'2026-09-01'},notebook:{label:'Book',slug:'book'}})});
  const meta=await getSEO('/read/piece','',fetcher);
  assert.equal(meta.canonical,ORIGIN+'/read/piece'); assert.equal(meta.schema['@type'],'Article');
  const head=headTags(meta); assert.ok(!head.includes('A </script>')); assert.match(head,/\\u003c/);
});
test('legacy entry link canonicalizes to readable URL',async()=>{
  const fetcher=async()=>({ok:true,json:async()=>({notebook:{label:'Book',slug:'book'},entries:[{id:'one',title:'Piece',slug:'piece'}]})});
  assert.equal((await getSEO('/notebook/book','?entry=one',fetcher)).canonical,ORIGIN+'/read/piece');
});
test('unavailable and private articles do not become indexable fake pages',async()=>{
  assert.equal((await getSEO('/read/draft','',async()=>({status:404}))).noindex,true);
  await assert.rejects(getSEO('/read/piece','',async()=>({status:503,ok:false})));
});
test('server HTML has one canonical and identical metadata for humans and bots',async()=>{
  const source=(await readFile(new URL('./middleware.js',import.meta.url),'utf8')).replace('./src/lib/seo.mjs',new URL('./src/lib/seo.mjs',import.meta.url).href);
  const {default:middleware}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('<html><head><title>Old</title><meta name="description" content="old" /><meta property="og:title" content="old" /></head><body></body></html>');
  try {
    const human=await middleware(new Request(ORIGIN+'/crossing'));
    const bot=await middleware(new Request(ORIGIN+'/crossing',{headers:{'user-agent':'Googlebot'}}));
    const html=await human.text(); assert.equal(html,await bot.text());
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1); assert.equal((html.match(/<title>/g)||[]).length,1);
    assert.ok(!html.includes('<title>Old'));
    const studio=await middleware(new Request(ORIGIN+'/studio')); assert.match(studio.headers.get('x-robots-tag'),/noindex/);
  } finally {globalThis.fetch=original;}
});
