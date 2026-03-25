"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { userApi, animeApi, getErrorMessage } from "@/lib/api";
import { AnimeCard } from "@/components/AnimeCard";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Favorite, Anime } from "@/types";

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [animeMap, setAnimeMap] = useState<Map<number, Anime>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const favs = await userApi.getFavorites();
        setFavorites(favs);

        // Load anime details for each favorite
        const animeDetails = await Promise.all(
          favs.map((f) => animeApi.get(f.anime_id).catch(() => null))
        );
        const map = new Map<number, Anime>();
        animeDetails.forEach((a) => {
          if (a) map.set(a.anime_id, a);
        });
        setAnimeMap(map);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const removeFavorite = async (animeId: number) => {
    try {
      await userApi.removeFavorite(animeId);
      setFavorites((prev) => prev.filter((f) => f.anime_id !== animeId));
      toast.success("Favorilerden cikarildi.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleFavoriteChange = (animeId: number, isFav: boolean) => {
    if (!isFav) {
      setFavorites((prev) => prev.filter((f) => f.anime_id !== animeId));
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-crimson animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-crimson/10 border border-crimson/30 flex items-center justify-center">
          <Heart className="w-5 h-5 text-crimson" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#F0F0F5]">Favorilerim</h1>
          <p className="text-[#8A8AA8] text-sm">
            {loading ? "Yukleniyor..." : `${favorites.length} anime`}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-crimson animate-spin" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 text-[#4A4A6A] space-y-3">
          <Heart className="w-12 h-12 mx-auto text-[#2A2A42]" />
          <p className="font-heading text-lg">Henuz favori anime eklemediniz</p>
          <p className="text-sm">Begendginiz animeleri favorilere ekleyerek buradan kolayca erisebilirsiniz.</p>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mt-2">Anime Kesfet</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {favorites.map((fav) => {
            const anime = animeMap.get(fav.anime_id);
            if (anime) {
              return (
                <AnimeCard
                  key={fav.favorite_id}
                  anime={anime}
                  isFavorited={true}
                  onFavoriteChange={handleFavoriteChange}
                />
              );
            }
            // Fallback if anime detail couldn't load
            return (
              <div
                key={fav.favorite_id}
                className="bg-midnight border border-border rounded-xl p-4 space-y-2"
              >
                <Link
                  href={`/anime/${fav.anime_id}`}
                  className="text-[#F0F0F5] hover:text-crimson transition-colors font-medium text-sm"
                >
                  Anime #{fav.anime_id}
                </Link>
                <p className="text-xs text-[#4A4A6A]">{formatDate(fav.created_at)}</p>
                <button
                  onClick={() => removeFavorite(fav.anime_id)}
                  className="flex items-center gap-1 text-xs text-[#4A4A6A] hover:text-crimson transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Kaldir
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
