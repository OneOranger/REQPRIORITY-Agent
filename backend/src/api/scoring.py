from fastapi import APIRouter, HTTPException
from typing import List
from models import ScoringDimension, ScoringResult, ScoringRequest
from storage.json_store import JsonStore
from config import settings
import json

router = APIRouter()
dimensions_store = JsonStore(settings.data_dir / "scoring_dimensions.json")
req_store = JsonStore(settings.data_dir / "requirements.json")

# 评分维度配置（作为fallback）
SCORING_DIMENSIONS_FALLBACK = [
    {
        "id": "business",
        "name": "业务价值",
        "weight": 0.35,
        "children": [
            {
                "id": "business_1",
                "name": "收入影响",
                "question": "该需求对收入的影响程度如何？",
                "labels": ["无影响", "轻微", "中等", "显著", "重大"]
            },
            {
                "id": "business_2",
                "name": "成本节约",
                "question": "该需求能节约多少成本？",
                "labels": ["无节约", "少量", "中等", "大量", "极大"]
            },
            {
                "id": "business_3",
                "name": "市场竞争力",
                "question": "该需求对市场竞争力的提升程度？",
                "labels": ["无提升", "轻微", "中等", "显著", "重大"]
            }
        ]
    },
    {
        "id": "user",
        "name": "用户体验",
        "weight": 0.30,
        "children": [
            {
                "id": "user_1",
                "name": "用户满意度",
                "question": "该需求对用户满意度的提升？",
                "labels": ["无提升", "轻微", "中等", "显著", "重大"]
            },
            {
                "id": "user_2",
                "name": "使用频率",
                "question": "该功能被用户使用的频率？",
                "labels": ["几乎不用", "偶尔", "有时", "经常", "频繁"]
            },
            {
                "id": "user_3",
                "name": "用户覆盖",
                "question": "该需求覆盖的用户群体规模？",
                "labels": ["极少", "少量", "中等", "大量", "全部"]
            }
        ]
    },
    {
        "id": "strategy",
        "name": "战略契合",
        "weight": 0.20,
        "children": [
            {
                "id": "strategy_1",
                "name": "产品愿景",
                "question": "该需求与产品愿景的契合度？",
                "labels": ["不契合", "轻微", "中等", "高度", "完全"]
            },
            {
                "id": "strategy_2",
                "name": "技术路线",
                "question": "该需求与技术路线的契合度？",
                "labels": ["不契合", "轻微", "中等", "高度", "完全"]
            }
        ]
    },
    {
        "id": "risk",
        "name": "风险评估",
        "weight": 0.15,
        "children": [
            {
                "id": "risk_1",
                "name": "技术风险",
                "question": "该需求的技术实现风险？",
                "labels": ["无风险", "低风险", "中等", "高风险", "极高"]
            },
            {
                "id": "risk_2",
                "name": "依赖风险",
                "question": "该需求的外部依赖风险？",
                "labels": ["无依赖", "低依赖", "中等", "高依赖", "极高"]
            }
        ]
    }
]


@router.get("/dimensions")
async def get_scoring_dimensions():
    """获取评分维度配置"""
    data = dimensions_store.read_all()
    if data:
        return data
    return SCORING_DIMENSIONS_FALLBACK


@router.put("/dimensions")
async def update_scoring_dimensions(data: list):
    """更新评分维度权重"""
    # 验证权重总和为100
    total = sum(d.get("weight", 0) for d in data)
    if abs(total - 1.0) > 0.01 and abs(total - 100) > 0.01:
        raise HTTPException(status_code=400, detail=f"权重总和必须为1.0或100%，当前为{total}")
    
    # 保存到 scoring_dimensions.json
    dimensions_store.write_all(data)
    return {"success": True, "message": "权重已保存"}


@router.post("/{req_id}/ai-score")
async def ai_score_requirement(req_id: str):
    """AI自动评分（调用scoring_flow）"""
    from logger import setup_logger
    logger = setup_logger("api.scoring")
    logger.info(f"收到AI评分请求: req_id={req_id}")
    
    try:
        from nodes.scoring_flow import run_scoring_flow
        result = await run_scoring_flow(req_id)
        logger.info(f"AI评分完成: req_id={req_id}, traceId={result.get('traceId')}")
        return {
            "success": True,
            "reqId": req_id,
            **result
        }
    except Exception as e:
        logger.error(f"AI评分失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{req_id}/scores")
