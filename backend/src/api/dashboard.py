from fastapi import APIRouter
from storage.json_store import JsonStore
from config import settings
from typing import List

router = APIRouter()
req_store = JsonStore(settings.data_dir / "requirements.json")


@router.get("/stats")
async def get_dashboard_stats():
    """获取驾驶舱统计数据"""
    reqs = req_store.read_all()
    
    total = len(reqs)
    p0_count = len([r for r in reqs if r.get("priority") == "P0"])
    p1_count = len([r for r in reqs if r.get("priority") == "P1"])
    p2_count = len([r for r in reqs if r.get("priority") == "P2"])
    p3_count = len([r for r in reqs if r.get("priority") == "P3"])
    
    high_risk = len([r for r in reqs if r.get("riskLevel") == "高"])
    medium_risk = len([r for r in reqs if r.get("riskLevel") == "中"])
    low_risk = len([r for r in reqs if r.get("riskLevel") == "低"])
    
    scored = len([r for r in reqs if r.get("status") == "已评分"])
    scheduled = len([r for r in reqs if r.get("status") == "已排期"])
    pending = len([r for r in reqs if r.get("status") == "待评估"])
    
    avg_score = sum(r.get("totalScore", 0) for r in reqs) / total if total > 0 else 0
    
    return {
        "totalRequirements": total,
        "priorityDistribution": {
            "P0": p0_count,
            "P1": p1_count,
            "P2": p2_count,
            "P3": p3_count
        },
        "riskDistribution": {
            "high": high_risk,
            "medium": medium_risk,
            "low": low_risk
        },
        "statusDistribution": {
            "scored": scored,
            "scheduled": scheduled,
            "pending": pending
        },
        "averageScore": round(avg_score, 1),
        "aiInsight": f"当前共有{total}个需求，其中P0级别{p0_count}个需要重点关注。高风险需求{high_risk}个，建议优先评估。"
    }


@router.get("/trends")
async def get_trends():
    """获取趋势数据"""
    return {
        "months": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "newRequirements": [12, 15, 18, 14, 20, 16],
        "completedRequirements": [8, 10, 12, 15, 18, 20],
        "avgScores": [65, 68, 70, 72, 75, 78]
    }


@router.get("/recent-activities")
async def get_recent_activities():
    """获取最近活动"""
    return [
        {"id": 1, "type": "score", "message": "REQ-001 完成评分", "time": "10分钟前"},
        {"id": 2, "type": "create", "message": "新增需求 REQ-013", "time": "30分钟前"},
        {"id": 3, "type": "update", "message": "REQ-003 状态更新为已排期", "time": "1小时前"},
        {"id": 4, "type": "analyze", "message": "完成知识图谱分析", "time": "2小时前"},
        {"id": 5, "type": "report", "message": "生成月度报告", "time": "3小时前"}
    ]


@router.get("/summary")
async def get_summary():
    """获取驾驶舱统计摘要"""
    reqs = req_store.read_all()
    
    total_count = len(reqs)
    p0_count = len([r for r in reqs if r.get("priority") == "P0"])
    high_risk_count = len([r for r in reqs if r.get("riskLevel") == "高"])
    graph_core_count = len([r for r in reqs if r.get("isGraphCore") == True])
    
    return {
        "totalCount": total_count,
        "p0Count": p0_count,
        "highRiskCount": high_risk_count,
        "graphCoreCount": graph_core_count
    }


@router.get("/top-requirements")
async def get_top_requirements():
    """获取高分需求列表（totalScore >= 70），按分数降序"""
    reqs = req_store.read_all()
    
    # 筛选totalScore >= 70的需求
    top_reqs = [r for r in reqs if r.get("totalScore", 0) >= 70]
    
    # 按totalScore降序排序
    top_reqs.sort(key=lambda x: x.get("totalScore", 0), reverse=True)
    
    return top_reqs


@router.get("/ai-summary")
async def get_ai_summary():
    """获取AI判断摘要"""
    return {
        "priorities": [
            "在增长优先策略下，微信一键登录（REQ-001）和首页加载优化（REQ-002）应优先投入",
            "支付链路修复（REQ-003）涉及资金安全，需严格测试，建议分阶段上线",
            "数据埋点体系（REQ-010）是基础设施类需求，建议尽早启动以支撑后续数据驱动功能",
            "会员体系重构（REQ-004）风险较高，建议拆分为多个迭代逐步推进"
        ],
        "risks": [
            "会员体系重构（REQ-004）依赖支付系统改造，存在4个依赖项，需协调多个团队",
            "积分商城（REQ-011）风险等级为高，且与当前战略方向不完全一致，建议重新评估",
            "智能推荐算法（REQ-007）依赖数据埋点体系（REQ-010），建议先完成数据基础建设",
            "支付流程重构（REQ-003）涉及资金安全，需准备灰度发布和回滚方案"
        ]
    }
