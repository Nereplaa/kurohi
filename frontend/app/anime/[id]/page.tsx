"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Heart, HeartOff, Star, Play, ChevronDown, ChevronUp,
  Lock, CheckCircle, Loader2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { animeApi, userApi, episodeApi, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatDate } from "@/lib/utils";
import type { Anime, Review, Favorite } from "@/types";

export default function AnimeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const animeId = Number(id);

  const [anime, setAnime] = useState<Anime | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [watchedEps, setWatchedEps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(8);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReviewId, setMyReviewId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [animeData, reviewData] = await Promise.all([
          animeApi.get(animeId),
          animeApi.getReviews(animeId),
        ]);
        setAnime(animeData);
        setReviews(reviewData);
        if (animeData.seasons.length > 0) setOpenSeason(animeData.seasons[0].season_id);
      } catch {
        toast.error("Anime yüklenemedi.");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [animeId, router]);

  useEffect(() => {
    if (!user) return;
    userApi.getFavorites().then((favs: Favorite[]) => {
      setIsFav(favs.some(f => f.anime_id === animeId));
    });
    userApi.getHistory().then(history => {
      setWatchedEps(new Set(history.filter(h => h.completed_flag).map(h => h.episode_id)));
    });
    userApi.getMyReviews().then(myRevs => {
      const mine = myRevs.find(r => r.anime_id === animeId);
      if (mine) { setMyReviewId(mine.review_id); setRating(mine.rating); setComment(mine.comment ?? ""); }
    });
  }, [user, animeId]);

  const toggleFav = async () => {
    if (!user) { toast.error("Giriş yapmanız gerekiyor."); return; }
    try {
      if (isFav) { await userApi.removeFavorite(animeId); setIsFav(false); toast.success("Favorilerden çıkarıldı."); }
      else { await userApi.addFavorite(animeId); setIsFav(true); toast.success("Favorilere eklendi!"); }
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleWatch = (episodeId: number) => {
    if (!user) { toast.error("Izlemek icin giris yapin."); router.push("/login"); return; }
    router.push(`/anime/${animeId}/watch/${episodeId}`);
  };

  const markWatched = async (episodeId: number) => {
    if (!user) return;
    try {
      await episodeApi.updateProgress(episodeId, { watched_duration: 999999, completed_flag: true });
      setWatchedEps(prev => new Set([...prev, episodeId]));
      toast.success("Bölüm izlendi olarak işaretlendi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const submitReview = async () => {
    if (!user) { toast.error("Yorum yapmak için giriş yapın."); return; }
    setSubmittingReview(true);
    try {
      if (myReviewId) {
        const updated = await userApi.updateReview(myReviewId, { rating, comment });
        setReviews(prev => prev.map(r => r.review_id === myReviewId ? updated : r));
        toast.success("Yorumunuz güncellendi.");
      } else {
        await userApi.createReview(animeId, { rating, comment });
        toast.success("Yorumunuz gönderildi, onay bekliyor.");
      }
      setShowReviewForm(false);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSubmittingReview(false); }
  };

  const deleteReview = async () => {
    if (!myReviewId) return;
    try {
      await userApi.deleteReview(myReviewId);
      setReviews(prev => prev.filter(r => r.review_id !== myReviewId));
      setMyReviewId(null); setRating(8); setComment("");
      toast.success("Yorum silindi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-crimson animate-spin" /></div>;
  if (!anime) return null;

  const totalEps = anime.seasons.reduce((acc, s) => acc + s.episodes.length, 0);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-midnight border border-border">
        {anime.cover_image_url && (
          <div className="absolute inset-0 opacity-20">
            <Image src={anime.cover_image_url} alt="" fill unoptimized className="object-cover blur-xl scale-110" />
          </div>
        )}
        <div className="relative flex flex-col md:flex-row gap-6 p-6 md:p-8">
          {/* Poster */}
          <div className="shrink-0">
            <div className="w-36 md:w-48 aspect-[2/3] relative rounded-xl overflow-hidden bg-obsidian border border-border">
              {anime.cover_image_url ? (
                <Image src={anime.cover_image_url} alt={anime.title} fill unoptimized className="object-cover" />
              ) : <div className="absolute inset-0 flex items-center justify-center text-4xl">🎬</div>}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-fg">{anime.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {anime.genres.map(g => <Badge key={g.genre_id}>{g.genre_name}</Badge>)}
                {anime.age_rating && <Badge variant="warning">{anime.age_rating}</Badge>}
                {anime.release_year && <Badge>{anime.release_year}</Badge>}
                <Badge>{totalEps} Bölüm</Badge>
              </div>
            </div>

            {anime.description && (
              <p className="text-muted text-sm leading-relaxed line-clamp-4">{anime.description}</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={toggleFav} variant={isFav ? "danger" : "ghost"} size="sm">
                {isFav ? <><Heart className="w-4 h-4 fill-current" /> Favorilerden Çıkar</> : <><HeartOff className="w-4 h-4" /> Favoriye Ekle</>}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowReviewForm(v => !v)}>
                <Star className="w-4 h-4" /> {myReviewId ? "Yorumu Düzenle" : "Yorum Yap"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Form */}
      {showReviewForm && user && (
        <div className="bg-midnight border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-heading text-lg font-semibold">{myReviewId ? "Yorumu Düzenle" : "Yorum Yap"}</h3>
          <div>
            <p className="text-sm text-muted mb-2">Puan: <span className="text-crimson font-bold">{rating}/10</span></p>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setRating(n)} className={`w-8 h-8 rounded text-sm font-semibold transition-colors ${n <= rating ? "bg-crimson text-white" : "bg-obsidian text-dim border border-border hover:border-crimson"}`}>{n}</button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Düşüncelerinizi yazın... (opsiyonel)"
            rows={3}
            className="w-full bg-obsidian border border-border rounded-lg px-4 py-2.5 text-sm text-fg placeholder-dim focus:outline-none focus:border-crimson resize-none"
          />
          <div className="flex gap-2">
            <Button onClick={submitReview} loading={submittingReview} size="sm">
              {myReviewId ? "Güncelle" : "Gönder"}
            </Button>
            {myReviewId && <Button onClick={deleteReview} variant="danger" size="sm"><Trash2 className="w-3.5 h-3.5" /> Sil</Button>}
            <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>İptal</Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Seasons & Episodes */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-heading text-2xl font-bold text-fg">Bölümler</h2>
          {anime.seasons.length === 0 ? (
            <div className="bg-midnight border border-border rounded-xl p-6 text-center text-dim">Henüz bölüm eklenmemiş.</div>
          ) : (
            anime.seasons.map(season => (
              <div key={season.season_id} className="bg-midnight border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenSeason(openSeason === season.season_id ? null : season.season_id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-obsidian transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-semibold text-fg">
                      {season.season_title ?? `${season.season_number}. Sezon`}
                    </span>
                    <Badge>{season.episodes.length} bölüm</Badge>
                  </div>
                  {openSeason === season.season_id ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </button>

                {openSeason === season.season_id && (
                  <div className="border-t border-border divide-y divide-border">
                    {season.episodes.map(ep => (
                      <div key={ep.episode_id} className={`flex items-center gap-3 px-5 py-3 hover:bg-obsidian/50 transition-colors ${watchedEps.has(ep.episode_id) ? "opacity-60" : ""}`}>
                        <span className="text-dim text-sm w-8 shrink-0">{ep.episode_number}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-fg truncate">{ep.title ?? `Bölüm ${ep.episode_number}`}</p>
                          {ep.duration_seconds && <p className="text-xs text-dim">{formatDuration(ep.duration_seconds)}</p>}
                        </div>
                        {ep.is_premium && <Badge variant="premium"><Lock className="w-2.5 h-2.5 mr-1" />Premium</Badge>}
                        {watchedEps.has(ep.episode_id) && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleWatch(ep.episode_id)}>
                            <Play className="w-3.5 h-3.5" />
                          </Button>
                          {user && !watchedEps.has(ep.episode_id) && (
                            <Button size="sm" variant="ghost" onClick={() => markWatched(ep.episode_id)} title="İzlendi olarak işaretle">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reviews */}
        <div className="space-y-3">
          <h2 className="font-heading text-2xl font-bold text-fg">Yorumlar</h2>
          {reviews.length === 0 ? (
            <div className="bg-midnight border border-border rounded-xl p-5 text-center text-dim text-sm">
              Henüz yorum yok. İlk yorumu sen yap!
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.review_id} className="bg-midnight border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-dimmer"}`} />
                    ))}
                    <span className="ml-1 text-xs font-bold text-amber-400">{review.rating}/10</span>
                  </div>
                  <span className="text-xs text-dim">{formatDate(review.created_at)}</span>
                </div>
                {review.comment && <p className="text-sm text-muted">{review.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
