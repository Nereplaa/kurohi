// ---- Auth ----
export interface Token {
  access_token: string;
  token_type: string;
}

// ---- Role ----
export interface Role {
  role_id: number;
  role_name: "member" | "content_manager" | "admin";
}

// ---- User ----
export interface User {
  user_id: number;
  name: string;
  surname: string;
  email: string;
  account_status: "active" | "banned" | "inactive";
  role: Role;
  created_at: string;
}

// ---- Genre ----
export interface Genre {
  genre_id: number;
  genre_name: string;
}

// ---- Episode ----
export interface Episode {
  episode_id: number;
  season_id: number;
  episode_number: number;
  title: string | null;
  video_url: string | null;
  is_premium: boolean;
  duration_seconds: number | null;
}

// ---- Season ----
export interface Season {
  season_id: number;
  anime_id: number;
  season_number: number;
  season_title: string | null;
  episodes: Episode[];
}

// ---- Anime ----
export interface Anime {
  anime_id: number;
  mal_id: number | null;
  title: string;
  description: string | null;
  release_year: number | null;
  age_rating: string | null;
  cover_image_url: string | null;
  genres: Genre[];
  seasons: Season[];
  created_at: string;
}

// ---- Review ----
export interface ReviewAnimeInfo {
  anime_id: number;
  title: string;
  cover_image_url: string | null;
}

export interface Review {
  review_id: number;
  user_id: number | null;
  anime_id: number;
  rating: number;
  comment: string | null;
  review_status: "approved" | "pending" | "rejected";
  created_at: string;
  anime: ReviewAnimeInfo | null;
}

// ---- Favorite ----
export interface FavoriteAnimeInfo {
  anime_id: number;
  title: string;
  cover_image_url: string | null;
}

export interface Favorite {
  favorite_id: number;
  user_id: number;
  anime_id: number;
  created_at: string;
  anime: FavoriteAnimeInfo | null;
}

// ---- WatchHistory ----
export interface WatchHistoryEpisode {
  episode_id: number;
  episode_number: number;
  title: string | null;
  season: {
    season_id: number;
    anime: { anime_id: number; title: string; cover_image_url: string | null };
  };
}

export interface WatchHistory {
  history_id: number;
  user_id: number;
  episode_id: number;
  watched_duration: number;
  completed_flag: boolean;
  last_watched_at: string;
  episode: WatchHistoryEpisode | null;
}

// ---- Subscription ----
export interface Subscription {
  subscription_id: number;
  user_id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
}

// ---- Payment ----
export interface InitiateResponse {
  token: string;
  mock_mode: boolean;
  checkout_form_content: string | null;
}

export interface CheckoutResponse {
  subscription_id: number;
  user_id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  payment_id: string;
}

// ---- API Error ----
export interface ApiError {
  detail: string;
}
