"""
Jikan API'den populer anime verisi cekip yerel veritabanina kaydeder.

Kullanim:
    cd backend
    python seed_jikan.py              # ilk 25 anime (1 sayfa)
    python seed_jikan.py --pages 3    # ilk 75 anime (3 sayfa)
    python seed_jikan.py --pages 3 --dry-run   # kaydetmeden ekrana yaz
"""
import sys
import time
import argparse

import requests
from sqlalchemy.orm import Session

# backend/ klasoru icinden calistirildiginda app paketini bulabilmek icin
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models import Anime, Genre, Season, Episode
from app.models.role import Role
from app.models.user import User, AccountStatus
from app.core.security import hash_password

JIKAN_TOP_URL = "https://api.jikan.moe/v4/top/anime"
JIKAN_SEARCH_URL = "https://api.jikan.moe/v4/anime"
JIKAN_EPISODES_URL = "https://api.jikan.moe/v4/anime/{mal_id}/episodes"
PAGE_LIMIT = 25          # Jikan max 25/sayfa
REQUEST_DELAY = 1.2      # saniye — Jikan rate limit: 3 istek/sn, 60/dk
MAX_EPISODES_PER_ANIME = 12
PLACEHOLDER_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


# ---------------------------------------------------------------------------
# Yardimci fonksiyonlar
# ---------------------------------------------------------------------------

