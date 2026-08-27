import React, { lazy, Suspense, useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BlueprintBackground from "./components/BlueprintBackground";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";

// The desk is the landing page and stays in the main bundle. Everything else is
// fetched when it is first opened — most visitors never reach Studio at all,
// and it is the largest page in the app.
const NotebookView = lazy(() => import("./pages/NotebookView"));
const ReadPage = lazy(() => import("./pages/ReadPage"));
const Studio = lazy(() => import("./pages/Studio"));
const WallPage = lazy(() => import("./pages/WallPage"));
const NowWritingPage = lazy(() => import("./pages/NowWritingPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const SimpangPage = lazy(() => import("./pages/SimpangPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
import InkCursor from "./components/InkCursor";
import MusicPlayer from "./components/MusicPlayer";
import { NotebooksProvider } from "./context/NotebooksContext";
import { SiteProvider } from "./context/SiteContext";
import { Toaster } from "./components/ui/sonner";

const applyTheme = (theme) => {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
};

// Re-keyed on every path change so the fade replays. Wrapping Routes rather
// than each page keeps the animation in one place.
const PageLoading = () => (
  <main className="min-h-screen flex items-center justify-center">
    <p className="font-mono-ui text-[11px] tracking-[0.2em] uppercase text-neutral-400 animate-pulse">turning the page…</p>
  </main>
);

const RouteFade = ({ children }) => {
  const { pathname } = useLocation();
  return <div key={pathname} className="route-fade">{children}</div>;
};

// In the page flow rather than floating over it. Its height is reserved by the
// --footnote-h custom property, which .min-h-screen subtracts, so a "full
// screen" page plus this footnote still adds up to exactly one viewport.
const Footer = () => (
  <footer className="footnote flex items-center justify-center gap-1.5 select-none">
    <span className="font-mono-ui text-[8px] tracking-[0.2em] text-neutral-400/70 dark:text-neutral-500/70">WRITTEN IN INDONESIA</span>
    <svg width="11" height="8" viewBox="0 0 16 11" className="rounded-[1px] opacity-60" aria-hidden="true">
      <rect width="16" height="5.5" fill="#e63946" />
      <rect y="5.5" width="16" height="5.5" fill="#ffffff" />
    </svg>
  </footer>
);

function App() {
  const [theme, setThemeState] = useState(() => localStorage.getItem("theme") || "dark");

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="App min-h-screen font-ui">
      <BrowserRouter>
        <SiteProvider>
        <NotebooksProvider>
          <BlueprintBackground />
          <InkCursor />
          <Header theme={theme} setTheme={setTheme} />
          <RouteFade>
            <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/notebook/:slug" element={<NotebookView />} />
              <Route path="/read/:slug" element={<ReadPage />} />
              <Route path="/wall" element={<WallPage />} />
              <Route path="/now-writing" element={<NowWritingPage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/simpang" element={<SimpangPage />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </RouteFade>
          <Footer />
          <MusicPlayer />
          <Toaster position="bottom-center" />
        </NotebooksProvider>
        </SiteProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
