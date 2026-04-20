"""
主控编排Agent - 接收前端请求，分析意图，编排调用链
"""
from config import settings
from langchain_openai import ChatOpenAI

class Orchestrator:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=settings.openai_temperature,
        ) if settings.openai_enabled else None
    
    def get_llm(self):
        return self.llm

orchestrator = Orchestrator()