def fetch_page(page: int) -> list[dict]:
    """Jikan'dan bir sayfa anime verisi ceker. Basarisizliklarda tekrar dener."""
    url = f"{JIKAN_TOP_URL}?page={page}&limit={PAGE_LIMIT}"
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 429:
                wait = 2 ** attempt * 2
                print(f"  Rate limit. {wait}s bekleniyor...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json().get("data", [])
        except requests.RequestException as exc:
            print(f"  Hata (deneme {attempt + 1}/3): {exc}")
            time.sleep(2)
    print(f"  Sayfa {page} alinamadi, atlaniyor.")
    return []


def map_age_rating(raw: str | None) -> str | None:
    """Jikan'in uzun rating metnini 20 karaktere sigar."""
    if not raw:
        return None
    # Ornek: "R - 17+ (violence & profanity)" -> "R - 17+"
    short = raw.split(" (")[0].strip()
    return short[:20]


def get_or_create_genre(db: Session, name: str) -> Genre:
    genre = db.query(Genre).filter(Genre.genre_name == name).first()
    if not genre:
        genre = Genre(genre_name=name)
        db.add(genre)
        db.flush()   # id almak icin; commit sonra toplu yapilacak
    return genre


def get_or_create_admin(db: Session) -> User | None:
    """Seed icin created_by alanini dolduracak admin kullanicisini dondurur."""
    admin = db.query(User).join(Role).filter(Role.role_name == "admin").first()
    return admin


def upsert_anime(db: Session, item: dict, admin_id: int | None, dry_run: bool) -> bool:
    """
    Tek bir Jikan anime kaydini isleme alir.
    Zaten varsa gunceller, yoksa ekler.
    dry_run=True ise DB'ye yazma, sadece yazdirir.
    Geri donus: True = eklendi/guncellendi, False = atlandi.
    """
    title: str = item.get("title", "").strip()
    if not title:
        return False

    mal_id: int | None = item.get("mal_id")

    # Gorsel
    images = item.get("images", {})
    cover = (
        images.get("webp", {}).get("large_image_url")
        or images.get("jpg", {}).get("large_image_url")
    )

    synopsis: str | None = item.get("synopsis")
    year: int | None = item.get("year")
    rating: str | None = map_age_rating(item.get("rating"))

    # Tur listesi
    genre_names: list[str] = [g["name"] for g in item.get("genres", []) if g.get("name")]

    if dry_run:
        print(f"  [DRY-RUN] {title} ({year}) | MAL ID: {mal_id} | {rating} | genres: {genre_names}")
        return True

    # Var mi kontrol et (mal_id ile veya title ile)
    existing = None
    if mal_id:
        existing = db.query(Anime).filter(Anime.mal_id == mal_id).first()
    if not existing:
        existing = db.query(Anime).filter(Anime.title == title).first()

    if existing:
        # Guncelle
        existing.description = synopsis
        existing.release_year = year
        existing.age_rating = rating
        if mal_id:
            existing.mal_id = mal_id
        if cover:
            existing.cover_image_url = cover
        anime_obj = existing
        action = "guncellendi"
    else:
        # Yeni kayit
        anime_obj = Anime(
            mal_id=mal_id,
            title=title,
            description=synopsis,
            release_year=year,
            age_rating=rating,
            cover_image_url=cover,
            created_by=admin_id,
        )
        db.add(anime_obj)
        db.flush()
        action = "eklendi"

    # Turleri baglanti
    genres_objs = [get_or_create_genre(db, name) for name in genre_names]
    anime_obj.genres = genres_objs

    print(f"  {action.upper()}: {title} ({year}) | {rating} | genres: {genre_names}")
    return True


# ---------------------------------------------------------------------------
# Episode seed fonksiyonlari
# ---------------------------------------------------------------------------

def search_mal_id(title: str) -> int | None:
    """Jikan arama API'si ile anime basligini MAL ID'sine cevirir."""
    url = f"{JIKAN_SEARCH_URL}?q={requests.utils.quote(title)}&limit=1"
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 429:
                wait = 2 ** attempt * 2
                print(f"    Rate limit. {wait}s bekleniyor...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json().get("data", [])
            if data:
                return data[0].get("mal_id")
            return None
        except requests.RequestException as exc:
            print(f"    Arama hatasi (deneme {attempt + 1}/3): {exc}")
            time.sleep(2)
    return None


def fetch_episodes(mal_id: int) -> list[dict]:
    """Jikan'dan bir anime icin episode listesi ceker (ilk sayfa)."""
    url = JIKAN_EPISODES_URL.format(mal_id=mal_id)
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 429:
                wait = 2 ** attempt * 2
                print(f"    Rate limit. {wait}s bekleniyor...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json().get("data", [])
        except requests.RequestException as exc:
            print(f"    Episode cekme hatasi (deneme {attempt + 1}/3): {exc}")
            time.sleep(2)
    return []


def seed_episodes_for_anime(db: Session, anime: Anime, dry_run: bool) -> int:
    """Tek bir anime icin Jikan'dan episode cekip DB'ye yazar. Eklenen episode sayisini dondurur."""
    # Zaten season/episode varsa atla
    if anime.seasons:
        print(f"  ATLANDI (zaten season var): {anime.title}")
        return 0

    print(f"  Isleniyor: {anime.title}")

    # MAL ID bul (once DB'den, yoksa arama yap)
    mal_id = anime.mal_id
    if not mal_id:
        time.sleep(REQUEST_DELAY)
        mal_id = search_mal_id(anime.title)
        if not mal_id:
            print(f"    MAL ID bulunamadi, atlaniyor.")
            return 0
        # Bulunan MAL ID'yi kaydet
        anime.mal_id = mal_id

    # Episode listesi cek
    time.sleep(REQUEST_DELAY)
    episodes_data = fetch_episodes(mal_id)
    if not episodes_data:
        print(f"    Episode verisi yok, atlaniyor.")
        return 0

    # Max 12 episode al
    episodes_data = episodes_data[:MAX_EPISODES_PER_ANIME]

    if dry_run:
        print(f"    [DRY-RUN] {len(episodes_data)} episode eklenecek (MAL ID: {mal_id})")
        return len(episodes_data)

    # 1 sezon olustur
    season = Season(
        anime_id=anime.anime_id,
        season_number=1,
        season_title=f"{anime.title} - Sezon 1",
    )
    db.add(season)
    db.flush()

    # Episode'lari ekle
    count = 0
    for ep_data in episodes_data:
        ep_number = ep_data.get("mal_id", count + 1)  # Jikan episode mal_id = episode number
        ep_title = ep_data.get("title", f"Bolum {count + 1}")

        episode = Episode(
            season_id=season.season_id,
            episode_number=count + 1,
            title=ep_title,
            video_url=PLACEHOLDER_VIDEO_URL,
            is_premium=(count + 1) > 6,  # ilk 6 ucretsiz, sonrasi premium
        )
        db.add(episode)
        count += 1

    db.flush()
    print(f"    {count} episode eklendi (MAL ID: {mal_id}, premium: {max(0, count - 6)})")
    return count


def run_episodes(dry_run: bool = False) -> None:
    """Veritabanindaki tum animeler icin Jikan'dan episode seed eder."""
    # Anime ID listesini al ve DB session'i hemen kapat
    db = SessionLocal()
    try:
        anime_ids = [a.anime_id for a in db.query(Anime.anime_id).order_by(Anime.anime_id).all()]
    finally:
        db.close()

    print(f"\nToplam {len(anime_ids)} anime icin episode seed baslatiliyor...\n")

    total_episodes = 0
    seeded_count = 0

    for anime_id in anime_ids:
        # Her anime icin fresh session ac — uzun Jikan beklemeleri sirasinda connection timeout olmaz
        db = SessionLocal()
        try:
            anime = db.get(Anime, anime_id)
            if not anime:
                continue
            added = seed_episodes_for_anime(db, anime, dry_run)
            if added > 0:
                total_episodes += added
                seeded_count += 1
                if not dry_run:
                    db.commit()
        except Exception as exc:
            db.rollback()
            print(f"    HATA (anime_id={anime_id}): {exc}")
        finally:
            db.close()

    print(f"\nTamamlandi. {seeded_count} anime icin toplam {total_episodes} episode eklendi.")
    if dry_run:
        print("DRY-RUN modunda calistirildi — veritabanina hicbir sey yazilmadi.")


# ---------------------------------------------------------------------------
# Ana fonksiyon
# ---------------------------------------------------------------------------

def run(pages: int = 1, dry_run: bool = False) -> None:
    db: Session = SessionLocal()
    try:
        admin = get_or_create_admin(db)
        admin_id = admin.user_id if admin else None
        if not admin_id:
            print("UYARI: Admin kullanicisi bulunamadi. created_by alani bos kalacak.")

        total_added = 0

        for page in range(1, pages + 1):
            print(f"\nSayfa {page}/{pages} cekiliyor...")
            items = fetch_page(page)

            if not items:
                print("  Veri yok, durduruluyor.")
                break

            for item in items:
                if upsert_anime(db, item, admin_id, dry_run):
                    total_added += 1

            if not dry_run:
                db.commit()
                print(f"  Sayfa {page} kaydedildi.")

            if page < pages:
                print(f"  Jikan rate limit icin {REQUEST_DELAY}s bekleniyor...")
                time.sleep(REQUEST_DELAY)

        print(f"\nTamamlandi. Toplam islenen: {total_added} anime.")
        if dry_run:
            print("DRY-RUN modunda calistirildi — veritabanina hicbir sey yazilmadi.")

    except Exception as exc:
        db.rollback()
        print(f"\nHATA: {exc}")
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CLI giris noktasi
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Jikan API'den anime verisi cek ve kaydet.")
    parser.add_argument(
        "--pages",
        type=int,
        default=1,
        help="Kac sayfa cekilecek (her sayfa 25 anime, varsayilan: 1)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Veritabanina yazmadan sadece ekrana yazdir",
    )
    parser.add_argument(
        "--episodes",
        action="store_true",
        help="Mevcut animeler icin Jikan'dan episode verisi cekip seed et",
    )
    args = parser.parse_args()

    if args.episodes:
        print(f"Jikan episode seeder baslatiliyor, dry_run={args.dry_run}")
        run_episodes(dry_run=args.dry_run)
    else:
        print(f"Jikan seeder baslatiliyor: {args.pages} sayfa, dry_run={args.dry_run}")
        run(pages=args.pages, dry_run=args.dry_run)
