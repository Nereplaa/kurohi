"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, BookOpen, Tv } from "lucide-react";
import { useTranslations } from "next-intl";
import { animeApi } from "@/lib/api";
import type { Anime } from "@/types";

/* ─── Skeleton ─────────────────────────────────────────────────────────── */
function BannerSkeleton() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-[#0f0f1a] border border-border animate-pulse">
      <div className="flex flex-col sm:flex-row min-h-[420px]">
        {/* left */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center gap-4">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-white/10" />
            <div className="h-5 w-12 rounded-full bg-white/10" />
          </div>
          <div className="space-y-2">
            <div className="h-9 w-4/5 rounded bg-white/10" />
            <div className="h-9 w-3/5 rounded bg-white/10" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-5/6 rounded bg-white/10" />
            <div className="h-3 w-4/6 rounded bg-white/10" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-28 rounded-xl bg-white/10" />
            <div className="h-10 w-24 rounded-xl bg-white/10" />
          </div>
        </div>
        {/* right */}
        <div className="sm:w-[42%] flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-[220px] aspect-[3/4] rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/* ─── Genre chip colors (cycles through a palette) ─────────────────────── */
const CHIP_COLORS = [
  "bg-crimson/20 border-crimson/40 text-crimson",
  "bg-violet/20 border-violet/40 text-violet",
  "bg-cyan/20 border-cyan/40 text-cyan",
  "bg-amber-500/20 border-amber-500/40 text-amber-400",
  "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
];

/* ─── Main component ────────────────────────────────────────────────────── */
export function FeaturedBanner() {
  const [items, setItems] = useState<Anime[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations("featured");

  useEffect(() => {
    animeApi
      .getFeatured()
      .then((data) => { setItems(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const prev = () => setCurrent((c) => (c - 1 + items.length) % items.length);

  useEffect(() => {
    if (items.length < 2) return;
    timerRef.current = setTimeout(next, 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, items.length, next]);

  if (!loaded) return <BannerSkeleton />;
  if (items.length === 0) return null;

  const totalSeasons = (a: Anime) => a.seasons?.length ?? 0;
  const totalEps = (a: Anime) =>
    a.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border/60 group"
      style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #12122a 60%, #0f0f1e 100%)" }}
    >
      {/* ── Slides ───────────────────────────────────────────────────────── */}
      {/* Wrapper gives the banner its height; slides are stacked via grid */}
      <div className="relative min-h-[400px] sm:min-h-[420px]">
        {items.map((anime, i) => (
          <div
            key={anime.anime_id}
            aria-hidden={i !== current}
            className="absolute inset-0 flex flex-col sm:flex-row transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0, pointerEvents: i === current ? "auto" : "none" }}
          >
            {/* ── Left column ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-10 lg:px-14 gap-4 order-2 sm:order-1">

              {/* Genre chips */}
              <div className="flex flex-wrap gap-2">
                {anime.genres.slice(0, 4).map((g, idx) => (
                  <span
                    key={g.genre_id}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}
                  >
                    {g.genre_name}
                  </span>
                ))}
                {anime.age_rating && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-white/5 border-white/15 text-white/60">
                    {anime.age_rating}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2
                className="font-heading font-black text-white leading-tight"
                style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.75rem)", lineHeight: 1.15 }}
              >
                <span className="line-clamp-3">{anime.title}</span>
              </h2>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-xs text-white/50 font-medium">
                {anime.release_year && <span>{anime.release_year}</span>}
                {totalSeasons(anime) > 0 && (
                  <span className="flex items-center gap-1">
                    <Tv className="w-3 h-3" />
                    {totalSeasons(anime)} Sezon
                  </span>
                )}
                {totalEps(anime) > 0 && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {totalEps(anime)} Bölüm
                  </span>
                )}
              </div>

              {/* Description */}
              {anime.description && (
                <p className="text-sm text-white/55 line-clamp-3 leading-relaxed max-w-md">
                  {anime.description}
                </p>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <Link
                  href={`/anime/${anime.anime_id}`}
                  className="flex items-center gap-2 bg-crimson hover:bg-red-600 active:scale-95 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-crimson/25"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {t("watch")}
                </Link>
                <Link
                  href={`/anime/${anime.anime_id}`}
                  className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all border border-white/20 hover:border-white/40 hover:bg-white/5"
                >
                  {t("details")}
                </Link>
              </div>

              {/* Dot indicators */}
              {items.length > 1 && (
                <div className="flex items-center gap-2 pt-2">
                  {items.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrent(idx)}
                      aria-label={`Slayt ${idx + 1}`}
                      className={`rounded-full transition-all duration-300 ${
                        idx === current
                          ? "w-6 h-2 bg-crimson"
                          : "w-2 h-2 bg-white/25 hover:bg-white/50"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-white/30 font-mono">
                    {current + 1}/{items.length}
                  </span>
                </div>
              )}
            </div>

            {/* ── Right column — poster ─────────────────────────────────── */}
            <div className="sm:w-[42%] flex items-center justify-center px-6 py-6 sm:py-8 lg:px-10 order-1 sm:order-2">
              <div className="relative w-full flex items-center justify-center">
                {anime.cover_image_url ? (
                  <img
                    src={anime.cover_image_url}
                    alt={anime.title}
                    className="rounded-xl object-contain max-h-[260px] sm:max-h-[340px] w-auto"
                    style={{
                      filter: "drop-shadow(0 0 28px rgba(108,92,231,0.45)) drop-shadow(0 8px 20px rgba(0,0,0,0.7))",
                    }}
                  />
                ) : (
                  /* Fallback placeholder */
                  <div
                    className="w-[180px] sm:w-[220px] aspect-[3/4] rounded-xl flex items-center justify-center text-4xl"
                    style={{ background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)" }}
                  >
                    🎬
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Arrow buttons (hover-visible) ────────────────────────────────── */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Önceki"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Sonraki"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
