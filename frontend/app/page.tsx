"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { animeApi, genreApi, getErrorMessage } from "@/lib/api";
import { AnimeCard } from "@/components/AnimeCard";
import { Button } from "@/components/ui/Button";
import { userApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import type { Anime, Genre, Favorite } from "@/types";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const LIMIT = 24;

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const loadAnimes = useCallback(async (reset = false) => {
    const currentSkip = reset ? 0 : skip;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const data = await animeApi.list({
        skip: currentSkip,
        limit: LIMIT,
        search: search || undefined,
        genre_id: selectedGenre,
      });
      if (reset) {
        setAnimes(data);
        setSkip(LIMIT);
      } else {
        setAnimes(prev => [...prev, ...data]);
        setSkip(prev => prev + LIMIT);
      }
      setHasMore(data.length === LIMIT);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, selectedGenre, skip]);

  useEffect(() => {
    genreApi.list().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    loadAnimes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedGenre]);

  useEffect(() => {
    if (!user) return;
    userApi.getFavorites()
      .then((favs: Favorite[]) => setFavorites(new Set(favs.map(f => f.anime_id))))
      .catch(() => {});
  }, [user]);

  const handleFavoriteChange = (animeId: number, isFav: boolean) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.add(animeId); else next.delete(animeId);
      return next;
    });
  };

  const applySearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
    setSearch(q);
    router.push(q ? `/?search=${encodeURIComponent(q)}` : "/");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#F0F0F5]">Anime Keşfet</h1>
          <p className="text-[#8A8AA8] text-sm mt-0.5">{animes.length > 0 ? `${animes.length} sonuç gösteriliyor` : ""}</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <form onSubmit={applySearch} className="flex gap-2">
            <input
              name="q"
              defaultValue={search}
              placeholder="Anime ara..."
              className="bg-obsidian border border-border rounded-lg px-4 py-2 text-sm text-[#F0F0F5] placeholder-[#4A4A6A] focus:outline-none focus:border-crimson transition-colors w-48"
            />
            <Button type="submit" size="sm">Ara</Button>
          </form>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal className="w-4 h-4" />
            Filtre
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-midnight border border-border rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-[#8A8AA8] uppercase tracking-wider mb-2">Tür</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGenre(undefined)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedGenre ? "bg-crimson text-white" : "bg-obsidian text-[#8A8AA8] border border-border hover:border-crimson"}`}
              >Tümü</button>
              {genres.map(g => (
                <button
                  key={g.genre_id}
                  onClick={() => setSelectedGenre(selectedGenre === g.genre_id ? undefined : g.genre_id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedGenre === g.genre_id ? "bg-crimson text-white" : "bg-obsidian text-[#8A8AA8] border border-border hover:border-crimson"}`}
                >{g.genre_name}</button>
              ))}
            </div>
          </div>
          {(search || selectedGenre) && (
            <button onClick={() => { setSearch(""); setSelectedGenre(undefined); }} className="flex items-center gap-1 text-xs text-crimson hover:text-red-400 transition-colors">
              <X className="w-3 h-3" /> Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
      ) : animes.length === 0 ? (
        <div className="text-center py-20 text-[#4A4A6A]">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-heading">Sonuç bulunamadı</p>
          <p className="text-sm mt-1">Farklı bir arama deneyin</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animes.map(anime => (
              <AnimeCard
                key={anime.anime_id}
                anime={anime}
                isFavorited={favorites.has(anime.anime_id)}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="ghost" loading={loadingMore} onClick={() => loadAnimes(false)}>
                Daha Fazla Yükle
              </Button>
            </div>
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
