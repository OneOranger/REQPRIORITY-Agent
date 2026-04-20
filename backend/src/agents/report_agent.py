"""
ReportAgent - 生成决策报告和路线图
"""
import json
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from prompts.prompt_manager import prompt_manager
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("agents.report")


class ReportAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=0.5,
        ) if settings.openai_enabled else None

    async def generate_decision_report(self, requirements: list, graph_data: dict = None, trace_id: str = None) -> dict:
        """生成决策报告
        返回结构：{top10, decisionBasis, coreNodes, notRecommended, riskWarnings}
        """
        logger.info(f"开始生成决策报告: requirements={len(requirements)}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "ReportAgent", "generate_decision_report", f"需求数: {len(requirements)}")
        
        # 基础数据计算
        sorted_reqs = sorted(requirements, key=lambda x: x.get("totalScore", 0), reverse=True)
        top10 = sorted_reqs[:10]
        core_nodes = [r for r in requirements if r.get("isGraphCore")]
        not_recommended = [r for r in requirements if r.get("totalScore", 0) < 50]
        not_recommended.sort(key=lambda x: x.get("totalScore", 0))

        # 统计信息
        total = len(requirements)
        p0_count = len([r for r in requirements if r.get("priority") == "P0"])
        high_risk_count = len([r for r in requirements if r.get("riskLevel") == "高"])

        if self.llm:
            try:
                system_prompt = prompt_manager.get_system_prompt("report")
                task_prompt = prompt_manager.get_task_prompt(
                    "report", "generate",
                    top10=json.dumps(top10[:5], ensure_ascii=False, indent=2),
                    core_nodes=json.dumps(core_nodes[:5], ensure_ascii=False, indent=2),
                    not_recommended=json.dumps(not_recommended[:3], ensure_ascii=False, indent=2),
                    total=total,
                    p0_count=p0_count,
                    high_risk_count=high_risk_count,
                )
                
                logger.debug(f"调用LLM生成决策报告, model={settings.openai_model}")
                response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_prompt),
                ])
                result = self._extract_json(response.content)
                if result:
                    logger.info(f"LLM决策报告生成完成")
                    
                    report = {
                        "top10": top10,
                        "coreNodes": core_nodes,
                        "notRecommended": not_recommended,
                        "decisionBasis": result.get("decisionBasis", self._fallback_decision_basis(requirements)),
                        "riskWarnings": result.get("riskWarnings", self._fallback_risk_warnings(requirements)),
                        "summary": self._build_summary(requirements),
                    }
                    
                    if trace_id and step_id:
                        trace_manager.complete_step(trace_id, step_id,
                            output_summary=f"报告生成完成: top10={len(top10)}",
                            llm_called=True,
                            llm_model=settings.openai_model,
                            llm_prompt_preview=task_prompt[:200],
                            llm_response_preview=response.content[:200])
                    return report
            except Exception as e:
                logger.error(f"LLM决策报告生成失败: {e}")
                if trace_id and step_id:
                    trace_manager.complete_step(trace_id, step_id, error=str(e))

        logger.info("使用规则回退生成报告")
        result = self._fallback_report(requirements, top10, core_nodes, not_recommended)
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, output_summary=f"回退报告: top10={len(top10)}", llm_called=False)
        return result

    async def generate_roadmap(self, requirements: list, trace_id: str = None) -> list:
        """生成路线图
        返回: [{"period": "Q3 2026", "label": "本季度", "items": [...], "reasoning": "..."}]
        """
        logger.info(f"开始生成路线图: requirements={len(requirements)}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "ReportAgent", "generate_roadmap", f"需求数: {len(requirements)}")
        
        # 按quarter分组
        quarters = {}
        for req in requirements:
            quarter = req.get("quarter")
            if quarter and quarter != "未排期":
                if quarter not in quarters:
                    quarters[quarter] = []
                quarters[quarter].append(req)

        if not quarters:
            logger.info("无排期数据，返回空路线图")
            if trace_id and step_id:
                trace_manager.complete_step(trace_id, step_id, output_summary="无排期数据", llm_called=False)
            return []

        # 排序quarter
        quarter_order = ["Q3 2026", "Q4 2026", "2027 H1", "2027 H2"]
        sorted_quarters = sorted(
            quarters.keys(),
            key=lambda q: quarter_order.index(q) if q in quarter_order else 99
        )

        # 生成label映射
        label_map = {}
        for i, q in enumerate(sorted_quarters):
            if i == 0:
                label_map[q] = "本季度"
            elif i == 1:
                label_map[q] = "下季度"
            else:
                label_map[q] = "远期"

        if self.llm:
            try:
                system_prompt = prompt_manager.get_system_prompt("report")
                # 构建roadmap数据用于LLM分析
                roadmap_data = []
                for q in sorted_quarters:
                    items = sorted(quarters[q], key=lambda x: x.get("totalScore", 0), reverse=True)
                    roadmap_data.append({
                        "period": q,
                        "items": [{"name": r.get("name"), "priority": r.get("priority"), "totalScore": r.get("totalScore"), "goal": r.get("goal")} for r in items[:5]]
                    })

                task_prompt = prompt_manager.get_task_prompt(
                    "report", "roadmap",
                    roadmap=json.dumps(roadmap_data, ensure_ascii=False, indent=2),
                )  # uses report_roadmap.md template
                
                logger.debug(f"调用LLM生成路线图, model={settings.openai_model}")
                response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_prompt),
                ])
                result = self._extract_json(response.content)
                if result and isinstance(result, list):
                    logger.info(f"LLM路线图生成完成")
                    # 合并AI推理说明到数据
                    reasonings = {r.get("period"): r.get("reasoning", "") for r in result}
                    roadmap = []
                    for q in sorted_quarters:
                        items = sorted(quarters[q], key=lambda x: x.get("totalScore", 0), reverse=True)
                        roadmap.append({
                            "period": q,
                            "label": label_map.get(q, ""),
                            "items": items,
                            "reasoning": reasonings.get(q, self._fallback_reasoning(q, items)),
                        })
                    
                    if trace_id and step_id:
                        trace_manager.complete_step(trace_id, step_id,
                            output_summary=f"路线图生成完成: {len(roadmap)}个阶段",
                            llm_called=True,
                            llm_model=settings.openai_model,
                            llm_prompt_preview=task_prompt[:200],
                            llm_response_preview=response.content[:200])
                    return roadmap
            except Exception as e:
                logger.error(f"LLM路线图生成失败: {e}")
                if trace_id and step_id:
                    trace_manager.complete_step(trace_id, step_id, error=str(e))

        logger.info("使用规则回退生成路线图")
        roadmap = []
        for q in sorted_quarters:
            items = sorted(quarters[q], key=lambda x: x.get("totalScore", 0), reverse=True)
            roadmap.append({
                "period": q,
                "label": label_map.get(q, ""),
                "items": items,
                "reasoning": self._fallback_reasoning(q, items),
            })
        
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, output_summary=f"回退路线图: {len(roadmap)}个阶段", llm_called=False)
        return roadmap

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

    def _fallback_decision_basis(self, requirements: list) -> list:
        """规则生成决策依据"""
        p0_reqs = [r for r in requirements if r.get("priority") == "P0"]
        core_reqs = [r for r in requirements if r.get("isGraphCore")]
        high_risk_reqs = [r for r in requirements if r.get("riskLevel") == "高"]
        basis = []
        if p0_reqs:
            basis.append(f"共{len(p0_reqs)}个P0级需求需要本期优先保障交付，直接影响核心业务指标")
        if core_reqs:
            basis.append(f"图谱分析显示{len(core_reqs)}个核心节点需求，建议优先完成以解锁下游依赖")
        basis.append("当前优先级策略：高业务价值 + 低实施风险 + 图谱连通性综合权衡")
        if high_risk_reqs:
            basis.append(f"{len(high_risk_reqs)}个高风险需求建议重点监控或拆分实施")
        return basis

    def _fallback_risk_warnings(self, requirements: list) -> list:
        """规则生成风险提醒"""
        warnings = []
        high_risk = [r for r in requirements if r.get("riskLevel") == "高"]
        conflicts = [r for r in requirements if r.get("conflictCount", 0) > 0]
        no_strategy = [r for r in requirements if not r.get("alignsWithStrategy")]
        if high_risk:
            names = "、".join(r.get("name", "") for r in high_risk[:3])
            warnings.append(f"高风险需求（{names}）建议制定专项风险缓解方案")
        if conflicts:
            names = "、".join(r.get("name", "") for r in conflicts[:2])
            warnings.append(f"存在冲突依赖的需求（{names}）需要协调排期，避免资源竞争")
        if no_strategy:
            warnings.append(f"{len(no_strategy)}个需求与当前战略方向不一致，建议重新评估必要性")
        warnings.append("建议为P0需求预留20%的缓冲时间，防止突发问题影响整体计划")
        return warnings

    def _fallback_reasoning(self, quarter: str, items: list) -> str:
        """规则生成阶段推理说明"""
        p0_count = len([r for r in items if r.get("priority") == "P0"])
        p1_count = len([r for r in items if r.get("priority") == "P1"])
        goals = list(set(r.get("goal", "") for r in items if r.get("goal")))[:3]
        goal_str = "、".join(goals) if goals else "核心目标"
        if quarter in ["Q3 2026", "Q3"]:
            return f"聚焦核心交付：{p0_count}个P0需求、{p1_count}个P1需求，核心目标为{goal_str}，奠定增长基础"
        elif quarter in ["Q4 2026", "Q4"]:
            return f"承接上期成果：完成{p1_count}个P1需求，拓展{goal_str}能力，支撑业务深化"
        else:
            return f"远期规划：共{len(items)}个需求，按基础设施完成情况逐步排入，目标覆盖{goal_str}"

    def _fallback_report(self, requirements: list, top10: list, core_nodes: list, not_recommended: list) -> dict:
        """规则回退完整报告"""
        return {
            "top10": top10,
            "coreNodes": core_nodes,
            "notRecommended": not_recommended,
            "decisionBasis": self._fallback_decision_basis(requirements),
            "riskWarnings": self._fallback_risk_warnings(requirements),
            "summary": self._build_summary(requirements),
        }

    def _build_summary(self, requirements: list) -> dict:
        total = len(requirements)
        p0_count = len([r for r in requirements if r.get("priority") == "P0"])
        p1_count = len([r for r in requirements if r.get("priority") == "P1"])
        high_risk_count = len([r for r in requirements if r.get("riskLevel") == "高"])
        avg_score = round(sum(r.get("totalScore", 0) for r in requirements) / total, 1) if total > 0 else 0
        return {
            "totalRequirements": total,
            "p0Count": p0_count,
            "p1Count": p1_count,
            "highRiskCount": high_risk_count,
            "avgScore": avg_score,
        }


report_agent = ReportAgent()
