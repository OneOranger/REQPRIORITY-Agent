from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from models import RequirementBase, RequirementCreate, RequirementUpdate
from storage.json_store import JsonStore
from config import settings
import uuid
import random


class StatusUpdate(BaseModel):
    status: str


# 合法的状态转换表
VALID_TRANSITIONS = {
    "待评估": ["已评分", "已延后"],
    "已评分": ["已排期", "已延后"],
    "已排期": ["已上线", "已延后"],
    "已上线": ["已延后"],
    "已延后": ["待评估"],
}

router = APIRouter()
store = JsonStore(settings.data_dir / "requirements.json")


@router.get("/", response_model=List[RequirementBase])
async def get_requirements(
    search: Optional[str] = Query(None, description="搜索关键词"),
    module: Optional[str] = Query(None, description="模块筛选"),
    priority: Optional[str] = Query(None, description="优先级筛选"),
    status: Optional[str] = Query(None, description="状态筛选"),
    riskLevel: Optional[str] = Query(None, description="风险等级筛选"),
    isGraphCore: Optional[bool] = Query(None, description="是否图谱核心节点"),
    hasDependency: Optional[bool] = Query(None, description="是否有依赖"),
    alignsWithStrategy: Optional[bool] = Query(None, description="是否对齐战略")
):
    """获取需求列表，支持筛选和搜索"""
    data = store.read_all()

    filtered = data

    if search:
        search_lower = search.lower()
        filtered = [
            r for r in filtered
            if search_lower in r.get("name", "").lower()
            or search_lower in r.get("description", "").lower()
            or search_lower in r.get("id", "").lower()
        ]

    if module:
        filtered = [r for r in filtered if r.get("module") == module]

    if priority:
        filtered = [r for r in filtered if r.get("priority") == priority]

    if status:
        filtered = [r for r in filtered if r.get("status") == status]

    if riskLevel:
        filtered = [r for r in filtered if r.get("riskLevel") == riskLevel]

    if isGraphCore is not None:
        filtered = [r for r in filtered if r.get("isGraphCore") == isGraphCore]

    if hasDependency is not None:
        filtered = [r for r in filtered if r.get("hasDependency") == hasDependency]

    if alignsWithStrategy is not None:
        filtered = [r for r in filtered if r.get("alignsWithStrategy") == alignsWithStrategy]

    return filtered


@router.get("/{req_id}", response_model=RequirementBase)
async def get_requirement(req_id: str):
    """获取单个需求"""
    item = store.get_by_id(req_id)
    if not item:
        raise HTTPException(status_code=404, detail="需求不存在")
    return item


@router.post("/", response_model=RequirementBase)
async def create_requirement(req: RequirementCreate):
    """创建新需求"""
    import uuid
    new_id = f"REQ-{str(uuid.uuid4())[:8].upper()}"
    new_req = {
        "id": new_id,
        **req.model_dump(by_alias=True),
        "priority": "P2",
        "totalScore": 0,
        "businessScore": 0,
        "userScore": 0,
        "strategyScore": 0,
        "costDeduction": 0,
        "riskDeduction": 0,
        "graphBonus": 0,
        "relatedCount": 0,
        "dependencyCount": 0,
        "conflictCount": 0,
        "aiSuggestion": "",
        "status": "待评估",
        "riskLevel": "低",
        "isGraphCore": False,
        "hasDependency": False,
        "alignsWithStrategy": True,
        "source": "手动录入",
        "impactPath": "",
        "aiExplanation": "",
        "quarter": None
    }
    store.create(new_req)
    return new_req


@router.put("/{req_id}", response_model=RequirementBase)
async def update_requirement(req_id: str, req: RequirementUpdate):
    """更新需求"""
    updates = {k: v for k, v in req.model_dump(by_alias=True).items() if v is not None}
    updated = store.update(req_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="需求不存在")
    return updated


@router.delete("/{req_id}")
async def delete_requirement(req_id: str):
    """删除需求"""
    success = store.delete(req_id)
    if not success:
        raise HTTPException(status_code=404, detail="需求不存在")
    return {"message": "删除成功"}


