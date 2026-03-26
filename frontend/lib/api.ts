import axios, { AxiosError } from "axios";
import type {
  Anime, Episode, Favorite, Genre, Review,
  Season, Subscription, Token, User, WatchHistory,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL: BASE });

// Token'ı her isteğe otomatik ekle
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → localStorage temizle
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    return Promise.reject(err);
  }
);

// Hata mesajını çıkar
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string })?.detail;
    return detail ?? err.message;
  }
  return "Beklenmeyen bir hata oluştu.";
}

// ── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; surname: string; email: string; password: string }) =>
    api.post<User>("/api/auth/register", data).then((r) => r.data),

  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api
      .post<Token>("/api/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((r) => r.data);
  },

  me: () => api.get<User>("/api/auth/me").then((r) => r.data),
};

// ── Anime ─────────────────────────────────────────────────────────────────

export const animeApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; genre_ids?: number[] }) =>
    api.get<Anime[]>("/api/anime/", {
      params,
      // axios serializes arrays as genre_ids[]=1&genre_ids[]=2 by default;
      // FastAPI expects repeated keys: genre_ids=1&genre_ids=2
      paramsSerializer: (p) => {
        const sp = new URLSearchParams();
        Object.entries(p).forEach(([k, v]) => {
          if (Array.isArray(v)) v.forEach((item) => sp.append(k, String(item)));
          else if (v !== undefined && v !== null) sp.append(k, String(v));
        });
        return sp.toString();
      },
    }).then((r) => r.data),

  get: (id: number) => api.get<Anime>(`/api/anime/${id}`).then((r) => r.data),

  create: (data: {
    title: string; description?: string; release_year?: number;
    age_rating?: string; cover_image_url?: string; genre_ids?: number[];
  }) => api.post<Anime>("/api/anime/", data).then((r) => r.data),

  update: (id: number, data: Partial<{
    title: string; description: string; release_year: number;
    age_rating: string; cover_image_url: string; genre_ids: number[];
  }>) => api.put<Anime>(`/api/anime/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/api/anime/${id}`),

  getEpisodes: (id: number) =>
    api.get<Episode[]>(`/api/anime/${id}/episodes`).then((r) => r.data),

  getReviews: (id: number, params?: { skip?: number; limit?: number }) =>
    api.get<Review[]>(`/api/reviews/${id}`, { params }).then((r) => r.data),

  getFeatured: () => api.get<Anime[]>("/api/anime/featured").then((r) => r.data),
};

// ── Genres ────────────────────────────────────────────────────────────────

export const genreApi = {
  list: () => api.get<Genre[]>("/api/genres/").then((r) => r.data),
  create: (genre_name: string) =>
    api.post<Genre>("/api/genres/", { genre_name }).then((r) => r.data),
  delete: (id: number) => api.delete(`/api/genres/${id}`),
};

// ── Seasons ───────────────────────────────────────────────────────────────

export const seasonApi = {
  list: (animeId: number) =>
    api.get<Season[]>(`/api/anime/${animeId}/seasons`).then((r) => r.data),
  create: (animeId: number, data: { season_number: number; season_title?: string }) =>
    api.post<Season>(`/api/anime/${animeId}/seasons`, data).then((r) => r.data),
};

// ── Episodes ──────────────────────────────────────────────────────────────

export const episodeApi = {
  list: (seasonId: number) =>
    api.get<Episode[]>(`/api/seasons/${seasonId}/episodes`).then((r) => r.data),

  create: (seasonId: number, data: {
    episode_number: number; title?: string;
    video_url?: string; is_premium?: boolean; duration_seconds?: number;
  }) => api.post<Episode>(`/api/seasons/${seasonId}/episodes`, data).then((r) => r.data),

  update: (id: number, data: Partial<{
    title: string; video_url: string; is_premium: boolean; duration_seconds: number;
  }>) => api.put<Episode>(`/api/episodes/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/api/episodes/${id}`),

  watch: (id: number) => api.get<Episode>(`/api/episodes/${id}/watch`).then((r) => r.data),

  updateProgress: (id: number, data: { watched_duration: number; completed_flag: boolean }) =>
    api.post<WatchHistory>(`/api/episodes/${id}/progress`, data).then((r) => r.data),
};

