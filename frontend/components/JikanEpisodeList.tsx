"use client";

import { useState, useCallback } from "react";
import { Loader2, Search, AlertCircle, Film, Star, Calendar, RefreshCw } from "lucide-react";
import { fetchAllEpisodes, fetchAnimeInfo, formatAiredDate } from "@/lib/jikan";
import type { JikanEpisode, JikanAnimeInfo } from "@/lib/jikan";
import { Badge } from "@/components/ui/Badge";

// ─── Alt bileşenler ───────────────────────────────────────────────────────────

function EpisodeCard({ ep }: { ep: JikanEpisode }) {
  const isFiller = ep.filler;
  const isRecap  = ep.recap;

  return (
    <div
      className={`
        group relative bg-midnight border rounded-xl p-4 flex flex-col gap-2
        hover:border-[#6C5CE7] hover:shadow-lg hover:shadow-[#6C5CE7]/10
        transition-all duration-200 cursor-default
        ${isFiller ? "border-amber-500/30" : isRecap ? "border-blue-500/30" : "border-border"}
      `}
    >
      {/* Bölüm numarası */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl font-bold font-heading text-[#2A2A52] group-hover:text-[#6C5CE7] transition-colors leading-none select-none">
          {String(ep.mal_id).padStart(2, "0")}
        </span>
        <div className="flex flex-wrap gap-1 justify-end">
          {isFiller && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Filler
            </span>
          )}
          {isRecap && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
              Recap
            </span>
          )}
        </div>
      </div>

      {/* Başlık */}
      <p className="text-sm font-medium text-[#F0F0F5] line-clamp-2 leading-snug flex-1">
        {ep.title ?? ep.title_romanji ?? `Bölüm ${ep.mal_id}`}
      </p>

      {/* Japonca başlık */}
      {ep.title_japanese && (
        <p className="text-xs text-[#4A4A6A] truncate">{ep.title_japanese}</p>
      )}

      {/* Alt bilgiler */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-1 text-[#8A8AA8]">
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="text-xs">{formatAiredDate(ep.aired)}</span>
        </div>
        {ep.score !== null && ep.score > 0 ? (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-amber-400">{ep.score.toFixed(2)}</span>
          </div>
        ) : (
          <span className="text-xs text-[#2A2A52]">—</span>
        )}
      </div>
    </div>
  );
}

function StatsBar({
  episodes,
  filtered,
}: {
  episodes: JikanEpisode[];
  filtered: JikanEpisode[];
}) {
  const fillerCount = episodes.filter((e) => e.filler).length;
  const recapCount  = episodes.filter((e) => e.recap).length;
  const scoredEps   = episodes.filter((e) => e.score && e.score > 0);
  const avgScore    = scoredEps.length
    ? (scoredEps.reduce((s, e) => s + (e.score ?? 0), 0) / scoredEps.length).toFixed(2)
    : null;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge>{filtered.length} / {episodes.length} bölüm</Badge>
      {fillerCount > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {fillerCount} filler
        </span>
      )}
      {recapCount > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {recapCount} recap
        </span>
      )}
      {avgScore && (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Star className="w-2.5 h-2.5 fill-amber-400" /> Ort: {avgScore}
        </span>
      )}
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

interface Props {
  /** MyAnimeList anime ID'si */
  malId: number;
  /** Başlık olarak gösterilecek anime adı (opsiyonel, bilgi kartı için) */
  initialTitle?: string;
}

type FilterType = "all" | "filler" | "recap" | "canon";

export function JikanEpisodeList({ malId, initialTitle }: Props) {
  const [episodes, setEpisodes]   = useState<JikanEpisode[]>([]);
  const [animeInfo, setAnimeInfo] = useState<JikanAnimeInfo | null>(null);
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState<{ loaded: number; page: number } | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [loaded, setLoaded]       = useState(false);

  // Arama + filtre
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<FilterType>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress({ loaded: 0, page: 1 });

    try {
      const [info, result] = await Promise.all([
        fetchAnimeInfo(malId),
        fetchAllEpisodes(malId, (loaded, page) =>
          setProgress({ loaded, page })
        ),
      ]);
      setAnimeInfo(info);
      setEpisodes(result.episodes);
      setLoaded(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bölümler yüklenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [malId]);

  // Filtrele + ara
  const filtered = episodes.filter((ep) => {
    const matchFilter =
      filter === "all"   ? true :
      filter === "filler"? ep.filler :
      filter === "recap" ? ep.recap :
      /* canon */          !ep.filler && !ep.recap;

    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      String(ep.mal_id).includes(q) ||
      (ep.title ?? "").toLowerCase().includes(q) ||
      (ep.title_romanji ?? "").toLowerCase().includes(q) ||
      (ep.title_japanese ?? "").toLowerCase().includes(q);

    return matchFilter && matchSearch;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!loaded && !loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Film className="w-12 h-12 text-[#4A4A6A]" />
        <div>
          <p className="text-[#F0F0F5] font-heading text-lg font-semibold">
            {initialTitle ?? `MAL ID: ${malId}`}
          </p>
          <p className="text-[#8A8AA8] text-sm mt-1">
            Jikan API üzerinden tüm bölümleri yüklemek için başlat.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Film className="w-4 h-4" />
          Bölümleri Yükle
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Loader2 className="w-10 h-10 text-[#6C5CE7] animate-spin" />
        <div>
          <p className="text-[#F0F0F5] font-semibold">Jikan'dan çekiliyor...</p>
          {progress && (
            <p className="text-[#8A8AA8] text-sm mt-1">
              Sayfa {progress.page} — {progress.loaded} bölüm yüklendi
            </p>
          )}
          <p className="text-[#4A4A6A] text-xs mt-1">
            Rate limit koruması aktif (600ms/sayfa)
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <div>
          <p className="text-[#F0F0F5] font-semibold">Yükleme başarısız</p>
          <p className="text-[#8A8AA8] text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-midnight border border-border hover:border-[#6C5CE7] text-sm text-[#F0F0F5] rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Anime bilgi kartı */}
      {animeInfo && (
        <div className="flex gap-4 bg-midnight border border-border rounded-xl p-4">
          {animeInfo.images?.webp?.large_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={animeInfo.images.webp.large_image_url}
              alt={animeInfo.title}
              className="w-16 h-24 object-cover rounded-lg border border-border shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div>
              <h2 className="font-heading font-bold text-[#F0F0F5] text-lg leading-tight truncate">
                {animeInfo.title}
              </h2>
              {animeInfo.title_japanese && (
                <p className="text-xs text-[#4A4A6A] truncate">{animeInfo.title_japanese}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {animeInfo.score && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {animeInfo.score}
                </span>
              )}
              {animeInfo.year && <Badge>{animeInfo.year}</Badge>}
              <Badge>{animeInfo.status}</Badge>
              {animeInfo.genres.slice(0, 3).map((g) => (
                <Badge key={g.name}>{g.name}</Badge>
              ))}
            </div>
            <StatsBar episodes={episodes} filtered={filtered} />
          </div>
          <button
            onClick={load}
            title="Yenile"
            className="self-start p-1.5 text-[#4A4A6A] hover:text-[#6C5CE7] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Arama + filtre çubuğu */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A6A]" />
          <input
            type="text"
            placeholder="Bölüm ara (numara veya başlık)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-midnight border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#4A4A6A] focus:outline-none focus:border-[#6C5CE7] transition-colors"
          />
        </div>
        <div className="flex gap-1.5 shrink-0">
          {(["all", "canon", "filler", "recap"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? "bg-[#6C5CE7] text-white"
                  : "bg-midnight border border-border text-[#8A8AA8] hover:border-[#6C5CE7]"
              }`}
            >
              {f === "all" ? "Tümü" : f === "canon" ? "Canon" : f === "filler" ? "Filler" : "Recap"}
            </button>
          ))}
        </div>
      </div>

      {/* Boş sonuç */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-[#4A4A6A]">
          <Search className="w-8 h-8 mx-auto mb-2" />
          <p>"{search}" için sonuç bulunamadı.</p>
        </div>
      )}

      {/* Episode grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.map((ep) => (
          <EpisodeCard key={ep.mal_id} ep={ep} />
        ))}
      </div>
    </div>
  );
}