async def save_manual_scores(req_id: str, scores: dict):
    """保存人工评分"""
    from tools.score_calculator import score_calculator

    # 验证需求是否存在
    requirement = req_store.get_by_id(req_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="需求不存在")

    # 计算总分
    business_score = scores.get("businessScore", requirement.get("businessScore", 5.0))
    user_score = scores.get("userScore", requirement.get("userScore", 5.0))
    strategy_score = scores.get("strategyScore", requirement.get("strategyScore", 5.0))
    cost_deduction = scores.get("costDeduction", requirement.get("costDeduction", -8))
    risk_deduction = scores.get("riskDeduction", requirement.get("riskDeduction", -4))
    graph_bonus = scores.get("graphBonus", requirement.get("graphBonus", 4))

    total_score = round(
        (business_score + user_score + strategy_score) * 10 / 3 +
        cost_deduction + risk_deduction + graph_bonus, 1
    )
    total_score = max(0, min(100, total_score))
    priority = score_calculator.determine_priority(total_score)

    update_data = {
        "businessScore": business_score,
        "userScore": user_score,
        "strategyScore": strategy_score,
        "costDeduction": cost_deduction,
        "riskDeduction": risk_deduction,
        "graphBonus": graph_bonus,
        "totalScore": total_score,
        "priority": priority,
        "status": "已评分",
    }
    updated = req_store.update(req_id, update_data)
    return {
        "success": True,
        "reqId": req_id,
        "totalScore": total_score,
        "priority": priority,
        **update_data
    }


@router.get("/{req_id}/result")
async def get_scoring_result(req_id: str):
    """获取评分结果"""
    requirement = req_store.get_by_id(req_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="需求不存在")
    return {
        "reqId": req_id,
        "businessScore": requirement.get("businessScore", 0),
        "userScore": requirement.get("userScore", 0),
        "strategyScore": requirement.get("strategyScore", 0),
        "costDeduction": requirement.get("costDeduction", 0),
        "riskDeduction": requirement.get("riskDeduction", 0),
        "graphBonus": requirement.get("graphBonus", 0),
        "totalScore": requirement.get("totalScore", 0),
        "priority": requirement.get("priority", "P2"),
        "reasons": requirement.get("reasons", {}),
        "aiExplanation": requirement.get("aiExplanation", ""),
        "aiSuggestion": requirement.get("aiSuggestion", ""),
    }


@router.post("/score", response_model=ScoringResult)
async def score_requirement(request: ScoringRequest):
    """对需求进行评分（人工答题模式）"""
    answers = request.answers

    business_score = (answers.get("business_1", 3) + answers.get("business_2", 3) + answers.get("business_3", 3)) / 3 * 2
    user_score = (answers.get("user_1", 3) + answers.get("user_2", 3) + answers.get("user_3", 3)) / 3 * 2
    strategy_score = (answers.get("strategy_1", 3) + answers.get("strategy_2", 3)) / 2 * 2

    cost_deduction = -(answers.get("risk_1", 1) * 2)
    risk_deduction = -(answers.get("risk_2", 1) * 2)
    graph_bonus = 5

    total_score = business_score + user_score + strategy_score + cost_deduction + risk_deduction + graph_bonus
    total_score = max(0, min(100, total_score))

    return ScoringResult(
        req_id=request.req_id,
        business_score=round(business_score, 1),
        user_score=round(user_score, 1),
        strategy_score=round(strategy_score, 1),
        cost_deduction=round(cost_deduction, 1),
        risk_deduction=round(risk_deduction, 1),
        graph_bonus=graph_bonus,
        total_score=round(total_score, 1),
        ai_explanation="基于多维度评估，该需求综合表现良好，建议优先排期。",
        ai_suggestion="建议结合业务实际情况，在Q3季度内完成开发上线。"
    )


@router.get("/results/{req_id}", response_model=ScoringResult)
async def get_scoring_result_legacy(req_id: str):
    """获取需求的评分结果（兼容旧接口）"""
    requirement = req_store.get_by_id(req_id)
    if requirement:
        return ScoringResult(
            req_id=req_id,
            business_score=requirement.get("businessScore", 8.5),
            user_score=requirement.get("userScore", 9.0),
            strategy_score=requirement.get("strategyScore", 8.0),
            cost_deduction=requirement.get("costDeduction", -5),
            risk_deduction=requirement.get("riskDeduction", -3),
            graph_bonus=requirement.get("graphBonus", 8),
            total_score=requirement.get("totalScore", 87.5),
            ai_explanation=requirement.get("aiExplanation", "该需求综合评分较高，建议优先处理。"),
            ai_suggestion=requirement.get("aiSuggestion", "建议尽快排期开发，预计能带来显著的业务价值提升。")
        )
    return ScoringResult(
        req_id=req_id,
        business_score=8.5,
        user_score=9.0,
        strategy_score=8.0,
        cost_deduction=-5,
        risk_deduction=-3,
        graph_bonus=8,
        total_score=87.5,
        ai_explanation="该需求综合评分较高，建议优先处理。",
        ai_suggestion="建议尽快排期开发，预计能带来显著的业务价值提升。"
    )
