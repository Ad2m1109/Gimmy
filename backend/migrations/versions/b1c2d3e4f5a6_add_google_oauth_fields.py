"""Add Google OAuth fields to users

Revision ID: b1c2d3e4f5a6
Revises: 36c9013d1159
Create Date: 2026-07-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = '36c9013d1159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add google_id column (unique, nullable)
    op.add_column('users', sa.Column('google_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
    
    # Add auth_provider column with default value
    op.add_column('users', sa.Column('auth_provider', sa.String(length=20), nullable=True))
    op.execute("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL")
    op.alter_column('users', 'auth_provider', nullable=False, server_default='local')
    
    # Make hashed_password nullable (for Google OAuth users)
    op.alter_column('users', 'hashed_password', nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Restore hashed_password to non-nullable
    op.alter_column('users', 'hashed_password', nullable=False)
    
    # Drop auth_provider column
    op.drop_column('users', 'auth_provider')
    
    # Drop google_id column and index
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'google_id')
