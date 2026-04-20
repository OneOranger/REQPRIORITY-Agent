"""
评分工作流 - 对已有需求进行AI评分
"""
from nodes.state import ScoringFlowState
from agents.scorer_agent import scorer_agent
from tools.score_calculator import score_calculator
from storage.json_store import JsonStore
from pathlib import Path
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("nodes.scoring_flow")

req_store = JsonStore(Path(__file__).parent.parent / "storage" / "data" / "requirements.json")

async def run_scoring_flow(req_id: str) -> dict:
    """执行评分工作流"""
    trace_id = trace_manager.start_trace("AI评分", f"需求ID: {req_id}")
    logger.info(f"===== 开始评分工作流 ===== req_id={req_id}")
    
    # 获取需求
    all_reqs = req_store.read_all()
    requirement = next((r for r in all_reqs if r["id"] == req_id), None)
    if not requirement:
        logger.error(f"需求不存在: {req_id}")
        trace_manager.end_trace(trace_id, "failed")
        raise Exception(f"需求 {req_id} 不存在")
    
    req_name = requirement.get("name", "未命名")
    logger.info(f"评分需求: {req_name}")
    
    # 获取上下文
    context = {
        "requirements": [r for r in all_reqs if r["id"] != req_id][:5],
    }
    
    try:
        # AI评分
        scores = await scorer_agent.score_requirement(requirement, context, trace_id=trace_id)
        
        # 更新需求
        current_status = requirement.get("status", "待评估")
        update_data = {
            "totalScore": scores["totalScore"],
            "businessScore": scores["businessScore"],
            "userScore": scores["userScore"],
            "strategyScore": scores["strategyScore"],
            "costDeduction": scores["costDeduction"],
            "riskDeduction": scores["riskDeduction"],
            "graphBonus": scores["graphBonus"],
            "reasons": scores.get("reasons", {}),
            "aiExplanation": scores["aiExplanation"],
            "aiSuggestion": scores["aiSuggestion"],
            "priority": score_calculator.determine_priority(scores["totalScore"]),
            # 只有当前状态是"待评估"时才自动更新为"已评分"
            "status": "已评分" if current_status == "待评估" else current_status,
        }
        
        req_store.update(req_id, update_data)
        logger.info(f"===== 评分工作流完成 ===== req_id={req_id}, totalScore={scores['totalScore']}")
        trace_manager.end_trace(trace_id, "completed")
        
        return {**scores, "reqId": req_id, "priority": update_data["priority"], "traceId": trace_id}
    except Exception as e:
        logger.error(f"评分工作流失败: {e}")
        trace_manager.end_trace(trace_id, "failed")
        raise
