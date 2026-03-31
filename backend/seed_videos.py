"""
VIDEO_DIR klasöründeki .mp4/.mkv dosyalarını veritabanına kaydeder.

Dosya adı kuralı (convention):
    {anime-slug}-s{sezon}-e{bolum}.mp4
    {anime-slug}-s{sezon}-e{bolum}.mkv

Örnekler:
    attack-on-titan-s1-e1.mp4
    demon-slayer-s1-e3.mkv
    one-piece-s2-e7.mp4

Kullanım:
    cd backend
    python seed_videos.py              # önizleme (DB'ye yazmaz)
    python seed_videos.py --apply      # veritabanına uygula
    python seed_videos.py --apply --premium   # tüm bölümleri premium yap

Koşul:
    VIDEO_DIR ortam değişkeni backend/.env içinde tanımlı olmalı.
    Anime başlıkları veritabanında zaten mevcut olmalı (seed_jikan.py çalıştırılmış olmalı).
    Eşleşme, dosya adındaki slug ile DB'deki title arasında yapılır.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

# backend/ klasöründen çalıştırıldığında app paketini bulabilmek için
sys.path.insert(0, ".")

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Anime, Season, Episode

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".webm"}

# Regex: her anime-slug-s{n}-e{n}.ext formatını yakalar
FILENAME_RE = re.compile(
    r"^(?P<slug>.+?)-s(?P<season>\d+)-e(?P<episode>\d+)$",
    re.IGNORECASE,
)


def slug_to_title_variants(slug: str) -> list[str]:
    """'attack-on-titan' → ['attack on titan', 'Attack On Titan', ...]"""
    spaced = slug.replace("-", " ")
    return [spaced, spaced.title(), spaced.upper(), spaced.capitalize()]


def find_anime(db: Session, slug: str) -> Anime | None:
    for variant in slug_to_title_variants(slug):
        anime = (
            db.query(Anime)
            .filter(Anime.title.ilike(f"%{variant}%"))
            .first()
        )
        if anime:
            return anime
    return None


def get_or_create_season(db: Session, anime: Anime, season_number: int) -> Season:
    season = (
        db.query(Season)
        .filter(Season.anime_id == anime.anime_id, Season.season_number == season_number)
        .first()
    )
    if not season:
        season = Season(anime_id=anime.anime_id, season_number=season_number)
        db.add(season)
        db.flush()
    return season


def get_or_create_episode(
    db: Session,
    season: Season,
    episode_number: int,
    filename: str,
    is_premium: bool,
) -> tuple[Episode, bool]:
    """Returns (episode, created)."""
    episode = (
        db.query(Episode)
        .filter(
            Episode.season_id == season.season_id,
            Episode.episode_number == episode_number,
        )
        .first()
    )
    created = False
    if not episode:
        episode = Episode(
            season_id=season.season_id,
            episode_number=episode_number,
            title=f"Bölüm {episode_number}",
            video_url=filename,
            is_premium=is_premium,
        )
        db.add(episode)
        created = True
    else:
        episode.video_url = filename
        if is_premium:
            episode.is_premium = True
    return episode, created


def main() -> None:
    parser = argparse.ArgumentParser(description="Video dosyalarını DB'ye seed et.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Değişiklikleri veritabanına yaz (yoksa sadece önizleme).",
    )
    parser.add_argument(
        "--premium",
        action="store_true",
        help="Tüm bölümleri is_premium=True olarak işaretle.",
    )
    args = parser.parse_args()

    video_dir_str = os.getenv("VIDEO_DIR", "")
    if not video_dir_str:
        print("HATA: VIDEO_DIR ortam değişkeni tanımlı değil.")
        print("  backend/.env dosyasına şunu ekleyin:")
        print("  VIDEO_DIR=C:/Users/YourName/Videos/anime")
        sys.exit(1)

    video_dir = Path(video_dir_str)
    if not video_dir.is_dir():
        print(f"HATA: VIDEO_DIR klasörü bulunamadı: {video_dir}")
        sys.exit(1)

    # Desteklenen uzantılardaki tüm dosyaları topla
    video_files = [
        f for f in video_dir.iterdir()
        if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS
    ]

    if not video_files:
        print(f"Uyarı: {video_dir} içinde video dosyası bulunamadı.")
        sys.exit(0)

    print(f"\n{'DRY RUN — DB değişikliği yok' if not args.apply else 'UYGULANIYOR'}")
    print(f"VIDEO_DIR : {video_dir}")
    print(f"Bulunan   : {len(video_files)} video dosyası")
    print("-" * 60)

    db: Session = SessionLocal()
    matched = 0
    skipped = 0

    try:
        for vf in sorted(video_files):
            stem = vf.stem  # dosya adı uzantısız
            m = FILENAME_RE.match(stem)
            if not m:
                print(f"  [ATLA]  {vf.name}  ← kural dışı format")
                skipped += 1
                continue

            slug = m.group("slug")
            season_num = int(m.group("season"))
            ep_num = int(m.group("episode"))

            anime = find_anime(db, slug)
            if not anime:
                print(f"  [YOK ]  {vf.name}  ← '{slug}' için anime bulunamadı")
                skipped += 1
                continue

            action = "GÜNCELLE" if not args.apply else "OK"
            if args.apply:
                season = get_or_create_season(db, anime, season_num)
                episode, created = get_or_create_episode(
                    db, season, ep_num, vf.name, args.premium
                )
                action = "OLUŞTUR" if created else "GÜNCELLE"

            print(
                f"  [{action:7}]  {vf.name}"
                f"  → {anime.title} | Sezon {season_num} | Bölüm {ep_num}"
            )
            matched += 1

        if args.apply:
            db.commit()
            print(f"\n✓ {matched} bölüm kaydedildi, {skipped} dosya atlandı.")
        else:
            print(f"\nÖnizleme: {matched} eşleşti, {skipped} atlandı.")
            print("Uygulamak için:  python seed_videos.py --apply")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
