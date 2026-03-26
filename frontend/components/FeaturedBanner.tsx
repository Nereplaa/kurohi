"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, BookOpen, Tv, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { animeApi } from "@/lib/api";
import type { Anime } from "@/types";

/* ─── Skeleton ─────────────────────────────────────────────────────────── */
function BannerSkeleton() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-[#0f0f1a] border border-border animate-pulse">
      <div className="flex flex-col sm:flex-row min-h-[420px]">
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
        <div className="sm:w-[42%] flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-[220px] aspect-[3/4] rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/* ─── Genre chip color palette ──────────────────────────────────────────── */
const CHIP_COLORS = [
  "bg-crimson/20 border-crimson/40 text-crimson",
  "bg-violet/20 border-violet/40 text-violet",
  "bg-cyan/20 border-cyan/40 text-cyan",
  "bg-amber-500/20 border-amber-500/40 text-amber-400",
  "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
];

/* ─── Hover-modal portal ────────────────────────────────────────────────── */
interface DescModalProps {
  anime: Anime;
  open: boolean;
  onCardMouseEnter: () => void;
  onCardMouseLeave: () => void;
  t: ReturnType<typeof useTranslations>;
  totalSeasons: number;
  totalEps: number;
}

function DescModal({ anime, open, onCardMouseEnter, onCardMouseLeave, t, totalSeasons, totalEps }: DescModalProps) {
  // Keep in DOM always for smooth close animation; portal is always mounted
  return (
    <>
      {/* ── Full-screen backdrop ── */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          pointerEvents: "none",
          background: open ? "var(--modal-scrim-bg)" : "transparent",
          backdropFilter: open ? "var(--modal-scrim-filter)" : "blur(0px)",
          transition: open
            ? "background 320ms ease, backdrop-filter 320ms ease"
            : "background 220ms ease, backdrop-filter 220ms ease",
        }}
      />

      {/* ── Centered card ── */}
      {/* Container: only for centering — never captures mouse events */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          pointerEvents: "none",          // transparent to mouse at all times
        }}
      >
        {/* Inner card: the ONLY element that captures mouse events */}
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`${anime.title} açıklaması`}
          onMouseEnter={onCardMouseEnter}
          onMouseLeave={onCardMouseLeave}
          style={{
            width: "100%",
            maxWidth: "540px",
            pointerEvents: open ? "auto" : "none",
            opacity: open ? 1 : 0,
            transform: open
              ? "translateY(0) scale(1)"
              : "translateY(22px) scale(0.93)",
            transition: open
              ? "opacity 300ms ease, transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "opacity 200ms ease, transform 180ms cubic-bezier(0.55, 0, 1, 0.45)",
            background: "var(--modal-card-bg)",
            backdropFilter: "blur(24px)",
            borderRadius: "20px",
            border: "1px solid var(--modal-card-border)",
            boxShadow: `0 0 0 1px var(--modal-card-ring), var(--modal-card-shadow)`,
            overflow: "hidden",
          }}
        >
          {/* Card header strip */}
          <div style={{
            height: "3px",
            background: "linear-gradient(90deg, #dc143c 0%, #6c5ce7 50%, transparent 100%)",
          }} />

          <div style={{ padding: "1.75rem 1.75rem 1.5rem" }}>
            {/* Anime title */}
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--modal-label)", marginBottom: "0.4rem" }}>
                Konu
              </p>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--modal-heading)", lineHeight: 1.3 }}>
                {anime.title}
              </h3>
            </div>

            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {anime.release_year && (
                <span style={{ fontSize: "12px", color: "var(--modal-meta)", fontWeight: 500 }}>
                  {anime.release_year}
                </span>
              )}
              {totalSeasons > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--modal-meta)", fontWeight: 500 }}>
                  <Tv style={{ width: 12, height: 12 }} />
                  {totalSeasons} Sezon
                </span>
              )}
              {totalEps > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--modal-meta)", fontWeight: 500 }}>
                  <BookOpen style={{ width: 12, height: 12 }} />
                  {totalEps} Bölüm
                </span>
              )}
              {anime.age_rating && (
                <span className="modal-badge" style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: 99, border: "1px solid var(--modal-badge-border)", color: "var(--modal-badge-fg)" }}>
                  {anime.age_rating}
                </span>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "var(--modal-divider)", marginBottom: "1.1rem" }} />

            {/* Full description — scrollable for very long text */}
            <div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "1.25rem", paddingRight: "4px" }}>
              <p style={{
                fontSize: "14px",
                lineHeight: 1.85,
                letterSpacing: "0.012em",
                color: "var(--modal-body)",
              }}>
                {anime.description}
              </p>
            </div>

            {/* Genre chips */}
            {anime.genres.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "1.25rem" }}>
                {anime.genres.map((g, idx) => (
                  <span
                    key={g.genre_id}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}
                  >
                    {g.genre_name}
                  </span>
                ))}
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <Link
                href={`/anime/${anime.anime_id}`}
                className="flex items-center gap-2 bg-crimson hover:bg-red-600 active:scale-95 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                style={{ boxShadow: "0 4px 20px rgba(220,20,60,0.35)" }}
              >
                <Play style={{ width: 14, height: 14, fill: "white" }} />
                {t("watch")}
              </Link>
              <Link
                href={`/anime/${anime.anime_id}`}
                className="modal-ghost-btn flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all border"
              >
                {t("details")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export function FeaturedBanner() {
  const [items, setItems]     = useState<Anime[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded]   = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [mounted, setMounted]   = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carouselTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations("featured");

  useEffect(() => { setMounted(true); }, []);

  // Close modal when slide changes
  useEffect(() => { setDescOpen(false); }, [current]);

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

  // Pause carousel while modal is open
  useEffect(() => {
    if (items.length < 2 || descOpen) return;
    carouselTimer.current = setTimeout(next, 6000);
    return () => { if (carouselTimer.current) clearTimeout(carouselTimer.current); };
  }, [current, items.length, next, descOpen]);

  /* ── Hover helpers ───────────────────────────────────────────────────── */
  const scheduleClose = (delay: number) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setDescOpen(false), delay);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  };

  if (!loaded) return <BannerSkeleton />;
  if (items.length === 0) return null;

  const anime = items[current];
  const totalSeasons = anime.seasons?.length ?? 0;
  const totalEps = anime.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0;

  return (
    <>
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-border/60 group"
        style={{ background: "var(--banner-bg)" }}
      >
        {/* ── Slides ─────────────────────────────────────────────────────── */}
        <div className="relative min-h-[500px] sm:min-h-[560px]">
          {items.map((a, i) => (
            <div
              key={a.anime_id}
              aria-hidden={i !== current}
              className="absolute inset-0 flex flex-col sm:flex-row transition-opacity duration-700 ease-in-out"
              style={{
                opacity: i === current ? 1 : 0,
                zIndex: i === current ? 1 : 0,
                pointerEvents: i === current ? "auto" : "none",
              }}
            >
              {/* ── Left column ─────────────────────────────────────────── */}
              <div className="flex-1 flex flex-col px-7 sm:px-10 lg:px-14 py-8 sm:py-10 order-2 sm:order-1">

                {/* ── Content group: flex-1 + justify-center → vertically centered ── */}
                <div className="flex-1 flex flex-col justify-center gap-4">

                  {/* Genre chips */}
                  <div className="flex flex-wrap gap-2">
                    {a.genres.slice(0, 4).map((g, idx) => (
                      <span
                        key={g.genre_id}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}
                      >
                        {g.genre_name}
                      </span>
                    ))}
                    {a.age_rating && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={{ background: "var(--banner-age-bg)", borderColor: "var(--banner-age-border)", color: "var(--banner-age-fg)" }}
                      >
                        {a.age_rating}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2
                    className="font-heading font-black leading-tight"
                    style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.75rem)", lineHeight: 1.15, color: "var(--banner-title)" }}
                  >
                    <span className="line-clamp-3">{a.title}</span>
                  </h2>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs font-medium" style={{ color: "var(--banner-meta)" }}>
                    {a.release_year && <span>{a.release_year}</span>}
                    {(a.seasons?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Tv className="w-3 h-3" />
                        {a.seasons!.length} Sezon
                      </span>
                    )}
                    {(a.seasons?.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0) ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {a.seasons!.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0)} Bölüm
                      </span>
                    )}
                  </div>

                  {/* Description — hover trigger (only for current slide) */}
                  {a.description && i === current && (
                    <div
                      className="group/desc relative max-w-md cursor-default select-none"
                      onMouseEnter={() => { cancelClose(); setDescOpen(true); }}
                      onMouseLeave={() => scheduleClose(250)}
                    >
                      <p
                        className="text-sm leading-relaxed line-clamp-3 transition-opacity duration-200 group-hover/desc:opacity-80"
                        style={{ color: "var(--banner-desc)" }}
                      >
                        {a.description}
                      </p>
                      <span className="mt-1.5 flex items-center gap-1.5 opacity-0 group-hover/desc:opacity-100 transition-opacity duration-200 text-[11px] font-medium text-crimson/70">
                        <ScrollText className="w-3 h-3" />
                        Tümünü oku
                      </span>
                    </div>
                  )}

                  {/* Static description for non-current slides */}
                  {a.description && i !== current && (
                    <p className="text-sm leading-relaxed line-clamp-3 max-w-md" style={{ color: "var(--banner-desc)" }}>
                      {a.description}
                    </p>
                  )}
                </div>
                {/* ── End content group ──────────────────────────────────── */}

                {/* ── Actions group: pinned to bottom-left ───────────────── */}
                <div className="flex flex-col gap-3 pt-5">
                  {/* CTA buttons */}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/anime/${a.anime_id}`}
                      className="flex items-center gap-2 bg-crimson hover:bg-red-600 active:scale-95 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-crimson/25"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      {t("watch")}
                    </Link>
                    <Link
                      href={`/anime/${a.anime_id}`}
                      className="banner-ghost flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all border"
                    >
                      {t("details")}
                    </Link>
                  </div>

                  {/* Dot indicators */}
                  {items.length > 1 && (
                    <div className="flex items-center gap-2">
                      {items.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrent(idx)}
                          aria-label={`Slayt ${idx + 1}`}
                          className={`rounded-full transition-all duration-300 ${
                            idx === current ? "w-6 h-2 bg-crimson" : "w-2 h-2 banner-dot-inactive"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs font-mono" style={{ color: "var(--banner-dot-counter)" }}>
                        {current + 1}/{items.length}
                      </span>
                    </div>
                  )}
                </div>
                {/* ── End actions group ──────────────────────────────────── */}
              </div>

              {/* ── Right column — poster (fully centered, larger) ────── */}
              <div className="sm:w-[42%] flex items-center justify-center px-6 py-8 lg:px-10 order-1 sm:order-2">
                <div className="relative w-full flex items-center justify-center">
                  {a.cover_image_url ? (
                    <img
                      src={a.cover_image_url}
                      alt={a.title}
                      className="rounded-xl object-contain max-h-[300px] sm:max-h-[440px] w-auto"
                      style={{
                        filter: "var(--banner-poster-shadow)",
                      }}
                    />
                  ) : (
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

        {/* ── Arrow buttons ─────────────────────────────────────────────── */}
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

      {/* ── Portal modal — rendered at document.body, outside banner DOM ── */}
      {mounted && createPortal(
        <DescModal
          anime={anime}
          open={descOpen}
          onCardMouseEnter={cancelClose}
          onCardMouseLeave={() => scheduleClose(100)}
          t={t}
          totalSeasons={totalSeasons}
          totalEps={totalEps}
        />,
        document.body
      )}
    </>
  );
}
