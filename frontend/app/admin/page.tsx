"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Film, Shield, Plus, Ban, Loader2,
  Check, X, Trash2, ChevronDown, ChevronUp,
  Star, MessageSquare, Lock, UserCog, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, useIsAdmin, useIsContentManager } from "@/store/auth";
import { animeApi, genreApi, adminApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { User, Anime, Genre, Review, Season } from "@/types";

type Tab = "anime" | "genres" | "users" | "reviews";

// ──────────────────────────────────────────────────────────
// Sezon + Bölüm yönetim paneli (bir anime satırına eklenir)
// ──────────────────────────────────────────────────────────
function SeasonManager({ anime, genres }: { anime: Anime; genres: Genre[] }) {
  const [open, setOpen] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>(anime.seasons ?? []);
  const [seasonForm, setSeasonForm] = useState({ season_number: "", season_title: "" });
  const [savingSeason, setSavingSeason] = useState(false);

  // Bölüm formu — hangi sezon seçili
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [epForm, setEpForm] = useState({
    episode_number: "", title: "", video_url: "", is_premium: false, duration_seconds: "",
  });
  const [savingEp, setSavingEp] = useState(false);

  const addSeason = async () => {
    if (!seasonForm.season_number) return;
    setSavingSeason(true);
    try {
      const s = await adminApi.createSeason(anime.anime_id, {
        season_number: Number(seasonForm.season_number),
        season_title: seasonForm.season_title || undefined,
      });
      setSeasons((prev) => [...prev, s]);
      setSeasonForm({ season_number: "", season_title: "" });
      toast.success("Sezon eklendi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingSeason(false); }
  };

  const addEpisode = async () => {
    if (!selectedSeasonId || !epForm.episode_number) return;
    setSavingEp(true);
    try {
      const ep = await adminApi.createEpisode(selectedSeasonId, {
        episode_number: Number(epForm.episode_number),
        title: epForm.title || undefined,
        video_url: epForm.video_url || undefined,
        is_premium: epForm.is_premium,
        duration_seconds: epForm.duration_seconds ? Number(epForm.duration_seconds) : undefined,
      });
      setSeasons((prev) =>
        prev.map((s) =>
          s.season_id === selectedSeasonId
            ? { ...s, episodes: [...(s.episodes ?? []), ep] }
            : s
        )
      );
      setEpForm({ episode_number: "", title: "", video_url: "", is_premium: false, duration_seconds: "" });
      toast.success("Bölüm eklendi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingEp(false); }
  };

  const deleteEpisode = async (epId: number, seasonId: number) => {
    try {
      await adminApi.deleteEpisode(epId);
      setSeasons((prev) =>
        prev.map((s) =>
          s.season_id === seasonId
            ? { ...s, episodes: (s.episodes ?? []).filter((e) => e.episode_id !== epId) }
            : s
        )
      );
      toast.success("Bölüm silindi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted hover:text-fg transition-colors"
      >
        <span>Sezon & Bölüm Yönetimi</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Sezon Ekle */}
          <div className="bg-obsidian rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Yeni Sezon</p>
            <div className="flex gap-2 flex-wrap">
              <Input
                label="Sezon No *"
                type="number"
                value={seasonForm.season_number}
                onChange={(e) => setSeasonForm((p) => ({ ...p, season_number: e.target.value }))}
                placeholder="1"
                className="w-24"
              />
              <Input
                label="Sezon Adı"
                value={seasonForm.season_title}
                onChange={(e) => setSeasonForm((p) => ({ ...p, season_title: e.target.value }))}
                placeholder="1. Sezon (opsiyonel)"
                className="flex-1"
              />
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={addSeason}
                  loading={savingSeason}
                  disabled={!seasonForm.season_number}
                >
                  <Plus className="w-3.5 h-3.5" /> Ekle
                </Button>
              </div>
            </div>
          </div>

          {/* Sezonlar Listesi */}
          {seasons.length > 0 && (
            <div className="space-y-3">
              {seasons.map((season) => (
                <div key={season.season_id} className="bg-obsidian rounded-xl overflow-hidden">
                  <button
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${selectedSeasonId === season.season_id ? "bg-crimson/10 text-crimson" : "text-fg hover:bg-midnight"}`}
                    onClick={() => setSelectedSeasonId(selectedSeasonId === season.season_id ? null : season.season_id)}
                  >
                    <span>{season.season_title ?? `${season.season_number}. Sezon`}</span>
                    <Badge>{(season.episodes ?? []).length} bölüm</Badge>
                  </button>

                  {selectedSeasonId === season.season_id && (
                    <div className="border-t border-border p-3 space-y-3">
                      {/* Mevcut bölümler */}
                      {(season.episodes ?? []).length > 0 && (
                        <div className="divide-y divide-border">
                          {(season.episodes ?? []).map((ep) => (
                            <div key={ep.episode_id} className="flex items-center gap-2 py-1.5">
                              <span className="text-dim text-xs w-6">{ep.episode_number}.</span>
                              <span className="text-xs text-fg flex-1 truncate">
                                {ep.title ?? `Bölüm ${ep.episode_number}`}
                              </span>
                              {ep.is_premium && <Lock className="w-3 h-3 text-violet shrink-0" />}
                              <button
                                onClick={() => deleteEpisode(ep.episode_id, season.season_id)}
                                className="p-0.5 text-dim hover:text-crimson transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bölüm Ekle Formu */}
                      <div className="bg-midnight rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted">Yeni Bölüm Ekle</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            label="Bölüm No *"
                            type="number"
                            value={epForm.episode_number}
                            onChange={(e) => setEpForm((p) => ({ ...p, episode_number: e.target.value }))}
                            placeholder="1"
                          />
                          <Input
                            label="Başlık"
                            value={epForm.title}
                            onChange={(e) => setEpForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Bölüm adı"
                          />
                          <Input
                            label="Video URL"
                            value={epForm.video_url}
                            onChange={(e) => setEpForm((p) => ({ ...p, video_url: e.target.value }))}
                            placeholder="https://..."
                          />
                          <Input
                            label="Süre (saniye)"
                            type="number"
                            value={epForm.duration_seconds}
                            onChange={(e) => setEpForm((p) => ({ ...p, duration_seconds: e.target.value }))}
                            placeholder="1440"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={epForm.is_premium}
                              onChange={(e) => setEpForm((p) => ({ ...p, is_premium: e.target.checked }))}
                              className="accent-violet"
                            />
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Premium
                            </span>
                          </label>
                          <Button
                            size="sm"
                            onClick={addEpisode}
                            loading={savingEp}
                            disabled={!epForm.episode_number}
                          >
                            <Plus className="w-3.5 h-3.5" /> Bölüm Ekle
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Ana Admin Sayfası
// ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const isAdmin = useIsAdmin();
  const isCM = useIsContentManager();

  const [tab, setTab] = useState<Tab>("anime");
  const [users, setUsers] = useState<User[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  // Anime form
  const [showAnimeForm, setShowAnimeForm] = useState(false);
  const [animeForm, setAnimeForm] = useState({
    title: "", description: "", release_year: "", age_rating: "", cover_image_url: "", genre_ids: [] as number[],
  });
  const [savingAnime, setSavingAnime] = useState(false);

  // Genre form
  const [newGenre, setNewGenre] = useState("");
  const [savingGenre, setSavingGenre] = useState(false);

  // Subscription form
  const [subTarget, setSubTarget] = useState<number | null>(null);
  const [subForm, setSubForm] = useState({ plan_name: "", start_date: "", end_date: "" });
  const [savingSub, setSavingSub] = useState(false);

  // Role change
  const [roleTarget, setRoleTarget] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!isLoading && user && !isCM) { router.push("/"); toast.error("Bu sayfaya erişim yetkiniz yok."); }
  }, [user, isLoading, isCM, router]);

  const loadTab = useCallback(async () => {
    if (!user || !isCM) return;
    setLoading(true);
    try {
      if (tab === "anime") {
        const [a, g] = await Promise.all([animeApi.list({ limit: 100 }), genreApi.list()]);
        setAnimes(a); setGenres(g);
      } else if (tab === "genres") {
        setGenres(await genreApi.list());
      } else if (tab === "users" && isAdmin) {
        setUsers(await adminApi.listUsers());
      } else if (tab === "reviews") {
        setPendingReviews(await adminApi.getReviews({ review_status: "pending" }));
      }
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [tab, user, isCM, isAdmin]);

  useEffect(() => { loadTab(); }, [loadTab]);

  const banUser = async (userId: number) => {
    try {
      const u = await adminApi.updateUserStatus(userId, "banned");
      setUsers((prev) => prev.map((x) => (x.user_id === userId ? u : x)));
      toast.success("Kullanıcı banlandı.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const activateUser = async (userId: number) => {
    try {
      const u = await adminApi.updateUserStatus(userId, "active");
      setUsers((prev) => prev.map((x) => (x.user_id === userId ? u : x)));
      toast.success("Kullanıcı aktifleştirildi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const changeRole = async (userId: number, roleName: string) => {
    if (!roleName) return;
    try {
      const u = await adminApi.updateUserRole(userId, roleName);
      setUsers((prev) => prev.map((x) => (x.user_id === userId ? u : x)));
      setRoleTarget(null);
      setSelectedRole("");
      toast.success("Kullanıcı rolü güncellendi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const createAnime = async () => {
    setSavingAnime(true);
    try {
      const created = await animeApi.create({
        title: animeForm.title,
        description: animeForm.description || undefined,
        release_year: animeForm.release_year ? Number(animeForm.release_year) : undefined,
        age_rating: animeForm.age_rating || undefined,
        cover_image_url: animeForm.cover_image_url || undefined,
        genre_ids: animeForm.genre_ids,
      });
      setAnimes((prev) => [created, ...prev]);
      setShowAnimeForm(false);
      setAnimeForm({ title: "", description: "", release_year: "", age_rating: "", cover_image_url: "", genre_ids: [] });
      toast.success("Anime eklendi!");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingAnime(false); }
  };

  const deleteAnime = async (id: number) => {
    if (!confirm("Bu animeyi ve tüm içeriğini silmek istediğinize emin misiniz?")) return;
    try {
      await animeApi.delete(id);
      setAnimes((prev) => prev.filter((a) => a.anime_id !== id));
      toast.success("Anime silindi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const createGenre = async () => {
    if (!newGenre.trim()) return;
    setSavingGenre(true);
    try {
      const g = await genreApi.create(newGenre.trim());
      setGenres((prev) => [...prev, g]);
      setNewGenre("");
      toast.success("Tür eklendi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingGenre(false); }
  };

  const deleteGenre = async (id: number) => {
    try {
      await genreApi.delete(id);
      setGenres((prev) => prev.filter((g) => g.genre_id !== id));
      toast.success("Tür silindi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const assignSub = async () => {
    if (!subTarget) return;
    setSavingSub(true);
    try {
      await adminApi.createSubscription(subTarget, subForm);
      setSubTarget(null);
      setSubForm({ plan_name: "", start_date: "", end_date: "" });
      toast.success("Abonelik atandı.");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingSub(false); }
  };

  const moderateReview = async (reviewId: number, status: "approved" | "rejected") => {
    try {
      await adminApi.moderateReview(reviewId, status);
      setPendingReviews((prev) => prev.filter((r) => r.review_id !== reviewId));
      toast.success(status === "approved" ? "Yorum onaylandı." : "Yorum reddedildi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  if (!user || !isCM) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 text-crimson animate-spin" />
    </div>
  );

  const tabs = [
    { key: "anime" as Tab, label: "Animeler", icon: <Film className="w-4 h-4" /> },
    { key: "genres" as Tab, label: "Türler", icon: <Film className="w-4 h-4" /> },
    { key: "reviews" as Tab, label: "Yorumlar", icon: <MessageSquare className="w-4 h-4" /> },
    ...(isAdmin ? [{ key: "users" as Tab, label: "Kullanıcılar", icon: <Users className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-fg">Yönetim Paneli</h1>
          <p className="text-muted text-sm">
            {user.role.role_name === "admin" ? "Sistem Yöneticisi" : "İçerik Yöneticisi"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-midnight border border-border rounded-xl p-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-amber-500 text-black" : "text-muted hover:text-fg"
            }`}
          >
            {t.icon}{t.label}
            {t.key === "reviews" && pendingReviews.length > 0 && tab !== "reviews" && (
              <span className="ml-1 bg-crimson text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingReviews.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-crimson animate-spin" />
        </div>
      ) : (
        <>
          {/* ─── ANIME TAB ─────────────────────────────────────── */}
          {tab === "anime" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAnimeForm((v) => !v)}>
                  <Plus className="w-4 h-4" /> Anime Ekle
                </Button>
              </div>

              {showAnimeForm && (
                <div className="bg-midnight border border-border rounded-xl p-5 space-y-4">
                  <h3 className="font-heading text-lg font-semibold text-fg">Yeni Anime</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Başlık *" value={animeForm.title} onChange={(e) => setAnimeForm((p) => ({ ...p, title: e.target.value }))} placeholder="Attack on Titan" />
                    <Input label="Yıl" type="number" value={animeForm.release_year} onChange={(e) => setAnimeForm((p) => ({ ...p, release_year: e.target.value }))} placeholder="2013" />
                    <Input label="Yaş Sınırı" value={animeForm.age_rating} onChange={(e) => setAnimeForm((p) => ({ ...p, age_rating: e.target.value }))} placeholder="PG-13" />
                    <Input label="Kapak Görseli URL" value={animeForm.cover_image_url} onChange={(e) => setAnimeForm((p) => ({ ...p, cover_image_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <textarea
                    value={animeForm.description}
                    onChange={(e) => setAnimeForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Açıklama..."
                    rows={3}
                    className="w-full bg-obsidian border border-border rounded-lg px-4 py-2.5 text-sm text-fg placeholder-dim focus:outline-none focus:border-crimson resize-none"
                  />
                  <div>
                    <p className="text-sm text-muted mb-2">Türler</p>
                    <div className="flex flex-wrap gap-2">
                      {genres.map((g) => (
                        <button
                          key={g.genre_id}
                          onClick={() => setAnimeForm((p) => ({
                            ...p,
                            genre_ids: p.genre_ids.includes(g.genre_id)
                              ? p.genre_ids.filter((id) => id !== g.genre_id)
                              : [...p.genre_ids, g.genre_id],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                            animeForm.genre_ids.includes(g.genre_id)
                              ? "bg-crimson border-crimson text-white"
                              : "border-border text-muted hover:border-crimson"
                          }`}
                        >
                          {g.genre_name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createAnime} loading={savingAnime} disabled={!animeForm.title}>Kaydet</Button>
                    <Button variant="ghost" onClick={() => setShowAnimeForm(false)}>İptal</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {animes.map((a) => (
                  <div key={a.anime_id} className="bg-midnight border border-border rounded-xl overflow-hidden hover:border-crimson/30 transition-colors">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-fg font-medium text-sm truncate">{a.title}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {a.genres.slice(0, 3).map((g) => <Badge key={g.genre_id}>{g.genre_name}</Badge>)}
                          {a.release_year && <Badge>{a.release_year}</Badge>}
                          <Badge>{a.seasons?.length ?? 0} sezon</Badge>
                        </div>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => deleteAnime(a.anime_id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {/* Sezon/Bölüm yönetim paneli */}
                    <SeasonManager anime={a} genres={genres} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── GENRE TAB ─────────────────────────────────────── */}
          {tab === "genres" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  placeholder="Yeni tür adı..."
                  onKeyDown={(e) => e.key === "Enter" && createGenre()}
                  className="flex-1"
                />
                <Button onClick={createGenre} loading={savingGenre} disabled={!newGenre.trim()}>
                  <Plus className="w-4 h-4" /> Ekle
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {genres.map((g) => (
                  <div key={g.genre_id} className="flex items-center justify-between bg-midnight border border-border rounded-lg px-3 py-2">
                    <span className="text-sm text-fg">{g.genre_name}</span>
                    <button
                      onClick={() => deleteGenre(g.genre_id)}
                      className="p-0.5 text-dim hover:text-crimson transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── REVIEWS TAB ───────────────────────────────────── */}
          {tab === "reviews" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-fg">
                  Onay Bekleyen Yorumlar
                </h2>
                <Badge>{pendingReviews.length} yorum</Badge>
              </div>

              {pendingReviews.length === 0 ? (
                <div className="text-center py-16 text-dim">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-dimmer" />
                  <p className="text-sm">Onay bekleyen yorum bulunmuyor.</p>
                </div>
              ) : (
                pendingReviews.map((r) => (
                  <div key={r.review_id} className="bg-midnight border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-dim">Kullanıcı #{r.user_id}</span>
                          <span className="text-dim">•</span>
                          <span className="text-xs text-dim">Anime #{r.anime_id}</span>
                          <span className="text-dim">•</span>
                          <span className="text-xs text-dim">{formatDate(r.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 10 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-dimmer"}`}
                            />
                          ))}
                          <span className="ml-1 text-xs font-bold text-amber-400">{r.rating}/10</span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-muted bg-obsidian rounded-lg px-3 py-2 mt-1">
                            {r.comment}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => moderateReview(r.review_id, "approved")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-3.5 h-3.5" /> Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => moderateReview(r.review_id, "rejected")}
                        >
                          <X className="w-3.5 h-3.5" /> Reddet
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── USERS TAB ─────────────────────────────────────── */}
          {tab === "users" && isAdmin && (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.user_id} className="bg-midnight border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-fg font-medium text-sm">{u.name} {u.surname}</p>
                      <p className="text-dim text-xs">{u.email}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge>{u.role.role_name}</Badge>
                        <Badge variant={u.account_status === "active" ? "success" : "danger"}>
                          {u.account_status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {/* Rol Değiştir */}
                      {roleTarget === u.user_id ? (
                        <div className="flex gap-1 items-center">
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="bg-obsidian border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none focus:border-violet"
                          >
                            <option value="">Rol seç...</option>
                            <option value="member">Member</option>
                            <option value="content_manager">Content Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button size="sm" onClick={() => changeRole(u.user_id, selectedRole)} disabled={!selectedRole}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRoleTarget(null); setSelectedRole(""); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setRoleTarget(u.user_id); setSelectedRole(u.role.role_name); }}>
                          <UserCog className="w-3.5 h-3.5" /> Rol
                        </Button>
                      )}
                      {/* Abonelik Ata */}
                      {subTarget === u.user_id ? (
                        <div className="flex gap-1 items-center flex-wrap">
                          <Input
                            value={subForm.plan_name}
                            onChange={(e) => setSubForm((p) => ({ ...p, plan_name: e.target.value }))}
                            placeholder="Plan adı"
                            className="w-28 text-xs"
                          />
                          <input
                            type="date"
                            value={subForm.start_date}
                            onChange={(e) => setSubForm((p) => ({ ...p, start_date: e.target.value }))}
                            className="bg-obsidian border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none"
                          />
                          <input
                            type="date"
                            value={subForm.end_date}
                            onChange={(e) => setSubForm((p) => ({ ...p, end_date: e.target.value }))}
                            className="bg-obsidian border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none"
                          />
                          <Button size="sm" onClick={assignSub} loading={savingSub}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSubTarget(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setSubTarget(u.user_id)}>
                          Abonelik Ata
                        </Button>
                      )}
                      {u.user_id !== user.user_id && (
                        u.account_status === "active" ? (
                          <Button size="sm" variant="danger" onClick={() => banUser(u.user_id)}>
                            <Ban className="w-3.5 h-3.5" /> Ban
                          </Button>
                        ) : u.account_status === "banned" ? (
                          <Button size="sm" onClick={() => activateUser(u.user_id)} className="bg-green-600 hover:bg-green-700">
                            <ShieldCheck className="w-3.5 h-3.5" /> Aktifleştir
                          </Button>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
