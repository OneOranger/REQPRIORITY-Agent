from fastapi import APIRouter
from storage.json_store import JsonStore
from config import settings

router = APIRouter()
store = JsonStore(settings.data_dir / "requirements.json")


@router.get("/")
async def get_roadmap():
    """获取路线图数据（使用ReportAgent生成AI推理说明）"""
    reqs = store.read_all()

    try:
        from agents.report_agent import report_agent
        roadmap = await report_agent.generate_roadmap(reqs)
        return {
            "roadmap": roadmap,
            "unscheduled": [r for r in reqs if not r.get("quarter") or r.get("quarter") == "未排期"],
            "aiSuggestion": "建议将P0需求集中在Q3完成，Q4重点处理P1需求，确保核心功能按时上线。"
        }
    except Exception as e:
        print(f"Roadmap generation error: {e}")
        # fallback: 简单分组
        quarters = {}
        for req in reqs:
            quarter = req.get("quarter", "未排期")
            if quarter not in quarters:
                quarters[quarter] = []
            quarters[quarter].append(req)

        roadmap = []
        quarter_order = ["Q3 2026", "Q4 2026", "2027 H1", "2027 H2"]
        label_map = {}
        scheduled = [q for q in quarters.keys() if q != "未排期"]
        scheduled_sorted = sorted(scheduled, key=lambda q: quarter_order.index(q) if q in quarter_order else 99)
        for i, q in enumerate(scheduled_sorted):
            label_map[q] = "本季度" if i == 0 else ("下季度" if i == 1 else "远期")

        for quarter in scheduled_sorted:
            items = sorted(quarters[quarter], key=lambda x: x.get("totalScore", 0), reverse=True)
            roadmap.append({
                "period": quarter,
                "label": label_map.get(quarter, ""),
                "items": items,
                "reasoning": f"本阶段共{len(items)}个需求，聚焦核心目标交付。",
                "summary": {
                    "count": len(items),
                    "totalScore": sum(r.get("totalScore", 0) for r in items),
                    "avgScore": round(sum(r.get("totalScore", 0) for r in items) / len(items), 1) if items else 0
                }
            })

        return {
            "roadmap": roadmap,
            "unscheduled": quarters.get("未排期", []),
            "aiSuggestion": "建议将P0需求集中在Q3完成，Q4重点处理P1需求，确保核心功能按时上线。"
        }


@router.put("/")
async def update_roadmap(updates: dict):
    """更新路线图排期"""
    schedules = updates.get("schedules", [])
    updated_count = 0
    for item in schedules:
        req_id = item.get("reqId")
        quarter = item.get("quarter")
        if req_id and quarter:
            store.update(req_id, {"quarter": quarter, "status": "已排期"})
            updated_count += 1
    return {
        "success": True,
        "message": f"已更新 {updated_count} 个需求的排期"
    }


@router.post("/schedule")
async def schedule_requirement(schedule: dict):
    """排期需求"""
    req_id = schedule.get("reqId")
    quarter = schedule.get("quarter")

    store.update(req_id, {"quarter": quarter, "status": "已排期"})

    return {
        "success": True,
        "message": f"需求 {req_id} 已排期至 {quarter}"
    }
