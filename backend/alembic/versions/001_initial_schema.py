"""initial_schema

Revision ID: 001
Revises:
Create Date: 2026-03-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PgENUM

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: PgENUM ile tanimlaninca SQLAlchemy CREATE TYPE'i tekrar calistirmaz
account_status_col = PgENUM("active", "banned", "inactive", name="accountstatus", create_type=False)
review_status_col = PgENUM("approved", "pending", "rejected", name="reviewstatus", create_type=False)


def upgrade() -> None:
    op.execute("DO $$ BEGIN CREATE TYPE accountstatus AS ENUM ('active', 'banned', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE reviewstatus AS ENUM ('approved', 'pending', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")

    op.create_table(
        "roles",
        sa.Column("role_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("role_name", sa.String(50), unique=True, nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("surname", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.role_id"), nullable=False),
        sa.Column("account_status", account_status_col, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "genres",
        sa.Column("genre_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("genre_name", sa.String(100), unique=True, nullable=False),
    )

    op.create_table(
        "anime",
        sa.Column("anime_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(500), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("release_year", sa.Integer(), nullable=True),
        sa.Column("age_rating", sa.String(20), nullable=True),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("release_year >= 1917 AND release_year <= 2100", name="ck_anime_release_year"),
    )

    op.create_table(
        "anime_genres",
        sa.Column("anime_id", sa.Integer(), sa.ForeignKey("anime.anime_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("genre_id", sa.Integer(), sa.ForeignKey("genres.genre_id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "seasons",
        sa.Column("season_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("anime_id", sa.Integer(), sa.ForeignKey("anime.anime_id", ondelete="CASCADE"), nullable=False),
        sa.Column("season_number", sa.Integer(), nullable=False),
        sa.Column("season_title", sa.String(500), nullable=True),
        sa.UniqueConstraint("anime_id", "season_number", name="uq_season_anime_number"),
        sa.CheckConstraint("season_number > 0", name="ck_season_number_positive"),
    )

    op.create_table(
        "episodes",
        sa.Column("episode_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("season_id", sa.Integer(), sa.ForeignKey("seasons.season_id", ondelete="CASCADE"), nullable=False),
        sa.Column("episode_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("video_url", sa.Text(), nullable=True),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("season_id", "episode_number", name="uq_episode_season_number"),
        sa.CheckConstraint("episode_number > 0", name="ck_episode_number_positive"),
    )

    op.create_table(
        "watch_history",
        sa.Column("history_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("episode_id", sa.Integer(), sa.ForeignKey("episodes.episode_id", ondelete="CASCADE"), nullable=False),
        sa.Column("watched_duration", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("completed_flag", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_watched_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "episode_id", name="uq_watch_history_user_episode"),
        sa.CheckConstraint("watched_duration >= 0", name="ck_watched_duration_non_negative"),
    )

    op.create_table(
        "favorites",
        sa.Column("favorite_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("anime_id", sa.Integer(), sa.ForeignKey("anime.anime_id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "anime_id", name="uq_favorite_user_anime"),
    )

    op.create_table(
        "reviews",
        sa.Column("review_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
        sa.Column("anime_id", sa.Integer(), sa.ForeignKey("anime.anime_id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("review_status", review_status_col, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("rating >= 1 AND rating <= 10", name="ck_review_rating_range"),
        sa.UniqueConstraint("user_id", "anime_id", name="uq_review_user_anime"),
    )

    op.create_table(
        "subscriptions",
        sa.Column("subscription_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan_name", sa.String(100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("end_date > start_date", name="ck_subscription_date_order"),
    )

    # Seed default roles
    op.execute("INSERT INTO roles (role_name) VALUES ('member'), ('content_manager'), ('admin')")


def downgrade() -> None:
    op.drop_table("subscriptions")
    op.drop_table("reviews")
    op.drop_table("favorites")
    op.drop_table("watch_history")
    op.drop_table("episodes")
    op.drop_table("seasons")
    op.drop_table("anime_genres")
    op.drop_table("anime")
    op.drop_table("genres")
    op.drop_table("users")
    op.drop_table("roles")

    op.execute("DROP TYPE IF EXISTS reviewstatus")
    op.execute("DROP TYPE IF EXISTS accountstatus")
