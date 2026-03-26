export function AnimeCardSkeleton() {
  return (
    <div className="block">
      <div className="bg-anime-bg-secondary rounded-lg overflow-hidden animate-pulse">
        {/* Cover — matches 3:4 aspect ratio of AnimeCard */}
        <div className="relative aspect-[3/4] bg-obsidian" />

        {/* Body */}
        <div className="p-4 space-y-2">
          {/* Genre badge placeholder */}
          <div className="flex gap-1">
            <div className="h-4 w-12 rounded-full bg-obsidian" />
            <div className="h-4 w-10 rounded-full bg-obsidian" />
          </div>
          {/* Title placeholder — two lines */}
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded bg-obsidian" />
            <div className="h-4 w-3/4 rounded bg-obsidian" />
          </div>
          {/* Meta placeholder */}
          <div className="h-3 w-1/2 rounded bg-obsidian" />
        </div>
      </div>
    </div>
  );
}
