from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from models import RequirementBase
from nodes.priority_flow import run_priority_recalculate, run_priority_simulate
from storage.json_store import JsonStore
from config import settings

router = APIRouter()
store = JsonStore(settings.data_dir / "requirements.json")


class PriorityUpdate(BaseModel):
    priority: str


class SimulateRequest(BaseModel):
    scenario: str
    constraints: Optional[dict] = None


class RecalculateRequest(BaseModel):
    businessStage: Optional[str] = "增长期"
    targetStrategy: Optional[str] = "增长优先"
    period: Optional[str] = "Q3 2026"
    teamSize: Optional[str] = "20人月"
    budgetLevel: Optional[str] = "中"
    scenario: Optional[str] = None


@router.get("/recommendations")
async def get_priority_recommendations():
    """获取优先级推荐"""
    data = store.read_all()
    
    # 按总分排序
    sorted_reqs = sorted(data, key=lambda x: x.get("totalScore", 0), reverse=True)
    
    # 推荐高优先级需求
    top_p0 = [r for r in sorted_reqs if r.get("priority") == "P0"][:5]
    top_p1 = [r for r in sorted_reqs if r.get("priority") == "P1"][:3]
    
    return {
        "topPriority": top_p0[:3],
        "quickWins": [r for r in sorted_reqs if r.get("totalScore", 0) > 70 and r.get("riskLevel") == "低"][:3],
        "needAttention": [r for r in sorted_reqs if r.get("riskLevel") == "高"][:3],
        "aiSuggestion": "建议优先处理P0级别需求，特别是微信一键登录和首页性能优化，这两个需求ROI最高且风险可控。",
        "summary": {
            "totalCount": len(data),
            "p0Count": len([r for r in data if r.get("priority") == "P0"]),
            "p1Count": len([r for r in data if r.get("priority") == "P1"]),
            "highRiskCount": len([r for r in data if r.get("riskLevel") == "高"])
        }
    }


@router.post("/batch-update")
async def batch_update_priority(updates: dict):
    """批量更新优先级"""
    # 模拟批量更新
    return {
        "success": True,
        "updatedCount": len(updates.get("items", [])),
        "message": "优先级更新成功"
    }


@router.get("/matrix")
async def get_priority_matrix():
    """获取优先级矩阵"""
    data = store.read_all()
    
    matrix = {
        "highValueLowRisk": [],
        "highValueHighRisk": [],
        "lowValueLowRisk": [],
        "lowValueHighRisk": []
    }
    
    for req in data:
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


@router.put("/{req_id}")
async def update_priority(req_id: str, data: PriorityUpdate):
    """更新需求优先级"""
    if not data.priority:
        return {"success": False, "message": "优先级不能为空"}
    
    if data.priority not in ["P0", "P1", "P2", "P3"]:
        return {"success": False, "message": "优先级必须是P0、P1、P2或P3"}
    
    # 更新需求
    updated = store.update(req_id, {"priority": data.priority})
    
    if not updated:
        return {"success": False, "message": "需求不存在"}
    
    return {
        "success": True,
        "message": f"需求 {req_id} 优先级已更新为 {data.priority}",
        "reqId": req_id,
        "priority": data.priority,
        "requirement": updated
    }


@router.post("/simulate")
async def simulate_priority(request: SimulateRequest):
    """模拟优先级调整"""
    result = await run_priority_simulate(request.scenario, request.constraints)
    return result


@router.post("/recalculate")
async def recalculate_priority(request: RecalculateRequest):
    """重新计算优先级"""
    constraints = {
        "businessStage": request.businessStage,
        "targetStrategy": request.targetStrategy,
        "period": request.period,
        "teamSize": request.teamSize,
        "budgetLevel": request.budgetLevel,
        "scenario": request.scenario,
    }
    result = await run_priority_recalculate(constraints)
    return {
        "success": True,
        "message": f"已重新计算优先级，共{len(result['requirements'])}个需求",
        "updatedCount": len(result['requirements']),
        "requirements": result['requirements'],
        "traceId": result['traceId']
    }
