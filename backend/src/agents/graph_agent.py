"""
GraphAgent - 分析需求间关系，构建知识图谱，计算图谱加成
"""
import json
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from prompts.prompt_manager import prompt_manager
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("agents.graph")


class GraphAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=0.3,
        ) if settings.openai_enabled else None

    async def analyze_requirement(self, requirement: dict, existing_nodes: list, existing_edges: list, trace_id: str = None) -> dict:
        """分析新需求与已有图谱的关系"""
        req_name = requirement.get("name", "未命名")
        logger.info(f"开始分析需求图谱关系: name={req_name}, nodes={len(existing_nodes)}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "GraphAgent", "analyze_requirement", f"需求: {req_name}")
        
        if self.llm:
            try:
                system_prompt = prompt_manager.get_system_prompt("graph")
                task_prompt = prompt_manager.get_task_prompt(
                    "graph", "analyze",
                    requirement=json.dumps(requirement, ensure_ascii=False, indent=2),
                    existing_nodes=json.dumps(existing_nodes, ensure_ascii=False, indent=2),
                    existing_edges=json.dumps(existing_edges, ensure_ascii=False, indent=2),
                )

                logger.debug(f"调用LLM分析图谱关系, model={settings.openai_model}")
                response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_prompt),
                ])

                result = self._extract_json(response.content)
                if result:
                    validated = self._validate_analysis(result)
                    logger.info(f"LLM图谱分析完成: graphBonus={validated.get('graphBonus')}, newEdges={len(validated.get('newEdges', []))}")
                    
                    if trace_id and step_id:
                        trace_manager.complete_step(trace_id, step_id,
                            output_summary=f"图谱加成: {validated.get('graphBonus')}, 新边: {len(validated.get('newEdges', []))}",
                            llm_called=True,
                            llm_model=settings.openai_model,
                            llm_prompt_preview=task_prompt[:200],
                            llm_response_preview=response.content[:200])
                    return validated
            except Exception as e:
                logger.error(f"LLM图谱分析失败: {e}")
                if trace_id and step_id:
                    trace_manager.complete_step(trace_id, step_id, error=str(e))

        logger.info("使用规则回退分析")
        result = self._fallback_analyze(requirement, existing_nodes, existing_edges)
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, output_summary=f"回退分析: graphBonus={result.get('graphBonus')}", llm_called=False)
        return result

    async def analyze_full_graph(self, nodes: list, edges: list, requirements: list, trace_id: str = None) -> dict:
        """AI分析整个图谱，返回分析结论"""
        logger.info(f"开始全图分析: nodes={len(nodes)}, edges={len(edges)}")
        
        step_id = ""
        if trace_id:
            step_id = trace_manager.add_step(trace_id, "GraphAgent", "analyze_full_graph", f"节点: {len(nodes)}, 边: {len(edges)}")
        
        if self.llm:
            try:
                system_prompt = prompt_manager.get_system_prompt("graph")
                task_prompt = prompt_manager.get_task_prompt(
                    "graph", "analyze_full",
                    nodes=json.dumps(nodes, ensure_ascii=False, indent=2),
                    edges=json.dumps(edges, ensure_ascii=False, indent=2),
                    requirements=json.dumps(requirements, ensure_ascii=False, indent=2),
                )

                logger.debug(f"调用LLM全图分析, model={settings.openai_model}")
                response = await self.llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_prompt),
                ])

                result = self._extract_json(response.content)
                if result:
                    logger.info(f"LLM全图分析完成")
                    
                    if trace_id and step_id:
                        trace_manager.complete_step(trace_id, step_id,
                            output_summary=f"分析完成: {len(result.get('insights', []))}条洞察",
                            llm_called=True,
                            llm_model=settings.openai_model,
                            llm_prompt_preview=task_prompt[:200],
                            llm_response_preview=response.content[:200])
                    return result
            except Exception as e:
                logger.error(f"LLM全图分析失败: {e}")
                if trace_id and step_id:
                    trace_manager.complete_step(trace_id, step_id, error=str(e))

        logger.info("使用规则回退全图分析")
        result = self._fallback_full_analysis(nodes, edges)
        if trace_id and step_id:
            trace_manager.complete_step(trace_id, step_id, output_summary="回退全图分析", llm_called=False)
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

    def _validate_analysis(self, result: dict) -> dict:
        """验证分析结果"""
        return {
            "newEdges": result.get("newEdges", []),
            "isCore": result.get("isCore", False),
            "graphBonus": max(0, min(20, float(result.get("graphBonus", 5)))),
            "analysis": result.get("analysis", "分析完成"),
        }

    def _fallback_analyze(self, requirement: dict, nodes: list, edges: list) -> dict:
        """规则回退分析"""
        req_module = requirement.get("module", "")
        req_goal = requirement.get("goal", "")
        req_id = requirement.get("id", "")

        new_edges = []
        is_core = False
        graph_bonus = 5

        # 基于模块匹配找同模块需求建立weak关联
        for node in nodes:
            if node.get("module") == req_module and node.get("id") != req_id:
                new_edges.append({
                    "source": req_id,
                    "target": node["id"],
                    "type": "weak",
                    "label": "同模块"
                })

        # 基于goal匹配找同目标需求建立sameGoal关联
        for node in nodes:
            if node.get("goal") == req_goal and node.get("id") != req_id:
                new_edges.append({
                    "source": req_id,
                    "target": node["id"],
                    "type": "sameGoal",
                    "label": "同目标"
                })

        # 根据已有连接数判断是否为核心节点
        connection_count = len(new_edges)
        if connection_count >= 3:
            is_core = True
            graph_bonus = 12
        elif connection_count >= 1:
            graph_bonus = 8

        return {
            "newEdges": new_edges,
            "isCore": is_core,
            "graphBonus": graph_bonus,
            "analysis": f"基于规则分析，该需求与{connection_count}个现有需求存在关联",
        }

    def _fallback_full_analysis(self, nodes: list, edges: list) -> dict:
        """全图分析回退"""
        core_nodes = [n for n in nodes if n.get("isCore")]
        high_degree = {}
        for e in edges:
            high_degree[e["source"]] = high_degree.get(e["source"], 0) + 1
            high_degree[e["target"]] = high_degree.get(e["target"], 0) + 1

        # 找出度数最高的节点
        sorted_nodes = sorted(high_degree.items(), key=lambda x: x[1], reverse=True)
        critical_paths = [n[0] for n in sorted_nodes[:3]]

        return {
            "insights": [
                f"当前图谱共有 {len(nodes)} 个需求节点和 {len(edges)} 条关系边",
                f"核心节点 {len(core_nodes)} 个，分别为：{', '.join(n['label'] for n in core_nodes[:5])}",
                "建议优先实施核心节点需求，以最大化解锁下游需求",
                "注意冲突关系可能导致的资源竞争问题",
            ],
            "coreNodes": [n["id"] for n in core_nodes],
            "criticalPaths": critical_paths,
        }


graph_agent = GraphAgent()
