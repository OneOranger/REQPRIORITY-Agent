"""
报告生成工作流
流程: 读取数据 -> ReportAgent生成 -> ReportExporter导出
"""
from pathlib import Path
from storage.json_store import JsonStore
from agents.report_agent import report_agent
from tools.report_exporter import report_exporter
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("nodes.report_flow")

req_store = JsonStore(Path(__file__).parent.parent / "storage" / "data" / "requirements.json")
# graph.json 是一个对象，不是数组，所以不能使用 JsonStore（它期望数组格式）
GRAPH_FILE = Path(__file__).parent.parent / "storage" / "data" / "graph.json"


def _read_graph_data() -> dict:
    """读取图谱数据（graph.json 是对象格式）"""
    try:
        if GRAPH_FILE.exists():
            import json
            with open(GRAPH_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"读取图谱数据失败: {e}")
    return {}


async def run_report_flow(format: str = "markdown") -> dict:
    """报告生成工作流
    Args:
        format: 导出格式 markdown/pdf/pptx
    Returns:
        {
            "reportData": {...},
            "filePath": "...",
            "format": "markdown"
        }
    """
    trace_id = trace_manager.start_trace("生成决策报告", f"格式: {format}")
    logger.info(f"===== 开始报告生成工作流 ===== format={format}")
    
    try:
        # 1. 读取所有需求和图谱数据
        requirements = req_store.read_all()
        graph_data = _read_graph_data()
        logger.info(f"读取到 {len(requirements)} 个需求, 图谱节点: {len(graph_data.get('nodes', []))}")

        # 2. 调用 ReportAgent 生成决策报告
        report_data = await report_agent.generate_decision_report(requirements, graph_data, trace_id=trace_id)

        # 3. 根据格式导出
        fmt = format.lower().strip()
        if fmt == "pdf":
            file_path = report_exporter.export_pdf(report_data)
        elif fmt in ("pptx", "ppt"):
            file_path = report_exporter.export_pptx(report_data)
        else:
            file_path = report_exporter.export_markdown(report_data)
            fmt = "markdown"

        logger.info(f"===== 报告生成工作流完成 ===== file_path={file_path}")
        trace_manager.end_trace(trace_id, "completed")
        
        return {
            "reportData": report_data,
            "filePath": file_path,
            "format": fmt,
            "traceId": trace_id,
        }
    except Exception as e:
        logger.error(f"报告生成工作流失败: {e}")
        import traceback
        traceback.print_exc()
        trace_manager.end_trace(trace_id, "failed")
        raise


async def run_roadmap_flow() -> list:
    """路线图生成工作流"""
    trace_id = trace_manager.start_trace("生成路线图", "")
    logger.info(f"===== 开始路线图生成工作流 =====")
    
    try:
        requirements = req_store.read_all()
        result = await report_agent.generate_roadmap(requirements, trace_id=trace_id)
        logger.info(f"===== 路线图生成工作流完成 =====")
        trace_manager.end_trace(trace_id, "completed")
        return result
    except Exception as e:
        logger.error(f"路线图生成工作流失败: {e}")
        trace_manager.end_trace(trace_id, "failed")
        raise
