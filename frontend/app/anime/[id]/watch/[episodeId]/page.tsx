"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Maximize, Loader2, Lock, CheckCircle,
  Film, Star, Calendar, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { episodeApi, animeApi, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDuration } from "@/lib/utils";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  fetchEpisodeById, fetchEpisodeVideos, formatAiredDate,
  type JikanEpisode, type JikanEpisodeVideo,
} from "@/lib/jikan";
import type { Episode, Anime } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PLACEHOLDER_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/** YouTube watch?v= veya youtu.be linkini embed URL'ye çevirir. */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) {
      return url;
    }
  } catch {}
  return null;
}

function isPlaceholder(url: string | null): boolean {
  if (!url) return true;
  return url.includes("dQw4w9WgXcQ");
}

export default function WatchPage() {
  const { id, episodeId } = useParams<{ id: string; episodeId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const animeId = Number(id);
  const epId = Number(episodeId);

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Jikan live data
  const [jikanEpisode, setJikanEpisode] = useState<JikanEpisode | null>(null);
  const [jikanVideo, setJikanVideo] = useState<JikanEpisodeVideo | null>(null);
  const [jikanLoading, setJikanLoading] = useState(false);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Sibling episodes for navigation
  const [siblingEpisodes, setSiblingEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    if (!user) {
      toast.error("Izlemek icin giris yapin.");
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        const [ep, animeData] = await Promise.all([
          episodeApi.watch(epId),
          animeApi.get(animeId),
        ]);
        setEpisode(ep);
        setAnime(animeData);

        const seasonEps = await episodeApi.list(ep.season_id);
        setSiblingEpisodes(seasonEps.sort((a, b) => a.episode_number - b.episode_number));
      } catch (err) {
        const msg = getErrorMessage(err);
        if (msg.includes("abonelik") || msg.includes("premium") || msg.includes("403")) {
          setError("Bu bolum premium iceriktir. Izlemek icin aktif bir abonelige ihtiyaciniz var.");
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [epId, animeId, user, router]);

  // Fetch live Jikan data when mal_id is available and video is a placeholder
  useEffect(() => {
    if (!episode || !anime?.mal_id) return;
    if (!isPlaceholder(episode.video_url)) return;

    const malId = anime.mal_id;
    const epNumber = episode.episode_number;

    setJikanLoading(true);

    Promise.all([
      fetchEpisodeById(malId, epNumber),
      fetchEpisodeVideos(malId),
    ]).then(([jEp, videos]) => {
      if (jEp) setJikanEpisode(jEp);
      // Find promo video matching this episode number
      const match = videos.find((v) => v.mal_id === epNumber);
      if (match) setJikanVideo(match);
    }).finally(() => {
      setJikanLoading(false);
    });
  }, [episode, anime]);

  // Progress tracking - update every 10 seconds
  const saveProgress = useCallback(async () => {
    if (!episode || !videoRef.current) return;
    const vid = videoRef.current;
    const isCompleted = vid.duration > 0 && vid.currentTime / vid.duration > 0.9;
    try {
      await episodeApi.updateProgress(epId, {
        watched_duration: Math.floor(vid.currentTime),
        completed_flag: isCompleted,
      });
      if (isCompleted && !completed) {
        setCompleted(true);
        toast.success("Bolum tamamlandi!");
      }
    } catch {
      // silently fail progress saves
    }
  }, [epId, episode, completed]);

  useEffect(() => {
    const interval = setInterval(saveProgress, 10000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  useEffect(() => {
    return () => { saveProgress(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Number(e.target.value);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else videoRef.current.requestFullscreen();
  };

  const currentIndex = siblingEpisodes.findIndex((e) => e.episode_id === epId);
  const prevEp = currentIndex > 0 ? siblingEpisodes[currentIndex - 1] : null;
  const nextEp = currentIndex < siblingEpisodes.length - 1 ? siblingEpisodes[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-crimson animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <Lock className="w-12 h-12 text-crimson mx-auto" />
        <h2 className="font-heading text-2xl font-bold text-fg">Erisim Engellendi</h2>
        <p className="text-muted">{error}</p>
        <div className="flex justify-center gap-3">
          <Link href={`/anime/${animeId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Anime Detay
            </Button>
          </Link>
          <Link href="/subscription">
            <Button size="sm">Abonelik Al</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!episode) return null;

  // Determine actual video source:
  // 1. Use episode.video_url if it's NOT a placeholder
  //    - If it looks like a bare filename (no protocol, no leading /), it's a local
  //      file served by our stream endpoint → build the full URL with JWT token
  // 2. Use jikanVideo.url if Jikan promo found
  // 3. No video available
  const useJikan = isPlaceholder(episode.video_url);

  let videoSource: string | null = null;
  let isLocalStream = false;

  if (!useJikan && episode.video_url) {
    const v = episode.video_url;
    if (!v.startsWith("http://") && !v.startsWith("https://") && !v.startsWith("/")) {
      // Bare filename → served by /stream endpoint
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      videoSource = `${BASE}/api/episodes/${epId}/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      isLocalStream = true;
    } else {
      videoSource = v;
    }
  } else if (useJikan) {
    videoSource = jikanVideo?.url ?? null;
  }

  const youtubeEmbed = videoSource && !isLocalStream ? getYouTubeEmbedUrl(videoSource) : null;
  const isYoutube = Boolean(youtubeEmbed);

  // Merged episode info: prefer Jikan data when available
  const displayTitle = jikanEpisode?.title ?? episode.title ?? `Bolum ${episode.episode_number}`;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Back button */}
      <Link
        href={`/anime/${animeId}`}
        className="flex items-center gap-2 text-muted hover:text-fg transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Anime Detaya Don
      </Link>

      {/* Video Player */}
      <div className="rounded-2xl overflow-hidden border border-border">
        {jikanLoading && useJikan ? (
          <div className="w-full aspect-video flex flex-col items-center justify-center bg-midnight gap-3">
            <Loader2 className="w-10 h-10 text-[#6C5CE7] animate-spin" />
            <p className="text-muted text-sm">Jikan'dan bölüm verisi yükleniyor...</p>
          </div>
        ) : isLocalStream && videoSource ? (
          /* ── Premium custom player for local stream files ── */
          <VideoPlayer
            src={videoSource}
            animeTitle={anime?.title ?? ""}
            episodeNumber={episode.episode_number}
            episodeTitle={displayTitle !== `Bolum ${episode.episode_number}` ? displayTitle : null}
            introStart={0}
            introEnd={90}
            onEnded={() => { setPlaying(false); saveProgress(); }}
            onProgress={async (time, isCompleted) => {
              try {
                await episodeApi.updateProgress(epId, {
                  watched_duration: time,
                  completed_flag: isCompleted,
                });
                if (isCompleted && !completed) {
                  setCompleted(true);
                  toast.success("Bölüm tamamlandı!");
                }
              } catch { /* silently fail */ }
            }}
          />
        ) : youtubeEmbed ? (
          /* YouTube embed */
          <div className="w-full aspect-video">
            <iframe
              src={youtubeEmbed}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={displayTitle}
            />
          </div>
        ) : videoSource && !isYoutube ? (
          /* External video URL with basic controls */
          <video
            src={videoSource}
            className="w-full aspect-video bg-black"
            controls
          />
        ) : (
          /* No video */
          <div className="w-full aspect-video flex items-center justify-center bg-midnight">
            <div className="text-center space-y-4 max-w-sm px-6">
              <Film className="w-16 h-16 text-dim mx-auto" />
              <div>
                <p className="text-fg font-heading font-semibold text-lg">{displayTitle}</p>
                {jikanEpisode && (
                  <div className="flex flex-wrap justify-center gap-3 mt-3 text-sm text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatAiredDate(jikanEpisode.aired)}
                    </span>
                    {jikanEpisode.score && jikanEpisode.score > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {jikanEpisode.score.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-dim text-xs">Bu bölüm için video kaynağı mevcut değil.</p>
            </div>
          </div>
        )}
      </div>

      {/* Episode Info */}
      <div className="bg-midnight border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-fg">
              Bolum {episode.episode_number}{displayTitle !== `Bolum ${episode.episode_number}` ? `: ${displayTitle}` : ""}
            </h1>
            {jikanEpisode?.title_japanese && (
              <p className="text-sm text-dim mt-0.5">{jikanEpisode.title_japanese}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {episode.is_premium && <Badge variant="premium"><Lock className="w-2.5 h-2.5 mr-1" />Premium</Badge>}
              {episode.duration_seconds && <Badge>{formatDuration(episode.duration_seconds)}</Badge>}
              {jikanEpisode?.score && jikanEpisode.score > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {jikanEpisode.score.toFixed(2)}
                </span>
              )}
              {jikanEpisode?.aired && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Calendar className="w-3 h-3" />
                  {formatAiredDate(jikanEpisode.aired)}
                </span>
              )}
              {jikanEpisode?.filler && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">Filler</span>
              )}
              {jikanEpisode?.recap && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">Recap</span>
              )}
              {completed && <Badge variant="success">Tamamlandi</Badge>}
            </div>
          </div>
          {anime?.mal_id && (
            <a
              href={`https://myanimelist.net/anime/${anime.mal_id}/episode/${episode.episode_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-dim hover:text-[#6C5CE7] transition-colors shrink-0 ml-4"
            >
              MAL →
            </a>
          )}
        </div>

        {/* Episode Navigation */}
        <div className="flex justify-between pt-2 border-t border-border">
          {prevEp ? (
            <Link href={`/anime/${animeId}/watch/${prevEp.episode_id}`}>
              <Button variant="ghost" size="sm">
                <SkipBack className="w-3.5 h-3.5" /> Onceki Bolum
              </Button>
            </Link>
          ) : <div />}
          {nextEp ? (
            <Link href={`/anime/${animeId}/watch/${nextEp.episode_id}`}>
              <Button variant="ghost" size="sm">
                Sonraki Bolum <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : <div />}
        </div>
      </div>

      {/* Episode List */}
      {siblingEpisodes.length > 1 && (
        <div className="bg-midnight border border-border rounded-xl overflow-hidden">
          <h3 className="font-heading text-lg font-semibold text-fg px-5 py-3 border-b border-border">
            Bolumler
          </h3>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {siblingEpisodes.map((ep) => (
              <Link
                key={ep.episode_id}
                href={`/anime/${animeId}/watch/${ep.episode_id}`}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-obsidian/50 transition-colors ${ep.episode_id === epId ? "bg-crimson/10 border-l-2 border-crimson" : ""}`}
              >
                <span className="text-dim text-sm w-8 shrink-0">{ep.episode_number}.</span>
                <span className={`text-sm flex-1 truncate ${ep.episode_id === epId ? "text-crimson font-semibold" : "text-fg"}`}>
                  {ep.title ?? `Bolum ${ep.episode_number}`}
                </span>
                {ep.is_premium && <Lock className="w-3 h-3 text-violet shrink-0" />}
                {ep.duration_seconds && <span className="text-xs text-dim">{formatDuration(ep.duration_seconds)}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
