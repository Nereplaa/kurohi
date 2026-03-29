from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, anime, seasons, episodes, users, genres, subscriptions, reviews, admin, payments
from app.core.config import settings

app = FastAPI(
    title="Anime Izleme Platformu API",
    description="Anime kesfet, izle, yorumla ve listele.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(anime.router, prefix=API_PREFIX)
app.include_router(genres.router, prefix=API_PREFIX)
app.include_router(seasons.router, prefix=API_PREFIX)
app.include_router(episodes.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(subscriptions.router, prefix=API_PREFIX)
app.include_router(reviews.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Anime Platformu API calisiyor."}
