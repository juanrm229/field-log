import React, { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";
import { getMusic, MUSIC_STREAM_URL } from "../api";

const MusicPlayer = () => {
  const [exists, setExists] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem("music_muted") === "1");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getMusic().then((d) => { if (!cancelled && d.exists) setExists(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!exists) return;
    const audio = new Audio(MUSIC_STREAM_URL);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    const tryPlay = () => {
      if (localStorage.getItem("music_muted") === "1") return;
      audio.play().then(() => setPlaying(true)).catch(() => {});
    };
    tryPlay();
    const onFirstTap = () => { if (audio.paused) tryPlay(); };
    window.addEventListener("pointerdown", onFirstTap);
    return () => {
      window.removeEventListener("pointerdown", onFirstTap);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [exists]);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("music_muted", next ? "1" : "0");
    const audio = audioRef.current;
    if (!audio) return;
    if (next) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  if (!exists) return null;

  return (
    <button
      data-testid="music-toggle"
      onClick={toggle}
      aria-label={muted ? "Play background music" : "Mute background music"}
      className="pill fixed bottom-4 left-5 z-40 h-9 px-3.5 flex items-center gap-2 text-neutral-700 dark:text-neutral-200"
    >
      {muted ? <VolumeX size={14} className="text-neutral-400" /> : <Music size={14} className="text-[#f94b0c]" />}
      {!muted && playing && (
        <span className="flex items-end gap-[2px] h-3" aria-hidden="true">
          <span className="eq-bar" />
          <span className="eq-bar" style={{ animationDelay: "0.15s" }} />
          <span className="eq-bar" style={{ animationDelay: "0.3s" }} />
        </span>
      )}
    </button>
  );
};

export default MusicPlayer;
