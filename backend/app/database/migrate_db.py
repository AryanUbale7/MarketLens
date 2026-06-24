import sys
from sqlalchemy import text

sys.path.append('C:/Users/ARYAN/OneDrive/Desktop/news_platform/backend')

from app.database.database import engine

def migrate():
    with engine.begin() as conn:
        print("Migrating sources table...")
        
        # Helper to execute alter and handle duplicate column error
        def add_column(column_def):
            try:
                conn.execute(text(f"ALTER TABLE sources ADD COLUMN {column_def};"))
                print(f"Executed: ALTER TABLE sources ADD COLUMN {column_def};")
            except Exception as e:
                # Catch error if column already exists (SQLAlchemy/psycopg2 will rollback the sub-transaction or connection)
                print(f"Failed to add column {column_def} (it might already exist): {e}")

        # In PostgreSQL, an error in a transaction block aborts the entire transaction.
        # So we run these in separate try/except blocks with connection/engine directly,
        # or we just check if columns exist first.
        
        # Let's check columns using inspector
        from sqlalchemy import inspect
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('sources')]
        print("Existing columns:", columns)
        
        if 'rss_url' not in columns:
            conn.execute(text("ALTER TABLE sources ADD COLUMN rss_url VARCHAR(500);"))
            print("Added rss_url column.")
        if 'is_active' not in columns:
            conn.execute(text("ALTER TABLE sources ADD COLUMN is_active BOOLEAN DEFAULT TRUE;"))
            print("Added is_active column.")
        if 'last_fetch_status' not in columns:
            conn.execute(text("ALTER TABLE sources ADD COLUMN last_fetch_status VARCHAR(50);"))
            print("Added last_fetch_status column.")
        if 'last_fetched_at' not in columns:
            conn.execute(text("ALTER TABLE sources ADD COLUMN last_fetched_at TIMESTAMP WITHOUT TIME ZONE;"))
            print("Added last_fetched_at column.")

        print("Migration finished successfully.")

if __name__ == '__main__':
    migrate()
