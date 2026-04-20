"""
AI调用链路追踪API
提供AI处理链路的查询接口
"""
from fastapi import APIRouter
from tracer import trace_manager

router = APIRouter()


@router.get("/traces")
async def get_traces(limit: int = 20, trigger: str = None):
    """获取最近的AI调用链路，支持按trigger筛选"""
    if trigger:
        return {
            "success": True,
            "data": trace_manager.get_traces_by_type(trigger, limit)
        }
    return {
        "success": True,
        "data": trace_manager.get_recent_traces(limit)
    }


@router.get("/traces/{trace_id}")
async def get_trace(trace_id: str):
    """获取特定追踪详情"""
    trace = trace_manager.get_trace(trace_id)
    if not trace:
        return {"success": False, "error": "追踪记录不存在"}
    return {"success": True, "data": trace}


@router.delete("/traces")
async def clear_traces():
    """清空所有追踪记录"""
    trace_manager.clear_traces()
    return {"success": True}
    """获取特定追踪详情"""
    trace = trace_manager.get_trace(trace_id)
    if not trace:
        return {"success": False, "error": "追踪记录不存在"}
    return {"success": True, "data": trace}


@router.delete("/traces")
async def clear_traces():
    """清空所有追踪记录"""
    trace_manager.clear_traces()
    return {"success": True}
