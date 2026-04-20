"""
优先级决策 LangGraph 工作流
"""
from nodes.state import PriorityFlowState
from tools.priority_ranker import priority_ranker
from storage.json_store import JsonStore
from pathlib import Path
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("nodes.priority_flow")

req_store = JsonStore(Path(__file__).parent.parent / "storage" / "data" / "requirements.json")


async def run_priority_recalculate(constraints: dict = None) -> dict:
    """重新计算所有优先级"""
    trace_id = trace_manager.start_trace("优先级重算", f"约束: {constraints}")
    logger.info(f"===== 开始优先级重算 ===== constraints={constraints}")
    
    try:
        requirements = req_store.read_all()
        ranked = priority_ranker.recalculate_priorities(requirements, constraints)

        # 保存更新后的需求
        req_store.write_all(ranked)
        logger.info(f"===== 优先级重算完成 ===== count={len(ranked)}")
        trace_manager.end_trace(trace_id, "completed")
        return {"requirements": ranked, "traceId": trace_id}
    except Exception as e:
        logger.error(f"优先级重算失败: {e}")
        trace_manager.end_trace(trace_id, "failed")
        raise


async def run_priority_simulate(scenario: str, constraints: dict = None) -> dict:
    """运行优先级模拟"""
    trace_id = trace_manager.start_trace("优先级模拟", f"场景: {scenario}")
    logger.info(f"===== 开始优先级模拟 ===== scenario={scenario}")
    
    try:
        requirements = req_store.read_all()

        # 先尝试规则模拟
        result = priority_ranker.simulate_scenario(requirements, scenario, constraints)
        logger.info(f"===== 优先级模拟完成 =====")
        trace_manager.end_trace(trace_id, "completed")
        return result
    except Exception as e:
        logger.error(f"优先级模拟失败: {e}")
        trace_manager.end_trace(trace_id, "failed")
        raise


async def run_priority_rank() -> list:
    """运行优先级排序"""
    logger.debug("运行优先级排序")
    requirements = req_store.read_all()
    return priority_ranker.rank_requirements(requirements)


async def run_priority_matrix() -> dict:
    """获取优先级矩阵"""
    logger.debug("获取优先级矩阵")
    requirements = req_store.read_all()
    return priority_ranker.get_priority_matrix(requirements)


async def run_priority_distribution() -> dict:
    """获取优先级分布"""
    logger.debug("获取优先级分布")
    requirements = req_store.read_all()
    return priority_ranker.get_priority_distribution(requirements)
