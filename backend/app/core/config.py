import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

SOURCE_BASE_DIR = Path(__file__).resolve().parents[2]
BASE_DIR = Path(os.getenv("LOCALMIND_BASE_DIR", str(SOURCE_BASE_DIR))).resolve()
BASE_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(BASE_DIR / ".env")
if BASE_DIR != SOURCE_BASE_DIR:
    load_dotenv(SOURCE_BASE_DIR / ".env", override=False)


class Settings(BaseModel):
    app_name: str = "LocalMind API"
    app_version: str = "0.1.0"
    upload_dir: str = str(BASE_DIR / "uploads")
    chroma_persist_dir: str = str(BASE_DIR / "chroma_db")
    chroma_collection_name: str = "localmind_documents"
    deepseek_api_base: str = "https://api.deepseek.com"
    deepseek_api_key: str | None = None
    deepseek_model: str = "deepseek-v4-flash"


settings = Settings(
    app_name=os.getenv("LOCALMIND_APP_NAME", "LocalMind API"),
    app_version=os.getenv("LOCALMIND_APP_VERSION", "0.1.0"),
    upload_dir=os.getenv("LOCALMIND_UPLOAD_DIR", str(BASE_DIR / "uploads")),
    chroma_persist_dir=os.getenv(
        "LOCALMIND_CHROMA_DIR",
        str(BASE_DIR / "chroma_db"),
    ),
    chroma_collection_name=os.getenv("LOCALMIND_CHROMA_COLLECTION", "localmind_documents"),
    deepseek_api_base=os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com"),
    deepseek_api_key=os.getenv("DEEPSEEK_API_KEY"),
    deepseek_model=os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash"),
)