@router.put("/{req_id}/status")
async def update_status(req_id: str, data: StatusUpdate):
    """更新需求状态，校验状态流转合法性"""
    requirements = store.read_all()
    req = next((r for r in requirements if r["id"] == req_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="需求不存在")
    
    current_status = req.get("status", "待评估")
    target_status = data.status
    
    valid_targets = VALID_TRANSITIONS.get(current_status, [])
    if target_status not in valid_targets:
        raise HTTPException(
            status_code=400, 
            detail=f"无法从「{current_status}」变更为「{target_status}」，合法目标：{valid_targets}"
        )
    
    store.update(req_id, {"status": target_status})
    return {"success": True, "reqId": req_id, "status": target_status}


@router.post("/{req_id}/reanalyze")
async def reanalyze_requirement(req_id: str):
    """重新AI分析需求 - 重新触发评分+风险评估"""
    # 1. 从存储中获取需求
    requirement = store.get_by_id(req_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="需求不存在")
    
    # 2. 调用 run_scoring_flow(req_id) 重新评分
    try:
        from nodes.scoring_flow import run_scoring_flow
        result = await run_scoring_flow(req_id)
        
        # 3. 获取更新后的需求
        updated_requirement = store.get_by_id(req_id)
        return {
            "success": True,
            "reqId": req_id,
            "message": "AI重新分析完成",
            "requirement": updated_requirement
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重新分析失败: {str(e)}")


@router.post("/parse")
async def parse_requirement(
    title: str = Form(..., description="需求标题"),
    value: str = Form(..., description="需求价值描述"),
    module: str = Form(..., description="所属模块"),
    targetUser: str = Form(..., description="目标用户"),
    goal: str = Form(..., description="目标"),
    file: Optional[UploadFile] = File(None, description="上传文件（可选）")
):
    """AI解析需求（调用requirement_flow）"""
    from logger import setup_logger
    from tracer import trace_manager
    logger = setup_logger("api.requirements")
    
    logger.info(f"收到解析请求: title={title}")
    
    # 读取上传文件内容（如果有）
    document_content = ""
    if file:
        try:
            content = await file.read()
            document_content = content.decode("utf-8", errors="ignore")
            logger.info(f"读取上传文件: {file.filename}, size={len(content)}")
        except Exception as e:
            logger.error(f"File read error: {e}")

    # 调用 requirement_flow
    try:
        from nodes.requirement_flow import run_requirement_flow
        result = await run_requirement_flow(
            title=title,
            value=value,
            module=module,
            target_user=targetUser,
            goal=goal,
            document_content=document_content,
            source="AI解析"
        )
        # 添加traceId到响应
        result["traceId"] = trace_manager.get_recent_traces(1)[0]["traceId"] if trace_manager.get_recent_traces(1) else None
        logger.info(f"解析完成: id={result.get('id')}, traceId={result.get('traceId')}")
        return result
    except Exception as e:
        logger.error(f"Requirement flow error: {e}")
        # fallback: 模拟解析（保留原有逻辑作为回退）
        return _fallback_parse(title, value, module, targetUser, goal)


def _fallback_parse(title: str, value: str, module: str, targetUser: str, goal: str) -> dict:
    """规则回退解析（模拟原有逻辑）"""
    new_id = f"REQ-{str(uuid.uuid4())[:8].upper()}"
    combined_text = f"{title} {value} {goal}".lower()

    detected_module = module
    if "支付" in title or "交易" in title:
        detected_module = "交易系统"
    elif "会员" in title or "积分" in title:
        detected_module = "会员系统"
    elif "推荐" in title or "个性化" in title:
        detected_module = "个性化"
    elif "数据" in title or "埋点" in title or "大屏" in title:
        detected_module = "数据"
    elif "社区" in title or "互动" in title:
        detected_module = "社区"
    elif "运营" in title or "活动" in title:
        detected_module = "运营"
    elif "用户" in title or "登录" in title or "注册" in title:
        detected_module = "用户系统"
    elif "性能" in title or "优化" in title or "加载" in title:
        detected_module = "性能"

    base_score = random.randint(45, 85)
    business_score = round(min(10, max(3, base_score / 10 + random.uniform(-1, 1))), 1)
    user_score = round(min(10, max(3, base_score / 10 + random.uniform(-1.5, 1))), 1)
    strategy_score = round(min(10, max(3, base_score / 10 + random.uniform(-1, 1.5))), 1)

    cost_deduction = random.choice([-5, -8, -10, -12, -15])
    risk_deduction = random.choice([-2, -3, -5, -8])
    graph_bonus = random.choice([0, 2, 4, 6, 8, 10])

    total_score = round(
        business_score * 3 + user_score * 2.5 + strategy_score * 2 +
        cost_deduction + risk_deduction + graph_bonus
    )
    total_score = max(0, min(100, total_score))

    if total_score >= 80:
        priority = "P0"
    elif total_score >= 65:
        priority = "P1"
    elif total_score >= 45:
        priority = "P2"
    else:
        priority = "P3"

    if abs(risk_deduction) >= 6:
        risk_level = "高"
    elif abs(risk_deduction) >= 4:
        risk_level = "中"
    else:
        risk_level = "低"

    suggestions = [
        "建议优先开发，ROI高且风险可控",
        "技术优化类需求，建议与相关团队同步进行",
        "涉及多个系统改造，建议拆分为多个迭代",
        "可与核心功能联动，提升整体用户体验",
        "依赖数据基础建设，建议先完成数据准备",
        "优先级适中，建议按资源情况安排",
        "ROI较低，建议延后或取消"
    ]
    ai_suggestion = random.choice(suggestions)

    ai_explanation = f"基于AI分析，该需求\"{title}\"对{targetUser}具有{business_score}分的业务价值。"
    if "新用户" in targetUser:
        ai_explanation += "针对新用户的功能通常能带来显著的转化提升。"
    elif "全部用户" in targetUser:
        ai_explanation += "影响全量用户的功能具有较大的潜在价值。"

    parsed_req = {
        "id": new_id,
        "name": title,
        "description": value,
        "module": detected_module,
        "targetUser": targetUser,
        "goal": goal,
        "priority": priority,
        "totalScore": total_score,
        "businessScore": business_score,
        "userScore": user_score,
        "strategyScore": strategy_score,
        "costDeduction": cost_deduction,
        "riskDeduction": risk_deduction,
        "graphBonus": graph_bonus,
        "relatedCount": random.randint(1, 6),
        "dependencyCount": random.randint(0, 4),
        "conflictCount": random.randint(0, 2),
        "aiSuggestion": ai_suggestion,
        "status": "待评估",
        "riskLevel": risk_level,
        "isGraphCore": total_score >= 70,
        "hasDependency": random.random() > 0.5,
        "alignsWithStrategy": strategy_score >= 7,
        "source": "AI解析",
        "impactPath": "",
        "aiExplanation": ai_explanation,
        "quarter": None
    }

    store.create(parsed_req)
    return parsed_req
