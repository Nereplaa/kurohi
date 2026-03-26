"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { animeApi, genreApi, userApi, getErrorMessage } from "@/lib/api";
import { AnimeCard } from "@/components/AnimeCard";
import { AnimeCardSkeleton } from "@/components/AnimeCardSkeleton";
import { FeaturedBanner } from "@/components/FeaturedBanner";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import type { Anime, Genre, Favorite } from "@/types";

const LIMIT = 20;
const SKELETON_COUNT = 20;

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations("home");

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  // Multi-genre: Set<number>
  const [selectedGenres, setSelectedGenres] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Stale-closure-safe refs for IntersectionObserver
  const skipRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const searchRef = useRef(search);
  const genresRef = useRef<number[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchAnimes = useCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true);
      skipRef.current = 0;
      hasMoreRef.current = true;
    } else {
      if (!hasMoreRef.current || loadingMoreRef.current) return;
      setLoadingMore(true);
      loadingMoreRef.current = true;
    }

    try {
      const data = await animeApi.list({
        skip: skipRef.current,
        limit: LIMIT,
        search: searchRef.current || undefined,
        genre_ids: genresRef.current.length > 0 ? genresRef.current : undefined,
      });

      if (reset) setAnimes(data);
      else setAnimes((prev) => [...prev, ...data]);

      skipRef.current += data.length;
      hasMoreRef.current = data.length === LIMIT;
      setHasMore(data.length === LIMIT);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, []);

  // Sync refs + reset on filter change
  useEffect(() => {
    searchRef.current = search;
    genresRef.current = Array.from(selectedGenres);
    fetchAnimes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedGenres]);

  useEffect(() => {
    genreApi.list().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    userApi
      .getFavorites()
      .then((favs: Favorite[]) => setFavorites(new Set(favs.map((f) => f.anime_id))))
      .catch(() => {});
  }, [user]);

  // Callback ref: observer is created/destroyed as sentinel mounts/unmounts
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => { if (entries[0].isIntersecting) fetchAnimes(false); },
        { rootMargin: "300px" }
      );
      observerRef.current.observe(node);
    },
    [fetchAnimes]
  );

  const handleFavoriteChange = (animeId: number, isFav: boolean) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(animeId); else next.delete(animeId);
      return next;
    });
  };

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedGenres(new Set());
    router.push("/");
  };

  const applySearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
    setSearch(q);
    router.push(q ? `/?search=${encodeURIComponent(q)}` : "/");
  };

  const hasFilters = search || selectedGenres.size > 0;

  return (
    <div className="space-y-8">
      {!hasFilters && <FeaturedBanner />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-fg">{t("title")}</h1>
          {!loading && animes.length > 0 && (
            <p className="text-muted text-sm mt-0.5">{t("results", { count: animes.length })}</p>
          )}
        </div>
        <div className="sm:ml-auto flex gap-2">
          <form onSubmit={applySearch} className="flex gap-2">
            <input
              name="q"
              defaultValue={search}
              placeholder={t("search") + "..."}
              className="bg-obsidian border border-border rounded-lg px-4 py-2 text-sm text-fg placeholder-dim focus:outline-none focus:border-crimson transition-colors w-48"
            />
            <Button type="submit" size="sm">{t("search")}</Button>
          </form>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="relative"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t("filter")}
            {selectedGenres.size > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-crimson text-white text-[10px] font-bold flex items-center justify-center">
                {selectedGenres.size}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-midnight border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t("genre")}</p>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => {
              const active = selectedGenres.has(g.genre_id);
              return (
                <button
                  key={g.genre_id}
                  onClick={() => toggleGenre(g.genre_id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-crimson text-white shadow-sm"
                      : "bg-obsidian text-muted border border-border hover:border-crimson"
                  }`}
                >
                  {active && <span className="mr-1">✓</span>}
                  {g.genre_name}
                </button>
              );
            })}
          </div>

          {selectedGenres.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-muted">Seçili:</span>
              {Array.from(selectedGenres).map((id) => {
                const g = genres.find((x) => x.genre_id === id);
                return g ? (
                  <span key={id} className="flex items-center gap-1 px-2 py-0.5 bg-crimson/15 border border-crimson/30 rounded-full text-xs text-crimson">
                    {g.genre_name}
                    <button onClick={() => toggleGenre(id)} className="hover:text-white transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-crimson hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" /> {t("clearFilters")}
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : animes.length === 0 ? (
        <div className="text-center py-20 text-dim">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-heading">{t("noResults")}</p>
          <p className="text-sm mt-1">{t("noResultsHint")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animes.map((anime) => (
              <AnimeCard
                key={anime.anime_id}
                anime={anime}
                isFavorited={favorites.has(anime.anime_id)}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
            {loadingMore &&
              Array.from({ length: 6 }).map((_, i) => <AnimeCardSkeleton key={`more-${i}`} />)}
          </div>

          <div ref={sentinelRef} aria-hidden="true" className="h-4" />

          {!hasMore && (
            <p className="text-center text-xs text-dim py-2">{t("allLoaded")}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-crimson animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
