"""Configuration settings for Yojana Sahayak backend.

Loads from environment variables and .env file with comprehensive defaults.
Follows Blueprint V2 Section 14.4 & Section 21.
"""

from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core Application
    app_name: str = "Yojana Sahayak"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    timezone: str = "Asia/Kolkata"
    default_language: str = "hi"
    api_v1_prefix: str = "/api/v1"
    version: str = "1.0.0"

    # Security & CORS
    allowed_origins: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    admin_session_secret: str = "dev-insecure-secret-key-change-in-production"
    admin_username: str = "admin"
    admin_password: str = "adminpassword"
    admin_master_key: str = "yojana-admin-master-2026"

    # Storage & Persistence
    database_url: str = "sqlite+aiosqlite:///./data/yojana_sahayak.db"
    database_sync_url: str = "sqlite:///./data/yojana_sahayak.db"
    data_dir: Path = Path("./data")
    chroma_persist_dir: Path = Path("./data/indexes/chroma")

    # LLM Settings (Groq API)
    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3.8-27b"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    llm_temperature: float = 0.1
    llm_max_output_tokens: int = 700
    llm_timeout_seconds: int = 45

    # Embedding & Retrieval
    embedding_model: str = "intfloat/multilingual-e5-base"
    embedding_query_prefix: str = "query: "
    embedding_passage_prefix: str = "passage: "
    dense_k: int = 20
    sparse_k: int = 20
    rrf_k: int = 60
    final_k: int = 5

    # Scraper & Scheduler
    scraper_enabled: bool = True
    scraper_user_agent: str = "YojanaSahayakResearchBot/1.0 (contact: admin@yojanasahayak.local)"
    scraper_default_cron: str = "0 3 * * *"
    scraper_max_concurrent_sources: int = 2
    scraper_request_interval_seconds: int = 5
    scheduler_process_mode: str = "dedicated_single_instance"

    # Email Reminders & Notifications
    email_notifications_enabled: bool = False
    email_provider: str = "resend"  # "resend" or "smtp"
    resend_api_key: str = ""
    smtp_host: str = "smtp.example.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@yojanasahayak.gov.in"

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
