from fastapi import APIRouter, Query
from fastapi.responses import FileResponse
from typing import Optional
import os
from storage.json_store import JsonStore
from config import settings

router = APIRouter()
store = JsonStore(settings.data_dir / "requirements.json")


@router.get("/decision")
async def get_decision_report():
    """获取决策报告数据（使用ReportAgent生成）"""
    from agents.report_agent import report_agent
    reqs = store.read_all()

    try:
        report_data = await report_agent.generate_decision_report(reqs)
        return report_data
    except Exception as e:
        print(f"Decision report generation error: {e}")
        # fallback: 基础数据
        sorted_reqs = sorted(reqs, key=lambda x: x.get("totalScore", 0), reverse=True)
        top10 = sorted_reqs[:10]
        core_nodes = [r for r in reqs if r.get("isGraphCore")]
        not_recommended = [r for r in reqs if r.get("totalScore", 0) < 50]
        not_recommended.sort(key=lambda x: x.get("totalScore", 0))
        total = len(reqs)
        p0_count = len([r for r in reqs if r.get("priority") == "P0"])
        p1_count = len([r for r in reqs if r.get("priority") == "P1"])
        high_risk_count = len([r for r in reqs if r.get("riskLevel") == "高"])

        return {
            "top10": top10,
            "coreNodes": core_nodes,
            "notRecommended": not_recommended,
            "decisionBasis": [
                f"当前共有{total}个需求，其中P0级别{p0_count}个需要重点关注",
                f"高风险需求{high_risk_count}个，建议优先制定风险缓解方案",
                f"核心节点需求{len(core_nodes)}个，对整体架构影响较大",
                "建议将低分需求（<50分）重新评估或延后"
            ],
            "riskWarnings": [
                "高风险需求建议进行技术预研和方案评审",
                "存在冲突依赖的需求需要协调排期",
                "建议为P0需求预留20%缓冲时间"
            ],
            "summary": {
                "totalRequirements": total,
                "p0Count": p0_count,
                "p1Count": p1_count,
                "highRiskCount": high_risk_count,
                "avgScore": round(sum(r.get("totalScore", 0) for r in reqs) / total, 1) if total > 0 else 0,
            }
        }


@router.post("/export")
async def export_report(request: dict):
    """导出报告（支持 markdown/pdf/pptx 格式）"""
    from nodes.report_flow import run_report_flow
    from logger import setup_logger
    
    logger = setup_logger("api.reports")
    fmt = request.get("format", "markdown").lower().strip()
    
    # 标准化格式名称
    if fmt == "ppt":
        fmt = "pptx"
    
    logger.info(f"导出报告请求: format={fmt}")

    try:
        result = await run_report_flow(format=fmt)
        file_path = result.get("filePath", "")
        
        logger.info(f"报告生成完成: file_path={file_path}")

        if file_path and os.path.exists(file_path):
            # 根据格式确定媒体类型和文件扩展名
            format_config = {
                "markdown": {"media_type": "text/markdown", "ext": "md"},
                "pdf": {"media_type": "application/pdf", "ext": "pdf"},
                "pptx": {"media_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "ext": "pptx"},
            }
            config = format_config.get(fmt, {"media_type": "application/octet-stream", "ext": fmt})
            
            # 生成简洁的文件名
            filename = f"决策报告.{config['ext']}"
            
            logger.info(f"返回文件: {filename}, media_type={config['media_type']}")
            
            return FileResponse(
                path=file_path,
                media_type=config["media_type"],
                filename=filename,
            )
        logger.error(f"文件不存在或未生成: {file_path}")
        return {"success": False, "message": "导出失败，文件未生成"}
    except Exception as e:
        logger.error(f"Export report error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"导出失败: {str(e)}"}


@router.get("/")
async def get_reports():
    """获取报告列表"""
    return [
        {
            "id": "RPT-001",
            "name": "需求优先级评估报告",
            "type": "priority",
            "createdAt": "2026-04-15",
            "status": "completed"
        },
        {
            "id": "RPT-002",
            "name": "Q3路线图规划",
            "type": "roadmap",
            "createdAt": "2026-04-14",
            "status": "completed"
        },
        {
            "id": "RPT-003",
            "name": "风险分析报告",
            "type": "risk",
            "createdAt": "2026-04-13",
            "status": "completed"
        }
    ]


@router.post("/generate")
async def generate_report(request: dict):
    """生成报告"""
    report_type = request.get("type", "summary")
    reqs = store.read_all()

    return {
        "success": True,
        "reportId": f"RPT-{len(reqs):03d}",
        "type": report_type,
        "message": "报告生成成功",
        "summary": {
            "totalRequirements": len(reqs),
            "p0Count": len([r for r in reqs if r.get("priority") == "P0"]),
            "avgScore": sum(r.get("totalScore", 0) for r in reqs) / len(reqs) if reqs else 0
        }
    }


@router.get("/{report_id}")
async def get_report(report_id: str):
    """获取单个报告"""
    return {
        "id": report_id,
        "name": "需求优先级评估报告",
        "content": "报告内容...",
        "charts": [
            {"type": "pie", "title": "优先级分布"},
            {"type": "bar", "title": "评分对比"}
        ]
    }


@router.post("/{report_id}/export")
async def export_report_by_id(report_id: str, format: str = "pdf"):
    """导出指定报告（兼容旧接口）"""
    return {
        "success": True,
        "downloadUrl": f"/api/reports/{report_id}/download?format={format}",
        "message": f"报告已导出为 {format.upper()} 格式"
    }

@router.get("/{report_id}")
async def get_report(report_id: str):
    """获取单个报告"""
    return {
        "id": report_id,
        "name": "需求优先级评估报告",
        "content": "报告内容...",
        "charts": [
            {"type": "pie", "title": "优先级分布"},
            {"type": "bar", "title": "评分对比"}
        ]
    }


@router.post("/{report_id}/export")
async def export_report_by_id(report_id: str, format: str = "pdf"):
    """导出指定报告（兼容旧接口）"""
    return {
        "success": True,
        "downloadUrl": f"/api/reports/{report_id}/download?format={format}",
        "message": f"报告已导出为 {format.upper()} 格式"
    }
    """导出指定报告（兼容旧接口）"""
    return {
        "success": True,
        "downloadUrl": f"/api/reports/{report_id}/download?format={format}",
        "message": f"报告已导出为 {format.upper()} 格式"
    }
