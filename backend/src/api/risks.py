from fastapi import APIRouter
from typing import List
from models import RiskDistribution, RiskCategory, RiskCard
from agents.risk_agent import risk_agent
from tools.graph_builder import graph_builder
from storage.json_store import JsonStore
from config import settings

router = APIRouter()
store = JsonStore(settings.data_dir / "requirements.json")


@router.get("/distribution", response_model=List[RiskDistribution])
async def get_risk_distribution():
    """获取风险分布"""
    reqs = store.read_all()
    
    high = len([r for r in reqs if r.get("riskLevel") == "高"])
    medium = len([r for r in reqs if r.get("riskLevel") == "中"])
    low = len([r for r in reqs if r.get("riskLevel") == "低"])
    
    return [
        {"name": "高风险", "value": high, "color": "#ef4444"},
        {"name": "中风险", "value": medium, "color": "#f59e0b"},
        {"name": "低风险", "value": low, "color": "#22c55e"}
    ]


@router.get("/categories", response_model=List[RiskCategory])
async def get_risk_categories():
    """获取风险分类"""
    return [
        {"name": "技术风险", "count": 3, "icon": "Code"},
        {"name": "依赖风险", "count": 5, "icon": "Link"},
        {"name": "资源风险", "count": 2, "icon": "Users"},
        {"name": "进度风险", "count": 4, "icon": "Clock"},
        {"name": "需求变更", "count": 1, "icon": "FileEdit"}
    ]


@router.get("/cards", response_model=List[RiskCard])
async def get_risk_cards():
    """获取风险卡片"""
    reqs = store.read_all()
    
    cards = []
    for req in reqs:
        if req.get("riskLevel") == "高":
            cards.append(RiskCard(
                name=req.get("name", ""),
                priority=req.get("priority", ""),
                risks=["涉及多个系统改造", "技术方案复杂", "依赖外部资源"],
                suggestions=["拆分需求降低风险", "提前进行技术预研", "制定应急预案"],
                ai_suggestion="建议将该需求拆分为多个小迭代，降低单次发布风险。"
            ))

    return cards[:5]  # 返回前5个高风险需求


@router.get("/analysis")
async def get_risk_analysis():
    """获取风险分析"""
    reqs = store.read_all()
    
    high_risk_reqs = [r for r in reqs if r.get("riskLevel") == "高"]
    
    return {
        "totalRisks": len(high_risk_reqs),
        "criticalRisks": len([r for r in high_risk_reqs if r.get("priority") == "P0"]),
        "mitigatedRisks": 2,
        "pendingRisks": len(high_risk_reqs) - 2,
        "aiAnalysis": f"当前共有{len(high_risk_reqs)}个高风险需求，其中{len([r for r in high_risk_reqs if r.get('priority') == 'P0'])}个为P0级别，建议优先制定风险缓解方案。",
        "recommendations": [
            "建议对会员体系重构进行技术预研",
            "积分商城需求建议重新评估必要性",
            "加强需求依赖管理，避免连锁风险"
        ]
    }


