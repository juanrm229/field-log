import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSEO, headTags } from '../lib/seo.mjs';
export default function RouteSEO() {
  const {pathname,search} = useLocation();
  useEffect(()=>{
    const controller = new AbortController();
    getSEO(pathname,search,url=>fetch(url,{signal:controller.signal})).then(meta=>{
      if (controller.signal.aborted) return;
      document.head.querySelectorAll('title,meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],#seo-schema').forEach(el=>el.remove());
      const template = document.createElement('template');
      template.innerHTML = headTags(meta);
      document.head.append(template.content);
    }).catch(()=>{});
    return ()=>controller.abort();
  },[pathname,search]);
  return null;
}
