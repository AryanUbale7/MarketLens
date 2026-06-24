from sqlalchemy import text
from app.database.database import engine

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("Database Connected Successfully!")
except Exception as e:
    print("Connection Error:", e)