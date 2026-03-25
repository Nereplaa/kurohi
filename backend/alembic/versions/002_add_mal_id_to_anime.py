"""add mal_id to anime

Revision ID: 002
Revises: 001
Create Date: 2026-03-24

"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "anime",
        sa.Column("mal_id", sa.Integer(), nullable=True),
    )
    op.create_index("ix_anime_mal_id", "anime", ["mal_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_anime_mal_id", table_name="anime")
    op.drop_column("anime", "mal_id")