// ── Users / Me ────────────────────────────────────────────────────────────

export const userApi = {
  updateProfile: (data: { name?: string; surname?: string; email?: string }) =>
    api.put<User>("/api/users/me", data).then((r) => r.data),

  changePassword: (data: { current_password: string; new_password: string; new_password_confirm: string }) =>
    api.post<{ message: string }>("/api/users/me/change-password", data).then((r) => r.data),

  // Favoriler
  getFavorites: () => api.get<Favorite[]>("/api/users/me/favorites").then((r) => r.data),
  addFavorite: (animeId: number) =>
    api.post<Favorite>(`/api/users/me/favorites/${animeId}`).then((r) => r.data),
  removeFavorite: (animeId: number) => api.delete(`/api/users/me/favorites/${animeId}`),

  // İzleme geçmişi
  getHistory: () => api.get<WatchHistory[]>("/api/users/me/history").then((r) => r.data),

  // Yorumlar
  getMyReviews: () => api.get<Review[]>("/api/reviews/me/all").then((r) => r.data),
  createReview: (animeId: number, data: { rating: number; comment?: string }) =>
    api.post<Review>("/api/reviews/", data, { params: { anime_id: animeId } }).then((r) => r.data),
  updateReview: (reviewId: number, data: { rating?: number; comment?: string }) =>
    api.put<Review>(`/api/reviews/${reviewId}`, data).then((r) => r.data),
  deleteReview: (reviewId: number) => api.delete(`/api/reviews/${reviewId}`),

  // Abonelikler
  getSubscriptions: () => api.get<Subscription[]>("/api/subscriptions/me/all").then((r) => r.data),
  createSubscriptionSelf: (data: { plan_name: string; start_date: string; end_date: string }) =>
    api.post<Subscription>("/api/subscriptions/", data).then((r) => r.data),

  // Admin işlemleri
  getMe: () => api.get<User>("/api/users/me").then((r) => r.data),
};

// ── Admin ─────────────────────────────────────────────────────────────────

export const adminApi = {
  // Yorum moderasyonu
  getReviews: (params?: { review_status?: string; skip?: number; limit?: number }) =>
    api.get<Review[]>("/api/admin/reviews", { params }).then((r) => r.data),

  moderateReview: (reviewId: number, review_status: string) =>
    api.put<Review>(`/api/admin/reviews/${reviewId}`, { review_status }).then((r) => r.data),

  // Kullanıcı yönetimi
  listUsers: (params?: { account_status?: string; skip?: number; limit?: number }) =>
    api.get<User[]>("/api/admin/users", { params }).then((r) => r.data),

  updateUserStatus: (userId: number, account_status: string) =>
    api.put<User>(`/api/admin/users/${userId}/status`, { account_status }).then((r) => r.data),

  updateUserRole: (userId: number, role_name: string) =>
    api.put<User>(`/api/admin/users/${userId}/role`, { role_name }).then((r) => r.data),

  deleteUser: (userId: number) => api.delete(`/api/admin/users/${userId}`),

  // Abonelik (admin başkasına atama)
  createSubscription: (userId: number, data: {
    plan_name: string; start_date: string; end_date: string;
  }) => api.post<Subscription>(`/api/subscriptions/${userId}`, data).then((r) => r.data),

  // İçerik yönetimi
  createSeason: (animeId: number, data: { season_number: number; season_title?: string }) =>
    api.post<Season>(`/api/anime/${animeId}/seasons`, data).then((r) => r.data),

  createEpisode: (seasonId: number, data: {
    episode_number: number; title?: string;
    video_url?: string; is_premium?: boolean; duration_seconds?: number;
  }) => api.post<Episode>(`/api/seasons/${seasonId}/episodes`, data).then((r) => r.data),

  deleteEpisode: (episodeId: number) => api.delete(`/api/episodes/${episodeId}`),
};

// ── Subscriptions ──────────────────────────────────────────────────────────

export const subscriptionApi = {
  getActive: () => api.get<Subscription>("/api/subscriptions/me").then((r) => r.data),
  getAll: () => api.get<Subscription[]>("/api/subscriptions/me/all").then((r) => r.data),
  create: (data: { plan_name: string; start_date: string; end_date: string }) =>
    api.post<Subscription>("/api/subscriptions/", data).then((r) => r.data),
};
