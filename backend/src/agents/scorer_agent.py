"""
ScorerAgent - 6维度自动评分
"""
import json
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from prompts.prompt_manager import prompt_manager
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("agents.scorer")


class ScorerAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=0.3,  # 评分需要更稳定的输出
        ) if settings.openai_enabled else None
    
    async def score_requirement(self, requirement: dict, context: dict = None, trace_id: str = None) -> dict:
        """对需求进行6维度评分"""
        req_name = requirement.get("name", "未命名")
        logger.info(f"开始评分需求: name={req_name}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "ScorerAgent", "score_requirement", f"需求: {req_name}")
        
        if self.llm:
            try:
                system_prompt = prompt_manager.get_system_prompt("scorer")
                task_prompt = prompt_manager.get_task_prompt(
                    "scorer", "evaluate",
                    name=requirement.get("name", ""),
                    description=requirement.get("description", ""),
                    module=requirement.get("module", ""),
                    target_user=requirement.get("targetUser", ""),
                    goal=requirement.get("goal", ""),
                    impact_path=requirement.get("impactPath", ""),
                    source=requirement.get("source", ""),
                    existing_requirements=json.dumps(context.get("requirements", [])[:5], ensure_ascii=False, indent=2) if context else "无",
                    graph_context=json.dumps(context.get("graph", {}), ensure_ascii=False, indent=2) if context else "无",
                )
                
                logger.debug(f"调用LLM评分, model={settings.openai_model}")
                response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_prompt),
                ])
                
                result = self._extract_json(response.content)
                if result:
                    validated = self._validate_scores(result)
                    logger.info(f"LLM评分完成: totalScore={validated.get('totalScore')}")
                    
                    if trace_id and step_id:
                        trace_manager.complete_step(trace_id, step_id,
                            output_summary=f"总分: {validated.get('totalScore')}",
                            llm_called=True,
                            llm_model=settings.openai_model,
                            llm_prompt_preview=task_prompt[:200],
                            llm_response_preview=response.content[:200],
                            llm_prompt_full=task_prompt,
                            llm_response_full=response.content,
                            used_fallback=False)
                    return validated
            except Exception as e:
                logger.error(f"LLM评分失败: {e}")
                if trace_id and step_id:
                    trace_manager.complete_step(trace_id, step_id, error=str(e))
        
        logger.info("使用规则回退评分")
        result = self._fallback_score(requirement)
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, 
                output_summary=f"回退评分: {result.get('totalScore')}", 
                llm_called=False,
                used_fallback=True)
        return result
    
    def _extract_json(self, text: str) -> Optional[dict]:
        """从LLM响应中提取JSON"""
        try:
            return json.loads(text)
        except:
            pass
        import re
        json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except:
                pass
        return None
    
    def _validate_scores(self, scores: dict) -> dict:
        """验证和归一化评分"""
        # 提取各维度评分理由
        reasons = scores.get("reasons", {})
        
        return {
            "businessScore": max(0, min(10, float(scores.get("businessScore", 5)))),
            "userScore": max(0, min(10, float(scores.get("userScore", 5)))),
            "strategyScore": max(0, min(10, float(scores.get("strategyScore", 5)))),
            "costDeduction": max(-30, min(0, float(scores.get("costDeduction", -10)))),
            "riskDeduction": max(-30, min(0, float(scores.get("riskDeduction", -5)))),
            "graphBonus": max(0, min(20, float(scores.get("graphBonus", 5)))),
            "totalScore": float(scores.get("totalScore", 50)),
            "reasons": {
                "business": reasons.get("business", "业务价值评估完成"),
                "user": reasons.get("user", "用户价值评估完成"),
                "strategy": reasons.get("strategy", "战略价值评估完成"),
                "cost": reasons.get("cost", "实施成本评估完成"),
                "risk": reasons.get("risk", "风险评估完成"),
                "graph": reasons.get("graph", "图谱关联评估完成"),
            },
            "aiExplanation": scores.get("aiExplanation", "AI评分完成"),
            "aiSuggestion": scores.get("aiSuggestion", "建议关注该需求"),
        }
    
    def _fallback_score(self, requirement: dict) -> dict:
        """规则回退评分"""
        # 基于简单规则给出默认评分
        business = 6.0
        user = 6.0
        strategy = 5.5
        cost = -8
        risk = -4
        graph = 4
        total = round((business + user + strategy) * 10 / 3 + cost + risk + graph, 1)
        total = max(0, min(100, total))
        
        req_name = requirement.get('name', '未知')
        
        return {
            "businessScore": business,
            "userScore": user,
            "strategyScore": strategy,
            "costDeduction": cost,
            "riskDeduction": risk,
            "graphBonus": graph,
            "totalScore": total,
            "reasons": {
                "business": f"需求「{req_name}」对核心业务目标有一定支持作用",
                "user": "目标用户存在一定痛点，预计影响中等规模用户群体",
                "strategy": "与公司战略方向基本一致",
                "cost": "开发工作量中等，技术复杂度可控",
                "risk": "技术实现风险较低，建议进行详细评估",
                "graph": "在需求图谱中具有一定关联性",
            },
            "aiExplanation": f"需求「{req_name}」已完成自动评分。业务价值中等，建议进一步人工校准。",
            "aiSuggestion": "建议进行人工评分校准以获得更准确的优先级判断",
        }

scorer_agent = ScorerAgent()
