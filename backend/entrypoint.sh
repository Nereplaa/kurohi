#!/bin/bash
set -e

echo "==> PostgreSQL bekleniyor..."
python - <<'PYEOF'
import time, sys, os
import psycopg2

url = os.environ["DATABASE_URL"]
for i in range(30):
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print("==> Veritabani hazir!")
        sys.exit(0)
    except psycopg2.OperationalError:
        print(f"  Deneme {i+1}/30 - bekleniyor...")
        time.sleep(2)
print("HATA: Veritabanina baglanilamiyor!")
sys.exit(1)
PYEOF

echo "==> Migrasyonlar calistiriliyor..."
alembic upgrade head

echo "==> Roller ve admin kullanici olusturuluyor..."
python -m app.seed

echo "==> Veri kontrolu yapiliyor..."
HAS_DATA=$(python - <<'PYEOF'
import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models import Anime
db = SessionLocal()
count = db.query(Anime).count()
db.close()
print("yes" if count > 0 else "no")
PYEOF
)

if [ "$HAS_DATA" = "no" ]; then
    echo "==> Ilk kurulum: Anime verileri yukleniyor (Jikan API, 3 sayfa)..."
    python seed_jikan.py --pages 3
    echo "==> Ilk kurulum: Episodeler yukleniyor (Jikan API)..."
    python seed_jikan.py --episodes
else
    echo "==> Veri zaten mevcut (${HAS_DATA}), seed atlaniyor."
fi

echo "==> Sunucu baslatiliyor..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
