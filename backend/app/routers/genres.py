from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Genre, User
from app.schemas import GenreCreate, GenreOut
from app.core.deps import require_role

router = APIRouter(prefix="/genres", tags=["Genres"])

ContentManagerOrAdmin = Depends(require_role("content_manager", "admin"))


@router.get("/", response_model=List[GenreOut])
def list_genres(db: Annotated[Session, Depends(get_db)]):
    return db.query(Genre).order_by(Genre.genre_name).all()


@router.post("/", response_model=GenreOut, status_code=status.HTTP_201_CREATED)
def create_genre(
    payload: GenreCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    if db.query(Genre).filter(Genre.genre_name == payload.genre_name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu tur zaten mevcut.")
    genre = Genre(genre_name=payload.genre_name)
    db.add(genre)
    db.commit()
    db.refresh(genre)
    return genre


@router.delete("/{genre_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_genre(
    genre_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    genre = db.get(Genre, genre_id)
    if not genre:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tur bulunamadi.")
    db.delete(genre)
    db.commit()
