"use client";
import {
  useEffect, useRef, useState, useCallback,
} from "react";
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, Volume1, VolumeX,
  Maximize, Minimize, Settings,
  RotateCcw,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  src: string;
  animeTitle: string;
  episodeNumber: number;
  episodeTitle?: string | null;
  /** Seconds at which "Skip Intro" appears (default 0). Set null to disable. */
  introStart?: number;
  /** Seconds at which intro ends / skip target (default 90). */
  introEnd?: number;
  onEnded?: () => void;
  onProgress?: (currentTime: number, completed: boolean) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function VideoPlayer({
  src,
  animeTitle,
  episodeNumber,
  episodeTitle,
  introStart = 0,
  introEnd = 90,
  onEnded,
  onProgress,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef   = useRef<HTMLDivElement>(null);
  const volumeRef     = useRef<HTMLDivElement>(null);

  const [playing,      setPlaying]      = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [buffered,     setBuffered]     = useState(0);
  const [volume,       setVolume]       = useState(1);
  const [muted,        setMuted]        = useState(false);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolSlider,setShowVolSlider]= useState(false);
  const [hoverTime,    setHoverTime]    = useState<number | null>(null);
  const [hoverX,       setHoverX]       = useState(0);
  const [seeking,      setSeeking]      = useState(false);
  const [ended,        setEnded]        = useState(false);
  const [showSkipIntro,setShowSkipIntro]= useState(false);

  // Skip intro visibility
  useEffect(() => {
    if (introStart == null) return;
    const visible = currentTime >= introStart && currentTime < introEnd && !ended;
    setShowSkipIntro(visible);
  }, [currentTime, introStart, introEnd, ended]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing && !seeking) setShowControls(false);
    }, 3000);
  }, [playing, seeking]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHideTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const vid = videoRef.current;
      if (!vid) return;
      switch (e.code) {
        case "Space": case "KeyK":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight": case "KeyL":
          e.preventDefault();
          vid.currentTime = Math.min(vid.currentTime + 10, vid.duration);
          resetHideTimer();
          break;
        case "ArrowLeft": case "KeyJ":
          e.preventDefault();
          vid.currentTime = Math.max(vid.currentTime - 10, 0);
          resetHideTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          vid.volume = Math.min(vid.volume + 0.1, 1);
          setVolume(vid.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          vid.volume = Math.max(vid.volume - 0.1, 0);
          setVolume(vid.volume);
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, muted]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (ended) {
      vid.currentTime = 0;
      setEnded(false);
      vid.play();
    } else if (vid.paused) {
      vid.play();
    } else {
      vid.pause();
    }
    resetHideTimer();
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const skipIntro = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = introEnd;
    resetHideTimer();
  };

  // ── Progress bar interaction ───────────────────────────────────────────

  const getSeekTime = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSeeking(true);
    const time = getSeekTime(e);
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);

    const onMove = (ev: MouseEvent) => {
      const bar = progressRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const t = ratio * duration;
      if (videoRef.current) videoRef.current.currentTime = t;
      setCurrentTime(t);
    };
    const onUp = () => {
      setSeeking(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── Volume bar interaction ─────────────────────────────────────────────

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = volumeRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const vid = videoRef.current;
    if (!vid) return;
    vid.volume = ratio;
    vid.muted = ratio === 0;
    setVolume(ratio);
    setMuted(ratio === 0);
  };

  // ── Video events ──────────────────────────────────────────────────────

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
    // Buffered
    if (vid.buffered.length > 0) {
      setBuffered(vid.buffered.end(vid.buffered.length - 1));
    }
    // Progress callback every ~5s
    if (Math.floor(vid.currentTime) % 5 === 0 && onProgress) {
      const isCompleted = vid.duration > 0 && vid.currentTime / vid.duration > 0.9;
      onProgress(Math.floor(vid.currentTime), isCompleted);
    }
  };

  const progress  = duration > 0 ? (currentTime / duration) * 100 : 0;
  const buffPct   = duration > 0 ? (buffered / duration) * 100 : 0;
  const volPct    = muted ? 0 : volume * 100;

  const VolumeIcon = volPct === 0 ? VolumeX : volPct < 50 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none overflow-hidden"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-controls]")) return;
        togglePlay();
      }}
    >
      {/* ── Video element ──────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          const vid = videoRef.current;
          if (vid) setDuration(vid.duration);
        }}
        onPlay={() => { setPlaying(true); setEnded(false); }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
          setShowControls(true);
          onEnded?.();
          if (onProgress) onProgress(Math.floor(duration), true);
        }}
        onWaiting={() => setPlaying(false)}
        onPlaying={() => setPlaying(true)}
      />

      {/* ── Gradient overlays ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: showControls ? 1 : 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* ── Top bar — anime/episode title ──────────────────────────────── */}
      <div
        data-controls
        className="absolute top-0 left-0 right-0 px-5 pt-4 pb-8 flex items-start justify-between transition-all duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
      >
        <div>
          <p className="text-white/60 text-xs font-medium tracking-widest uppercase">
            {animeTitle}
          </p>
          <p className="text-white font-bold text-base leading-tight mt-0.5">
            Bölüm {episodeNumber}{episodeTitle ? ` · ${episodeTitle}` : ""}
          </p>
        </div>
      </div>

      {/* ── Center play/pause feedback ─────────────────────────────────── */}
      {!playing && !ended && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* ── Replay overlay ─────────────────────────────────────────────── */}
      {ended && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <RotateCcw className="w-7 h-7 text-white" />
          </div>
        </div>
      )}

      {/* ── Skip Intro button ──────────────────────────────────────────── */}
      {showSkipIntro && (
        <button
          data-controls
          onClick={(e) => { e.stopPropagation(); skipIntro(); }}
          className="absolute bottom-20 right-5 px-4 py-2 text-sm font-bold text-white border border-white/50 rounded hover:bg-white hover:text-black transition-all duration-150 backdrop-blur-sm bg-black/30"
        >
          Giriş'i Atla →
        </button>
      )}

      {/* ── Bottom controls ────────────────────────────────────────────── */}
      <div
        data-controls
        className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6 transition-all duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1 mb-3 group/progress cursor-pointer rounded-full bg-white/20"
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={handleProgressMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Buffered */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/30 transition-all"
            style={{ width: `${buffPct}%` }}
          />
          {/* Played */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-crimson transition-all group-hover/progress:h-[5px] group-hover/progress:-top-[2px]"
            style={{ width: `${progress}%` }}
          >
            {/* Thumb */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-crimson shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>

          {/* Hover time tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-8 text-[11px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded pointer-events-none -translate-x-1/2"
              style={{ left: hoverX }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left group */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Rewind 10s */}
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10); resetHideTimer(); }}
              className="p-2 text-white/70 hover:text-white transition-colors rounded"
              title="-10 saniye (J)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-2 text-white hover:text-crimson transition-colors rounded"
              title={playing ? "Duraklat (K)" : "Oynat (K)"}
            >
              {playing
                ? <Pause className="w-5 h-5 fill-white" />
                : <Play  className="w-5 h-5 fill-white" />
              }
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(duration, currentTime + 10); resetHideTimer(); }}
              className="p-2 text-white/70 hover:text-white transition-colors rounded"
              title="+10 saniye (L)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div
              className="flex items-center gap-1 group/vol"
              onMouseEnter={() => setShowVolSlider(true)}
              onMouseLeave={() => setShowVolSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="p-2 text-white/70 hover:text-white transition-colors rounded"
                title="Sesi Kapat/Aç (M)"
              >
                <VolumeIcon className="w-4 h-4" />
              </button>
              <div
                className="overflow-hidden transition-all duration-200"
                style={{ width: showVolSlider ? 64 : 0 }}
              >
                <div
                  ref={volumeRef}
                  className="relative h-1 w-16 rounded-full bg-white/20 cursor-pointer"
                  onClick={handleVolumeClick}
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-white"
                    style={{ width: `${volPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Time */}
            <span className="text-white/60 text-xs font-mono ml-1 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right group */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Settings (visual only) */}
            <button
              className="p-2 text-white/50 hover:text-white transition-colors rounded"
              title="Ayarlar"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/70 hover:text-white transition-colors rounded"
              title="Tam Ekran (F)"
            >
              {fullscreen
                ? <Minimize className="w-4 h-4" />
                : <Maximize className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
