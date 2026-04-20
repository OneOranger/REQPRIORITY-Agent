"""
优先级排序算法 - 综合评分、约束条件计算最终优先级
"""
from tools.score_calculator import score_calculator
from logger import setup_logger

logger = setup_logger("tools.priority_ranker")


class PriorityRanker:
    """优先级排序器"""

    def rank_requirements(self, requirements: list, constraints: dict = None) -> list:
        """按优先级排序需求"""
        # 基于totalScore排序
        sorted_reqs = sorted(requirements, key=lambda r: r.get("totalScore", 0), reverse=True)
        logger.debug(f"优先级排序完成: count={len(sorted_reqs)}")
        return sorted_reqs

    def recalculate_priorities(self, requirements: list, constraints: dict = None) -> list:
        """根据约束条件重新计算所有优先级"""
        strategy = constraints.get("targetStrategy", "增长优先") if constraints else "增长优先"
        team_size = constraints.get("teamSize", "20人月") if constraints else "20人月"
        budget = constraints.get("budgetLevel", "中") if constraints else "中"

        logger.info(f"重新计算优先级: strategy={strategy}, team_size={team_size}, budget={budget}")

        # 根据策略调整权重
        strategy_weights = {
            "增长优先": {"business": 1.2, "user": 1.1, "strategy": 1.0},
            "收入优先": {"business": 1.3, "user": 0.9, "strategy": 1.1},
            "留存优先": {"business": 1.0, "user": 1.3, "strategy": 1.0},
        }
        weights = strategy_weights.get(strategy, {"business": 1.0, "user": 1.0, "strategy": 1.0})

        for req in requirements:
            adjusted_score = (
                req.get("businessScore", 5) * weights["business"] * 3 +
                req.get("userScore", 5) * weights["user"] * 2.5 +
                req.get("strategyScore", 5) * weights["strategy"] * 2 +
                req.get("costDeduction", 0) +
                req.get("riskDeduction", 0) +
                req.get("graphBonus", 0)
            )
            req["totalScore"] = round(max(0, min(100, adjusted_score)), 1)
            req["priority"] = score_calculator.determine_priority(req["totalScore"])

        result = sorted(requirements, key=lambda r: r["totalScore"], reverse=True)
        logger.info(f"优先级重算完成: count={len(result)}")
        return result

    def simulate_scenario(self, requirements: list, scenario: str, constraints: dict = None) -> dict:
        """模拟场景（规则版本，不依赖LLM）"""
        import copy
        adjusted = copy.deepcopy(requirements)

        logger.info(f"运行场景模拟: scenario={scenario}")

        result = {
            "adjustedRequirements": [],
            "summary": "",
            "risks": [],
            "recommendations": [],
        }

        scenario_lower = scenario.lower()

        if "资源" in scenario or "人月" in scenario or "10人月" in scenario:
            # 资源约束场景
            p0_reqs = [r for r in adjusted if r.get("priority") == "P0"]
            result["summary"] = f"在资源约束下，仅保留 {len(p0_reqs)} 个P0需求，其余需求建议延后"
            result["risks"] = ["部分P1需求延后可能影响后续排期", "核心链路外的需求将被暂停"]
            result["recommendations"] = ["聚焦P0核心需求", "P1需求移至下季度"]
            for r in adjusted:
                if r.get("priority") in ["P2", "P3"]:
                    result["adjustedRequirements"].append({
                        "id": r["id"], "name": r.get("name", ""),
                        "originalPriority": r["priority"], "newPriority": "P3",
                        "reason": "资源约束下延后处理"
                    })

        elif "目标" in scenario or "收入" in scenario:
            result["summary"] = "切换为收入优先策略后，与收入直接相关的需求优先级提升"
            result["risks"] = ["用户体验类需求优先级下降", "可能影响长期用户留存"]
            result["recommendations"] = ["优先实施支付和交易相关需求", "保留基础用户体验需求"]
            for r in adjusted:
                if r.get("module") in ["交易系统", "会员系统"]:
                    if r.get("priority") not in ["P0"]:
                        result["adjustedRequirements"].append({
                            "id": r["id"], "name": r.get("name", ""),
                            "originalPriority": r["priority"], "newPriority": "P1",
                            "reason": "收入优先策略下提升"
                        })

        elif "延期" in scenario or "延后" in scenario:
            result["summary"] = "关键需求延期将影响下游依赖需求的排期"
            result["risks"] = ["依赖链断裂", "后续需求无法按时启动"]
            result["recommendations"] = ["评估替代方案", "调整下游需求排期"]

        elif "增长" in scenario:
            result["summary"] = "增长优先策略下，用户相关需求优先级提升"
            result["risks"] = ["商业化需求优先级可能下降", "短期收入影响"]
            result["recommendations"] = ["优先实施用户增长相关需求", "关注注册转化和留存"]
            for r in adjusted:
                if r.get("module") in ["用户系统", "个性化"]:
                    if r.get("priority") not in ["P0"]:
                        result["adjustedRequirements"].append({
                            "id": r["id"], "name": r.get("name", ""),
                            "originalPriority": r["priority"], "newPriority": "P1",
                            "reason": "增长优先策略下提升"
                        })

        elif "稳定" in scenario:
            result["summary"] = "稳定优先策略下，高风险需求优先级降低"
            result["risks"] = ["新功能上线速度放缓", "可能错失市场机会"]
            result["recommendations"] = ["优先修复稳定性问题", "谨慎引入新功能"]
            for r in adjusted:
                if r.get("riskLevel") == "高" and r.get("priority") in ["P0", "P1"]:
                    result["adjustedRequirements"].append({
                        "id": r["id"], "name": r.get("name", ""),
                        "originalPriority": r["priority"], "newPriority": "P2",
                        "reason": "稳定优先策略下降低高风险需求"
                    })

        else:
            result["summary"] = f"基于场景「{scenario}」的分析：需要综合评估影响范围和优先级调整"
            result["risks"] = ["需要进一步评估具体影响"]
            result["recommendations"] = ["建议使用AI深度分析该场景"]

        logger.info(f"场景模拟完成: adjusted={len(result['adjustedRequirements'])}")
        return result

    def get_priority_distribution(self, requirements: list) -> dict:
        """获取优先级分布统计"""
        p0 = len([r for r in requirements if r.get("priority") == "P0"])
        p1 = len([r for r in requirements if r.get("priority") == "P1"])
        p2 = len([r for r in requirements if r.get("priority") == "P2"])
        p3 = len([r for r in requirements if r.get("priority") == "P3"])

        logger.debug(f"优先级分布: P0={p0}, P1={p1}, P2={p2}, P3={p3}")
        return {
            "P0": p0,
            "P1": p1,
            "P2": p2,
            "P3": p3,
            "total": len(requirements),
            "distribution": [
                {"name": "P0", "value": p0, "color": "#ef4444"},
                {"name": "P1", "value": p1, "color": "#f97316"},
                {"name": "P2", "value": p2, "color": "#eab308"},
                {"name": "P3", "value": p3, "color": "#22c55e"},
            ]
        }

    def get_priority_matrix(self, requirements: list) -> dict:
        """获取优先级矩阵（价值vs风险）"""
        matrix = {
            "highValueLowRisk": [],
            "highValueHighRisk": [],
            "lowValueLowRisk": [],
            "lowValueHighRisk": []
        }

        for req in requirements:
            score = req.get("totalScore", 0)
            risk = req.get("riskLevel", "低")

            if score >= 70 and risk == "低":
                matrix["highValueLowRisk"].append(req)
            elif score >= 70 and risk != "低":
                matrix["highValueHighRisk"].append(req)
            elif score < 70 and risk == "低":
                matrix["lowValueLowRisk"].append(req)
            else:
                matrix["lowValueHighRisk"].append(req)

        return matrix


priority_ranker = PriorityRanker()
