"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Heart, Clock, Star, Loader2, Trash2, Edit2, Check, X, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { userApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Favorite, WatchHistory, Review, Subscription } from "@/types";

type Tab = "favorites" | "history" | "reviews" | "subscriptions";

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchMe, isLoading } = useAuthStore();

  const [tab, setTab] = useState<Tab>("favorites");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Password change state
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (user) { setEditName(user.name); setEditSurname(user.surname); setEditEmail(user.email); }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const loaders: Record<Tab, () => Promise<void>> = {
      favorites: async () => { setFavorites(await userApi.getFavorites()); },
      history: async () => { setHistory(await userApi.getHistory()); },
      reviews: async () => { setReviews(await userApi.getMyReviews()); },
      subscriptions: async () => { setSubscriptions(await userApi.getSubscriptions()); },
    };
    loaders[tab]().catch(err => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  }, [tab, user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile({ name: editName, surname: editSurname, email: editEmail });
      await fetchMe();
      setEditing(false);
      toast.success("Profil güncellendi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }
    setChangingPassword(true);
    try {
      await userApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      toast.success("Şifre başarıyla değiştirildi.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowPasswordCard(false);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setChangingPassword(false); }
  };

  const removeFavorite = async (animeId: number) => {
    try {
      await userApi.removeFavorite(animeId);
      setFavorites(prev => prev.filter(f => f.anime_id !== animeId));
      toast.success("Favorilerden çıkarıldı.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const deleteReview = async (reviewId: number) => {
    try {
      await userApi.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.review_id !== reviewId));
      toast.success("Yorum silindi.");
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-crimson animate-spin" /></div>;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "favorites", label: "Favoriler", icon: <Heart className="w-4 h-4" /> },
    { key: "history", label: "İzleme Geçmişi", icon: <Clock className="w-4 h-4" /> },
    { key: "reviews", label: "Yorumlarım", icon: <Star className="w-4 h-4" /> },
    { key: "subscriptions", label: "Abonelikler", icon: <User className="w-4 h-4" /> },
  ];

  const hasActiveSub = subscriptions.some(s => new Date(s.end_date) > new Date());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Card */}
      <div className="bg-midnight border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-violet flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} label="Ad" className="w-32" />
                  <Input value={editSurname} onChange={e => setEditSurname(e.target.value)} label="Soyad" className="w-36" />
                </div>
                <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} label="E-posta" type="email" className="max-w-xs" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProfile} loading={saving}><Check className="w-3.5 h-3.5 mr-1" />Kaydet</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(user.name); setEditSurname(user.surname); setEditEmail(user.email); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-fg">{user.name} {user.surname}</h1>
                <button onClick={() => setEditing(true)} className="p-1 text-dim hover:text-fg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {!editing && <p className="text-muted text-sm mt-0.5">{user.email}</p>}
            <div className="flex gap-2 mt-2">
              <Badge variant={user.account_status === "active" ? "success" : "danger"}>
                {user.account_status === "active" ? "Aktif" : "Banlı"}
              </Badge>
              <Badge>{user.role.role_name === "admin" ? "Admin" : user.role.role_name === "content_manager" ? "İçerik Yöneticisi" : "Üye"}</Badge>
              {hasActiveSub && <Badge variant="premium">Premium</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-midnight border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowPasswordCard((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-muted" />
            <span className="font-medium text-fg text-sm">Şifre Değiştir</span>
          </div>
          {showPasswordCard ? <ChevronUp className="w-4 h-4 text-dim" /> : <ChevronDown className="w-4 h-4 text-dim" />}
        </button>

        {showPasswordCard && (
          <form onSubmit={handleChangePassword} className="px-6 pb-6 space-y-4 border-t border-border">
            <div className="pt-4 space-y-3">
              {/* Current password */}
              <div className="relative max-w-sm">
                <Input
                  label="Mevcut Şifre"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-8 text-dim hover:text-fg transition-colors">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* New password */}
              <div className="relative max-w-sm">
                <Input
                  label="Yeni Şifre"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-8 text-dim hover:text-fg transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative max-w-sm">
                <Input
                  label="Yeni Şifre (Tekrar)"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-8 text-dim hover:text-fg transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Şifreler eşleşmiyor.</p>
                )}
              </div>
            </div>

            <Button type="submit" size="sm" loading={changingPassword}>
              Şifreyi Güncelle
            </Button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-midnight border border-border rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-crimson text-white" : "text-muted hover:text-fg"}`}
          >
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-crimson animate-spin" /></div>
        ) : (
          <>
            {/* Favorites */}
            {tab === "favorites" && (
              favorites.length === 0 ? <Empty text="Henüz favori anime eklemediniz." /> :
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favorites.map(fav => (
                  <Link key={fav.favorite_id} href={`/anime/${fav.anime_id}`}
                    className="flex items-center gap-3 bg-midnight border border-border rounded-xl px-4 py-3 hover:border-crimson/40 transition-colors group"
                  >
                    {fav.anime?.cover_image_url ? (
                      <img src={fav.anime.cover_image_url} alt={fav.anime.title} className="w-10 h-14 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-10 h-14 bg-obsidian rounded-lg shrink-0 flex items-center justify-center text-dim text-lg">🎬</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-fg group-hover:text-crimson transition-colors font-medium text-sm truncate">
                        {fav.anime?.title ?? `Anime #${fav.anime_id}`}
                      </p>
                      <p className="text-xs text-dim mt-0.5">{formatDate(fav.created_at)}</p>
                    </div>
                    <button
                      onClick={e => { e.preventDefault(); removeFavorite(fav.anime_id); }}
                      className="p-1 text-dim hover:text-crimson transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                ))}
              </div>
            )}

            {/* History */}
            {tab === "history" && (
              history.length === 0 ? <Empty text="Henüz izleme geçmişiniz yok." /> :
              <div className="space-y-2">
                {history.map(h => {
                  const ep = h.episode;
                  const animeTitle = ep?.season.anime.title;
                  const epLabel = ep ? `${ep.episode_number}. Bölüm${ep.title ? ` — ${ep.title}` : ""}` : `Bölüm #${h.episode_id}`;
                  return (
                    <Link key={h.history_id} href={ep ? `/anime/${ep.season.anime.anime_id}/watch/${h.episode_id}` : "#"}
                      className="flex items-center justify-between bg-midnight border border-border rounded-xl px-4 py-3 hover:border-border/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        {animeTitle && <p className="text-xs text-muted truncate">{animeTitle}</p>}
                        <p className="text-sm text-fg font-medium truncate">{epLabel}</p>
                        <p className="text-xs text-dim">{formatDate(h.last_watched_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {h.completed_flag
                          ? <Badge variant="success">Tamamlandı</Badge>
                          : <Badge variant="warning">{Math.floor(h.watched_duration / 60)} dk izlendi</Badge>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Reviews */}
            {tab === "reviews" && (
              reviews.length === 0 ? <Empty text="Henüz yorum yapmadınız." /> :
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.review_id} className="bg-midnight border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/anime/${r.anime_id}`} className="text-crimson hover:text-red-400 text-sm font-medium">
                        {r.anime?.title ?? `Anime #${r.anime_id}`}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.review_status === "approved" ? "success" : r.review_status === "rejected" ? "danger" : "warning"}>
                          {r.review_status === "approved" ? "Onaylandı" : r.review_status === "rejected" ? "Reddedildi" : "Bekliyor"}
                        </Badge>
                        <button onClick={() => deleteReview(r.review_id)} className="p-1 text-dim hover:text-crimson transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }, (_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-dimmer"}`} />
                      ))}
                      <span className="ml-1 text-xs font-bold text-amber-400">{r.rating}/10</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Subscriptions */}
            {tab === "subscriptions" && (
              subscriptions.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <p className="text-dim">Aktif aboneliğiniz bulunmuyor.</p>
                  <p className="text-xs text-dim">Premium içeriklere erişmek için bir abonelik planı edinin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map(s => {
                    const active = new Date(s.end_date) > new Date();
                    return (
                      <div key={s.subscription_id} className="flex items-center justify-between bg-midnight border border-border rounded-xl px-5 py-4">
                        <div>
                          <p className="font-medium text-fg">{s.plan_name}</p>
                          <p className="text-xs text-dim">{formatDate(s.start_date)} — {formatDate(s.end_date)}</p>
                        </div>
                        <Badge variant={active ? "success" : "default"}>{active ? "Aktif" : "Sona Erdi"}</Badge>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-dim">
      <p className="text-3xl mb-2">📭</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}
