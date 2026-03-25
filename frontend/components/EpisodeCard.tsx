"use client";
import Link from "next/link";
import { Play, Lock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Episode } from "@/types";

interface EpisodeCardProps {
  episode: Episode;
  animeId: number;
  isWatched?: boolean;
  onPlay?: (episodeId: number) => void;
}

export function EpisodeCard({ episode, animeId, isWatched = false, onPlay }: EpisodeCardProps) {
  const handlePlay = (e: React.MouseEvent) => {
    if (onPlay) {
      e.preventDefault();
      onPlay(episode.episode_id);
    }
  };

  return (
    <Link
      href={`/anime/${animeId}/watch/${episode.episode_id}`}
      className={cn(
        "group flex items-center gap-3 bg-anime-bg-secondary rounded-md p-3 transition-all duration-200 hover:bg-anime-bg-tertiary",
        isWatched && "border-l-[3px] border-l-anime-accent"
      )}
    >
      {/* Episode number */}
      <span className="text-anime-text-tertiary text-sm w-8 shrink-0 text-center font-medium">
        {episode.episode_number}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isWatched ? "text-anime-text-secondary" : "text-anime-text"
        )}>
          {episode.title ?? `Bolum ${episode.episode_number}`}
        </p>
        {episode.duration_seconds && (
          <p className="text-xs text-anime-text-tertiary mt-0.5">
            {formatDuration(episode.duration_seconds)}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        {episode.is_premium && (
          <Badge variant="premium">
            <Lock className="w-2.5 h-2.5 mr-1" />Premium
          </Badge>
        )}
        {isWatched && <CheckCircle className="w-4 h-4 text-anime-success" />}
      </div>

      {/* Play button */}
      <button
        onClick={handlePlay}
        className="p-2 rounded-full text-anime-text-tertiary opacity-0 group-hover:opacity-100 hover:text-anime-accent hover:bg-anime-accent/10 transition-all duration-200 shrink-0"
      >
        <Play className="w-4 h-4" />
      </button>
    </Link>
  );
}
