from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.gptsapi.net/v1"
    openai_temperature: float = 0.7
    openai_enabled: bool = True
    
    # LangSmith
    langsmith_tracing: bool = True
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "ai-recruitment"
    
    # Tavily
    tavily_api_key: str = ""
    
    # JWT
    jwt_secret_key: str = "ai-recruitment-platform-secret-key-2026"
    
    # Storage
    data_dir: Path = Path(__file__).parent / "storage" / "data"
    
    model_config = {"env_file": str(Path(__file__).parent.parent / ".env"), "extra": "ignore"}


settings = Settings()
