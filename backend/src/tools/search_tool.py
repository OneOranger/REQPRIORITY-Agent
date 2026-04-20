"""
搜索工具 - 封装 Tavily 搜索 API
"""
from config import settings
from typing import List
from logger import setup_logger

logger = setup_logger("tools.search_tool")


class SearchTool:
    def __init__(self):
        self._client = None
        self._available = False
        if settings.tavily_api_key:
            try:
                from tavily import TavilyClient
                self._client = TavilyClient(api_key=settings.tavily_api_key)
                self._available = True
                logger.info("SearchTool初始化成功")
            except ImportError:
                logger.warning("SearchTool: tavily-python not installed, search disabled")
            except Exception as e:
                logger.error(f"SearchTool init error: {e}")

    async def search(self, query: str, max_results: int = 5) -> List[dict]:
        """执行搜索，返回结果列表
        每个结果: {"title": str, "url": str, "content": str, "score": float}
        fallback: API key 不可用时返回空列表
        """
        if not self._available or not self._client:
            logger.debug("SearchTool不可用，返回空结果")
            return []
        try:
            logger.info(f"执行搜索: query={query[:50]}...")
            response = self._client.search(query=query, max_results=max_results)
            results = []
            for r in response.get("results", []):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", ""),
                    "score": r.get("score", 0.0),
                })
            logger.info(f"搜索完成: results={len(results)}")
            return results
        except Exception as e:
            logger.error(f"SearchTool search error: {e}")
            return []

    @property
    def is_available(self) -> bool:
        return self._available


search_tool = SearchTool()
