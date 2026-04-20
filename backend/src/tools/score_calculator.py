"""
评分计算器 - 基于6维度评分计算总分和优先级
"""
from logger import setup_logger

logger = setup_logger("tools.score_calculator")


class ScoreCalculator:
    """评分计算工具"""
    
    # 维度权重
    WEIGHTS = {
        "business": 0.30,
        "user": 0.25,
        "strategy": 0.20,
        "cost": 0.15,
        "risk": 0.05,
        "graph": 0.05,
    }
    
    @staticmethod
    def calculate_total(
        business_score: float,
        user_score: float,
        strategy_score: float,
        cost_deduction: float,
        risk_deduction: float,
        graph_bonus: float,
    ) -> float:
        """计算总分 (0-100)"""
        # 正向分数：各维度 * 10 取加权平均
        positive = (
            business_score * 10 * 0.3 +
            user_score * 10 * 0.25 +
            strategy_score * 10 * 0.2
        ) / 0.75  # 归一化到100分制
        
        # 加上扣分和加分
        total = positive + cost_deduction + risk_deduction + graph_bonus
        result = round(max(0, min(100, total)), 1)
        logger.debug(f"计算总分: business={business_score}, user={user_score}, strategy={strategy_score}, total={result}")
        return result
    
    @staticmethod
    def determine_priority(total_score: float) -> str:
        """根据总分确定优先级"""
        if total_score >= 80:
            priority = "P0"
        elif total_score >= 65:
            priority = "P1"
        elif total_score >= 45:
            priority = "P2"
        else:
            priority = "P3"
        logger.debug(f"确定优先级: total_score={total_score}, priority={priority}")
        return priority
    
    @staticmethod
    def determine_risk_level(risk_deduction: float, dependency_count: int, conflict_count: int) -> str:
        """确定风险等级"""
        risk_score = abs(risk_deduction) + dependency_count * 2 + conflict_count * 3
        if risk_score >= 15:
            level = "高"
        elif risk_score >= 8:
            level = "中"
        else:
            level = "低"
        logger.debug(f"确定风险等级: risk_score={risk_score}, level={level}")
        return level

score_calculator = ScoreCalculator()
