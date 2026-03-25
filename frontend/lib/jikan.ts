import axios from "axios";

const JIKAN_BASE = "https://api.jikan.moe/v4";
const DELAY_MS = 600; // Jikan rate limit: maks 3 req/sn — 600ms güvenli

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface JikanEpisode {
  mal_id: number;       // Bölüm numarası (MyAnimeList)
  title: string | null;
  title_japanese: string | null;
  title_romanji: string | null;
  aired: string | null; // ISO 8601 tarih
  score: number | null; // 0-10
  filler: boolean;
  recap: boolean;
  forum_url: string;
}

export interface JikanAnimeInfo {
  mal_id: number;
  title: string;
  title_japanese: string | null;
  episodes: number | null;   // Toplam bölüm sayısı (null → bilinmiyor)
  status: string;
  score: number | null;
  images: {
    webp: { large_image_url: string };
    jpg:  { large_image_url: string };
  };
  synopsis: string | null;
  year: number | null;
  genres: { name: string }[];
}

export interface FetchEpisodesResult {
  episodes: JikanEpisode[];
  totalFetched: number;
  pagesLoaded: number;
}

export interface JikanEpisodeVideo {
  mal_id: number;
  title: string;
  episode: string;
  url: string;
  images: { jpg: { image_url: string } };
}

// ─── Anime bilgisi ────────────────────────────────────────────────────────────

export async function fetchAnimeInfo(malId: number): Promise<JikanAnimeInfo> {
  const { data } = await axios.get(`${JIKAN_BASE}/anime/${malId}`);
  return data.data as JikanAnimeInfo;
}

// ─── Tek bölüm detayı ────────────────────────────────────────────────────────

export async function fetchEpisodeById(malId: number, episodeId: number): Promise<JikanEpisode | null> {
  try {
    const { data } = await axios.get(`${JIKAN_BASE}/anime/${malId}/episodes/${episodeId}`);
    return (data.data as JikanEpisode) ?? null;
  } catch {
    return null;
  }
}

// ─── Bölüm promo videoları ────────────────────────────────────────────────────

export async function fetchEpisodeVideos(malId: number): Promise<JikanEpisodeVideo[]> {
  try {
    const { data } = await axios.get(`${JIKAN_BASE}/anime/${malId}/videos/episodes`);
    return (data.data as JikanEpisodeVideo[]) ?? [];
  } catch {
    return [];
  }
}

// ─── Tüm bölümleri çek (pagination dahil) ────────────────────────────────────

export async function fetchAllEpisodes(
  malId: number,
  /** Her sayfa yüklendiğinde çağrılır — ilerleme çubuğu için */
  onProgress?: (loaded: number, page: number) => void
): Promise<FetchEpisodesResult> {
  const all: JikanEpisode[] = [];
  let page = 1;

  while (true) {
    const { data } = await axios.get<{
      data: JikanEpisode[];
      pagination: { has_next_page: boolean; last_visible_page: number };
    }>(`${JIKAN_BASE}/anime/${malId}/episodes`, { params: { page } });

    const episodes: JikanEpisode[] = data.data ?? [];
    all.push(...episodes);
    onProgress?.(all.length, page);

    // has_next_page false ya da boş sayfa → dur
    if (!data.pagination?.has_next_page || episodes.length === 0) break;

    page++;
    await delay(DELAY_MS); // Rate limit koruması
  }

  return { episodes: all, totalFetched: all.length, pagesLoaded: page };
}

// ─── Yardımcı: ISO tarih → "12 Eki 2023" ─────────────────────────────────────

export function formatAiredDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
