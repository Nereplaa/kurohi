import { Star, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  username?: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  maxLines?: number;
}

export function ReviewCard({ username, rating, comment, createdAt, maxLines = 3 }: ReviewCardProps) {
  const timeAgo = formatTimeAgo(createdAt);

  return (
    <div className="bg-anime-bg-secondary rounded-lg p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-anime-accent/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-anime-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-anime-text">{username ?? "Anonim"}</p>
            {/* Star rating */}
            <div className="flex items-center gap-0.5 mt-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3 h-3",
                    i < rating ? "fill-anime-gold text-anime-gold" : "text-anime-bg-surface"
                  )}
                />
              ))}
              <span className="ml-1.5 text-xs font-bold text-anime-gold">{rating}/10</span>
            </div>
          </div>
        </div>
        <span className="text-xs text-anime-text-tertiary">{timeAgo}</span>
      </div>

      {/* Comment */}
      {comment && (
        <p
          className="text-sm text-anime-text-secondary leading-relaxed"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {comment}
        </p>
      )}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "az once";
  if (minutes < 60) return `${minutes} dk once`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat once`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gun once`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay once`;

  return `${Math.floor(months / 12)} yil once`;
}
