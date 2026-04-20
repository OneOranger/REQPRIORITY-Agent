"""
ParserAgent - 解析需求文本/文档，提取结构化信息
使用LLM解析需求，如果LLM不可用则回退到规则解析
"""
import json
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from prompts.prompt_manager import prompt_manager
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("agents.parser")


class ParserAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=settings.openai_temperature,
        ) if settings.openai_enabled else None
    
    async def parse_requirement(
        self,
        title: str = "",
        value: str = "",
        module: str = "",
        target_user: str = "",
        goal: str = "",
        document_content: str = "",
        trace_id: str = None,
    ) -> dict:
        """解析需求文本，返回结构化数据"""
        logger.info(f"开始解析需求: title={title}, module={module}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "ParserAgent", "parse_requirement", f"标题: {title}")
        
        if self.llm:
            try:
                system_prompt = prompt_manager.get_system_prompt("parser")
                task_prompt = prompt_manager.get_task_prompt(
                    "parser", "parse",
                    title=title or "未提供",
                    value=value or "未提供",
                    module=module or "未指定",
                    target_user=target_user or "未指定",
                    goal=goal or "未指定",
                    document_content=f"## 文档内容\n{document_content}" if document_content else "",
                )
                
                logger.debug(f"调用LLM解析需求, model={settings.openai_model}")
                response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_prompt),
                ])
                
                # 提取JSON
                result = self._extract_json(response.content)
                if result:
                    logger.info(f"LLM解析完成: name={result.get('name')}")
                    
                    if trace_id and step_id:
                        trace_manager.complete_step(trace_id, step_id,
                            output_summary=f"解析结果: {result.get('name', '')}",
                            llm_called=True,
                            llm_model=settings.openai_model,
                            llm_prompt_preview=task_prompt[:200],
                            llm_response_preview=response.content[:200],
                            llm_prompt_full=task_prompt,
                            llm_response_full=response.content,
                            used_fallback=False)
                    return result
            except Exception as e:
                logger.error(f"LLM解析失败: {e}")
                if trace_id and step_id:
                    trace_manager.complete_step(trace_id, step_id, error=str(e))
        
        logger.info("使用规则回退解析")
        result = self._fallback_parse(title, value, module, target_user, goal)
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, 
                output_summary=f"回退解析: {result.get('name')}", 
                llm_called=False,
                used_fallback=True)
        return result
    
    def _extract_json(self, text: str) -> Optional[dict]:
        """从LLM响应中提取JSON"""
        try:
            # 尝试直接解析
            return json.loads(text)
        except:
            pass
        # 尝试从markdown代码块中提取
        import re
        json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except:
                pass
        return None
    
    def _fallback_parse(self, title, value, module, target_user, goal) -> dict:
        """规则回退解析"""
        return {
            "name": title or "未命名需求",
            "description": value or "AI自动生成的需求描述",
            "module": module or "用户系统",
            "targetUser": target_user or "全部用户",
            "goal": goal or "提升用户体验",
            "impactPath": "需求提出→分析→实施",
            "aiSuggestion": "建议进一步细化需求描述后进行评分",
            "aiExplanation": "该需求已通过AI初步解析，建议补充更多细节以获得更准确的分析结果。",
        }

parser_agent = ParserAgent()
