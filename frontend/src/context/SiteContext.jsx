import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSite } from "../api";

/*
  What the site says about itself — the name on the covers, the lines on the
  inside-cover page, the contact details. All of it used to be typed into the
  components, so changing a handle meant a code change and a deploy.

  Defaults are carried here as well as on the server so the first paint has
  something to draw before the request lands, and so a page still renders if the
  backend is asleep.
*/
const FALLBACK = {
  site_name: "Commonplace Book",
  site_tagline: "stories, poems & things kind people said",
  description: "",
  owner_name: "",
  coordinates: [],
  start_date: "",
  start_location: "",
  completion_date: "",
  completion_location: "",
  contact_local: "",
  contact_domain: "",
  footer: "",
  back_lines: [],
  back_end: "fin.",
};

const SiteContext = createContext({ site: FALLBACK, refresh: () => {} });

export const SiteProvider = ({ children }) => {
  const [site, setSite] = useState(FALLBACK);

  const refresh = useCallback(() => {
    getSite()
      .then((d) => setSite({ ...FALLBACK, ...d }))
      .catch(() => {
        /* keep the fallback: a missing setting must not blank the page */
      });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <SiteContext.Provider value={{ site, refresh }}>{children}</SiteContext.Provider>;
};

export const useSite = () => useContext(SiteContext);
