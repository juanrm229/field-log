import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReadBySlug } from "../api";
import Reader from "../components/Reader";
import LoadError from "../components/LoadError";

/*
  A piece at its own address: /read/the-cartographer-of-silence

  Pieces used to be reachable only as ?entry=<uuid> hanging off their notebook,
  which is fine for the app and poor for everything outside it — a link nobody
  wants to paste, and nothing for a search engine to make sense of. This route
  opens straight into the reader; closing it goes back to the notebook the
  piece belongs to, so the reader is never left staring at a blank page.
*/
const ReadPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setData(null);
    getReadBySlug(slug).then(setData).catch(() => setFailed(true));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  if (failed) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadError what="That piece" onRetry={load} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono-ui text-[11px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">finding the page…</p>
      </main>
    );
  }

  return (
    <Reader
      entry={data.entry}
      notebookLabel={data.notebook.label}
      onClose={() => navigate(`/notebook/${data.notebook.slug}`)}
    />
  );
};

export default ReadPage;
