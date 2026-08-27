import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Monitor, Sun, Moon, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import SearchOverlay from "./SearchOverlay";
import { useNotebooks } from "../context/NotebooksContext";
import { OWNER } from "../mock";

const Header = ({ theme, setTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logoHover, setLogoHover] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { notebooks } = useNotebooks();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let current = "Home";
  if (location.pathname === "/studio") current = "Studio";
  else if (location.pathname === "/wall") current = "The Wall";
  else if (location.pathname === "/now-writing") current = "Now Writing";
  else if (location.pathname === "/archive") current = "Archive";
  else if (location.pathname === "/crossing") current = "The Crossing";
  else if (location.pathname.startsWith("/notebook/")) {
    const slug = location.pathname.split("/notebook/")[1];
    const nb = notebooks.find((n) => n.slug === slug);
    current = nb ? nb.label : "Notebook";
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4">
      <div className="flex items-center gap-2.5">
        {/* Logo pill : Juan -> Koda (holographic) on hover */}
        <div className="relative">
          <button
            data-testid="logo-pill"
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
            onClick={() => navigate("/")}
            className="pill h-9 px-4 flex items-center justify-center select-none min-w-[92px]"
          >
            {logoHover ? (
              <span className="font-logo text-[17px] leading-none holo-text">{OWNER.alias}</span>
            ) : (
              <span className="font-logo text-[17px] leading-none text-neutral-900 dark:text-neutral-100">Juan</span>
            )}
          </button>
          <div
            className={`absolute left-0 top-11 w-60 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg px-4 py-3 transition-all duration-300 origin-top-left ${
              logoHover ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
            }`}
          >
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] holo-text mb-1">Koda</p>
            <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-300">{OWNER.aliasNote}</p>
          </div>
        </div>

        <span className="text-neutral-400 text-sm select-none">/</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="nav-dropdown-trigger" className="pill h-9 px-4 flex items-center gap-1.5 text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
              {current}
              <ChevronDown size={14} className="text-neutral-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl min-w-[170px]">
            <DropdownMenuItem data-testid="nav-item-home" className="rounded-lg text-[13px] cursor-pointer" onClick={() => navigate("/")}>
              Home
            </DropdownMenuItem>
            {notebooks.map((nb) => (
              <DropdownMenuItem
                key={nb.id}
                data-testid={`nav-item-${nb.slug}`}
                className="rounded-lg text-[13px] cursor-pointer"
                onClick={() => navigate(`/notebook/${nb.slug}`)}
              >
                {nb.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem data-testid="nav-item-wall" className="rounded-lg text-[13px] cursor-pointer" onClick={() => navigate("/wall")}>
              The Wall
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="nav-item-now-writing" className="rounded-lg text-[13px] cursor-pointer" onClick={() => navigate("/now-writing")}>
              Now Writing
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="nav-item-archive" className="rounded-lg text-[13px] cursor-pointer" onClick={() => navigate("/archive")}>
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="nav-item-crossing" className="rounded-lg text-[13px] cursor-pointer" onClick={() => navigate("/crossing")}>
              The Crossing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        {/* search pill */}
        <button
          data-testid="search-toggle"
          onClick={() => setSearchOpen(true)}
          className="pill h-9 px-3.5 flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200"
          aria-label="Search writings"
        >
          <Search size={14} />
          <kbd className="hidden sm:inline font-mono-ui text-[8.5px] text-neutral-400">⌘K</kbd>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="theme-toggle" className="pill h-9 px-3.5 flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
              <ThemeIcon size={15} />
              <ChevronDown size={13} className="text-neutral-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl min-w-[130px]">
            <DropdownMenuItem className="rounded-lg text-[13px] cursor-pointer gap-2" onClick={() => setTheme("light")}>
              <Sun size={14} /> Light
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-[13px] cursor-pointer gap-2" onClick={() => setTheme("dark")}>
              <Moon size={14} /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-[13px] cursor-pointer gap-2" onClick={() => setTheme("system")}>
              <Monitor size={14} /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};

export default Header;
