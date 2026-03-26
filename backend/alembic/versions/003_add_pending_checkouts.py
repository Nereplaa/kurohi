"""add pending_checkouts table

Revision ID: 003
Revises: 002
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pending_checkouts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("plan_name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pending_checkouts_id", "pending_checkouts", ["id"], unique=False)
    op.create_index("ix_pending_checkouts_token", "pending_checkouts", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_pending_checkouts_token", table_name="pending_checkouts")
    op.drop_index("ix_pending_checkouts_id", table_name="pending_checkouts")
    op.drop_table("pending_checkouts")
