import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BlueprintBackground from "./components/BlueprintBackground";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import NotebookView from "./pages/NotebookView";
import Studio from "./pages/Studio";
import WallPage from "./pages/WallPage";
import NowWritingPage from "./pages/NowWritingPage";
import ArchivePage from "./pages/ArchivePage";
import NotFound from "./pages/NotFound";
import InkCursor from "./components/InkCursor";
import MusicPlayer from "./components/MusicPlayer";
import { NotebooksProvider } from "./context/NotebooksContext";
import { Toaster } from "./components/ui/sonner";

const applyTheme = (theme) => {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
};

// Re-keyed on every path change so the fade replays. Wrapping Routes rather
// than each page keeps the animation in one place.
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
        <NotebooksProvider>
          <BlueprintBackground />
          <InkCursor />
          <Header theme={theme} setTheme={setTheme} />
          <RouteFade>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/notebook/:slug" element={<NotebookView />} />
              <Route path="/wall" element={<WallPage />} />
              <Route path="/now-writing" element={<NowWritingPage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RouteFade>
          <Footer />
          <MusicPlayer />
          <Toaster position="bottom-center" />
        </NotebooksProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
