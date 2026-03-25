"use client";
import Link from "next/link";
import Image from "next/image";
import { Star, Heart, HeartOff } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { userApi, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import type { Anime } from "@/types";

interface AnimeCardProps {
  anime: Anime;
  isFavorited?: boolean;
  onFavoriteChange?: (animeId: number, isFav: boolean) => void;
}

export function AnimeCard({ anime, isFavorited = false, onFavoriteChange }: AnimeCardProps) {
  const { user } = useAuthStore();
  const [fav, setFav] = useState(isFavorited);
  const [loading, setLoading] = useState(false);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Favorilere eklemek icin giris yapin."); return; }
    setLoading(true);
    try {
      if (fav) {
        await userApi.removeFavorite(anime.anime_id);
        setFav(false);
        toast.success("Favorilerden cikarildi.");
      } else {
        await userApi.addFavorite(anime.anime_id);
        setFav(true);
        toast.success("Favorilere eklendi!");
      }
      onFavoriteChange?.(anime.anime_id, !fav);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const hasPremium = anime.seasons?.some(s => s.episodes?.some(e => e.is_premium));
  const totalEps = anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;

  return (
    <Link href={`/anime/${anime.anime_id}`} className="group block">
      <div className="bg-anime-bg-secondary rounded-lg overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1 hover:shadow-md cursor-pointer">
        {/* Cover - 3:4 aspect ratio */}
        <div className="relative aspect-[3/4] bg-anime-bg-surface">
          {anime.cover_image_url ? (
            <Image
              src={anime.cover_image_url}
              alt={anime.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 185px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-anime-text-tertiary">
              <span className="text-4xl">🎬</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-anime-bg-primary/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Favorite button */}
          <button
            onClick={toggleFavorite}
            disabled={loading}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-anime-pink disabled:opacity-50"
          >
            {fav ? <Heart className="w-4 h-4 fill-anime-pink text-anime-pink" /> : <HeartOff className="w-4 h-4" />}
          </button>

          {/* Premium badge */}
          {hasPremium && (
            <div className="absolute top-2 left-2">
              <Badge variant="premium">Premium</Badge>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Genre badges */}
          {anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {anime.genres.slice(0, 2).map(g => (
                <Badge key={g.genre_id} variant="genre">{g.genre_name}</Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="font-heading text-base font-semibold text-anime-text leading-tight line-clamp-2 mb-1">
            {anime.title}
          </h3>

          {/* Meta */}
          <p className="text-[13px] text-anime-text-secondary">
            {[
              anime.release_year,
              totalEps > 0 ? `${totalEps} Bolum` : null,
            ].filter(Boolean).join(" | ")}
          </p>
        </div>
      </div>
    </Link>
  );
}