@router.get("/overview")
async def get_risk_overview():
    """获取风险概览"""
    reqs = store.read_all()
    edges = graph_builder.get_edges()
    
    # 使用 RiskAgent 获取风险概览
    overview = await risk_agent.get_risk_overview(reqs, edges)
    
    # 补充原有统计信息
    total = len(reqs)
    high_risk = len([r for r in reqs if r.get("riskLevel") == "高"])
    medium_risk = len([r for r in reqs if r.get("riskLevel") == "中"])
    low_risk = len([r for r in reqs if r.get("riskLevel") == "低"])
    
    # 计算风险分布百分比
    risk_distribution = {
        "high": {"count": high_risk, "percentage": round(high_risk / total * 100, 1) if total > 0 else 0},
        "medium": {"count": medium_risk, "percentage": round(medium_risk / total * 100, 1) if total > 0 else 0},
        "low": {"count": low_risk, "percentage": round(low_risk / total * 100, 1) if total > 0 else 0}
    }
    
    # 按模块统计风险
    module_risks = {}
    for req in reqs:
        module = req.get("module", "未分类")
        if module not in module_risks:
            module_risks[module] = {"total": 0, "high": 0, "medium": 0, "low": 0}
        module_risks[module]["total"] += 1
        risk_level = req.get("riskLevel", "低")
        if risk_level in module_risks[module]:
            module_risks[module][risk_level.lower()] += 1
    
    # 按风险等级分组的需求列表（简化版，用于前端展示）
    def simplify_req(req):
        return {
            "id": req.get("id"),
            "name": req.get("name"),
            "priority": req.get("priority"),
            "module": req.get("module"),
            "totalScore": req.get("totalScore"),
            "riskLevel": req.get("riskLevel"),
        }
    
    requirements_by_risk = {
        "高": [simplify_req(r) for r in reqs if r.get("riskLevel") == "高"],
        "中": [simplify_req(r) for r in reqs if r.get("riskLevel") == "中"],
        "低": [simplify_req(r) for r in reqs if r.get("riskLevel") == "低"],
    }
    
    # 按风险分类分组的需求列表
    # 高依赖：dependencyCount >= 3
    high_dependency = [simplify_req(r) for r in reqs if r.get("dependencyCount", 0) >= 3]
    # 战略不一致：alignsWithStrategy === false
    strategy_mismatch = [simplify_req(r) for r in reqs if r.get("alignsWithStrategy") == False]
    # 冲突需求：conflictCount > 0
    conflict_reqs = [simplify_req(r) for r in reqs if r.get("conflictCount", 0) > 0]
    # 重复建设：同模块多个需求（简化判断）
    module_groups = {}
    for r in reqs:
        mod = r.get("module", "未分类")
        if mod not in module_groups:
            module_groups[mod] = []
        module_groups[mod].append(simplify_req(r))
    duplicate_reqs = []
    for mod, req_list in module_groups.items():
        if len(req_list) >= 2:
            duplicate_reqs.extend(req_list)
    
    requirements_by_category = {
        "高依赖": high_dependency,
        "战略不一致": strategy_mismatch,
        "冲突需求": conflict_reqs,
        "重复建设": duplicate_reqs,
    }
    
    return {
        **overview,
        "totalRequirements": total,
        "riskDistribution": risk_distribution,
        "moduleRisks": module_risks,
        "highRiskCount": high_risk,
        "mediumRiskCount": medium_risk,
        "lowRiskCount": low_risk,
        "requirementsByRisk": requirements_by_risk,
        "requirementsByCategory": requirements_by_category,
    }


@router.get("/high-risk")
async def get_high_risk_requirements():
    """获取高风险需求详情"""
    reqs = store.read_all()
    edges = graph_builder.get_edges()
    
    # 使用 RiskAgent 评估高风险需求
    cards = await risk_agent.assess_high_risk_requirements(reqs, edges)
    
    # 补充完整需求信息
    high_risk_reqs = [r for r in reqs if r.get("riskLevel") == "高"]
    
    # 构建包含完整信息的返回
    enriched_cards = []
    for card in cards:
        # 找到对应的需求
        matching_req = next((r for r in high_risk_reqs if r.get("name") == card.get("name")), None)
        if matching_req:
            enriched_card = {
                **card,
                "id": matching_req.get("id"),
                "description": matching_req.get("description", ""),
                "module": matching_req.get("module", ""),
                "totalScore": matching_req.get("totalScore", 0),
                "businessScore": matching_req.get("businessScore", 0),
                "userScore": matching_req.get("userScore", 0),
                "strategyScore": matching_req.get("strategyScore", 0),
                "dependencyCount": matching_req.get("dependencyCount", 0),
                "conflictCount": matching_req.get("conflictCount", 0),
                "impactPath": matching_req.get("impactPath", ""),
                "aiExplanation": matching_req.get("aiExplanation", ""),
            }
            enriched_cards.append(enriched_card)
    
    return enriched_cards


@router.post("/assess/{req_id}")
async def assess_risk(req_id: str):
    """评估单个需求的风险"""
    reqs = store.read_all()
    requirement = next((r for r in reqs if r["id"] == req_id), None)
    if not requirement:
        return {"error": "需求不存在"}
    edges = graph_builder.get_edges()
    result = await risk_agent.assess_requirement(requirement, {"requirements": reqs, "edges": edges})
    return result
