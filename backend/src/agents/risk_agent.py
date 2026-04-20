"""
RiskAgent - 风险识别、依赖冲突检测、风险等级评估
"""
import json
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from prompts.prompt_manager import prompt_manager
from tools.score_calculator import score_calculator
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("agents.risk")


class RiskAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=0.3,
        ) if settings.openai_enabled else None

    async def assess_requirement(self, requirement: dict, context: dict = None, trace_id: str = None) -> dict:
        """评估单个需求的风险"""
        req_name = requirement.get("name", "未命名")
        logger.info(f"开始评估风险: name={req_name}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "RiskAgent", "assess_requirement", f"需求: {req_name}")
        
        if self.llm:
            try:
                system_prompt = prompt_manager.get_system_prompt("risk")
                task_prompt = prompt_manager.get_task_prompt(
                    "risk", "assess",
                    requirement=json.dumps(requirement, ensure_ascii=False, indent=2),
                    context=json.dumps(context, ensure_ascii=False, indent=2) if context else "无",
                )

                logger.debug(f"调用LLM评估风险, model={settings.openai_model}")
                response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_prompt),
                ])

                result = self._extract_json(response.content)
                if result:
                    validated = self._validate_risk_assessment(result)
                    logger.info(f"LLM风险评估完成: riskLevel={validated.get('riskLevel')}")
                    
                    if trace_id and step_id:
                        trace_manager.complete_step(trace_id, step_id,
                            output_summary=f"风险等级: {validated.get('riskLevel')}",
                            llm_called=True,
                            llm_model=settings.openai_model,
                            llm_prompt_preview=task_prompt[:200],
                            llm_response_preview=response.content[:200])
                    return validated
            except Exception as e:
                logger.error(f"LLM风险评估失败: {e}")
                if trace_id and step_id:
                    trace_manager.complete_step(trace_id, step_id, error=str(e))

        logger.info("使用规则回退评估")
        result = self._fallback_assess(requirement, context)
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, output_summary=f"回退评估: riskLevel={result.get('riskLevel')}", llm_called=False)
        return result

    async def assess_high_risk_requirements(self, requirements: list, graph_edges: list, trace_id: str = None) -> list:
        """评估所有高风险需求，返回风险卡片数据"""
        logger.info(f"开始评估高风险需求: count={len(requirements)}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "RiskAgent", "assess_high_risk", f"需求数: {len(requirements)}")
        
        high_risk_cards = []

        for req in requirements:
            risk_level = req.get("riskLevel", "低")
            if risk_level == "高":
                # 分析依赖链
                req_id = req.get("id", "")
                dependency_chain = self._analyze_dependency_chain(req_id, requirements, graph_edges)

                card = {
                    "name": req.get("name", ""),
                    "priority": req.get("priority", ""),
                    "risks": [
                        f"依赖数量: {req.get('dependencyCount', 0)}个",
                        f"冲突数量: {req.get('conflictCount', 0)}个",
                        "涉及多个系统改造",
                        "技术方案复杂",
                    ],
                    "suggestions": [
                        "拆分需求降低风险",
                        "提前进行技术预研",
                        "制定应急预案",
                    ],
                    "aiSuggestion": "建议将该需求拆分为多个小迭代，降低单次发布风险。",
                    "dependencyChain": dependency_chain,
                }
                high_risk_cards.append(card)

        logger.info(f"高风险需求评估完成: high_risk_count={len(high_risk_cards)}")
        
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, output_summary=f"高风险数: {len(high_risk_cards)}", llm_called=False)
        
        return high_risk_cards[:5]  # 返回前5个

    async def get_risk_overview(self, requirements: list, graph_edges: list, trace_id: str = None) -> dict:
        """获取风险概览"""
        logger.info(f"开始获取风险概览: count={len(requirements)}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "RiskAgent", "get_risk_overview", f"需求数: {len(requirements)}")
        
        # 统计风险分布
        high = len([r for r in requirements if r.get("riskLevel") == "高"])
        medium = len([r for r in requirements if r.get("riskLevel") == "中"])
        low = len([r for r in requirements if r.get("riskLevel") == "低"])

        # 统计风险分类
        high_dep = len([r for r in requirements if r.get("dependencyCount", 0) >= 3])
        no_strategy = len([r for r in requirements if not r.get("alignsWithStrategy")])
        conflicts = len([r for r in requirements if r.get("conflictCount", 0) > 0])

        # 计算重复建设（基于模块判断）
        module_counts = {}
        for r in requirements:
            module = r.get("module", "未分类")
            module_counts[module] = module_counts.get(module, 0) + 1
        duplicate = len([m for m, count in module_counts.items() if count >= 3])

        result = {
            "distribution": [
                {"name": "高风险", "value": high, "color": "#ef4444"},
                {"name": "中风险", "value": medium, "color": "#f97316"},
                {"name": "低风险", "value": low, "color": "#22c55e"},
            ],
            "categories": [
                {"name": "高依赖", "count": high_dep, "icon": "Link2"},
                {"name": "战略不一致", "count": no_strategy, "icon": "Target"},
                {"name": "冲突需求", "count": conflicts, "icon": "AlertTriangle"},
                {"name": "重复建设", "count": duplicate, "icon": "Copy"},
            ]
        }
        
        logger.info(f"风险概览完成: high={high}, medium={medium}, low={low}")
        
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, output_summary=f"风险分布: 高{high} 中{medium} 低{low}", llm_called=False)
        
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

    def _validate_risk_assessment(self, result: dict) -> dict:
        """验证风险评估结果"""
        risk_level = result.get("riskLevel", "低")
        if risk_level not in ["高", "中", "低"]:
            risk_level = "低"

        risk_deduction = max(-30, min(0, float(result.get("riskDeduction", -5))))

        return {
            "riskLevel": risk_level,
            "risks": result.get("risks", []),
            "suggestions": result.get("suggestions", []),
            "riskDeduction": risk_deduction,
            "aiAnalysis": result.get("aiAnalysis", ""),
        }

    def _fallback_assess(self, requirement: dict, context: dict = None) -> dict:
        """规则回退评估"""
        dependency_count = requirement.get("dependencyCount", 0)
        conflict_count = requirement.get("conflictCount", 0)
        risk_deduction = requirement.get("riskDeduction", -5)

        # 使用score_calculator确定风险等级
        risk_level = score_calculator.determine_risk_level(
            risk_deduction, dependency_count, conflict_count
        )

        risks = []
        suggestions = []

        if dependency_count >= 3:
            risks.append(f"高依赖风险：依赖{dependency_count}个其他需求")
            suggestions.append("评估依赖链完整性，确保前置需求按时交付")

        if conflict_count > 0:
            risks.append(f"冲突风险：与{conflict_count}个需求存在冲突")
            suggestions.append("协调冲突需求，制定资源分配方案")

        if risk_level == "高":
            risks.append("整体风险较高，建议重点关注")
            suggestions.append("进行技术预研，制定详细的风险缓解计划")
        elif risk_level == "中":
            risks.append("风险适中，需要监控")
            suggestions.append("定期评估风险状态")

        return {
            "riskLevel": risk_level,
            "risks": risks if risks else ["暂无显著风险"],
            "suggestions": suggestions if suggestions else ["按正常流程推进"],
            "riskDeduction": risk_deduction,
            "aiAnalysis": f"基于规则评估：该需求风险等级为{risk_level}，依赖数{dependency_count}，冲突数{conflict_count}。",
        }

    def _analyze_dependency_chain(self, req_id: str, requirements: list, edges: list) -> list:
        """分析需求的依赖链"""
        chain = []
        visited = set()

        def find_dependencies(current_id, depth=0):
            if depth > 3 or current_id in visited:  # 限制深度
                return
            visited.add(current_id)

            # 找到直接依赖
            for edge in edges:
                if edge["source"] == current_id and edge["type"] == "dependency":
                    target_id = edge["target"]
                    target_req = next((r for r in requirements if r.get("id") == target_id), None)
                    if target_req:
                        chain.append({
                            "id": target_id,
                            "name": target_req.get("name", ""),
                            "priority": target_req.get("priority", ""),
                            "depth": depth + 1,
                        })
                        find_dependencies(target_id, depth + 1)

        find_dependencies(req_id)
        return chain[:5]  # 限制返回数量


risk_agent = RiskAgent()
