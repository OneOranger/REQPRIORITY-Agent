"""
需求入池 LangGraph 工作流
流程: 输入 -> ParserAgent -> ScorerAgent -> GraphAgent -> 存储
"""
from nodes.state import RequirementFlowState
from agents.parser_agent import parser_agent
from agents.scorer_agent import scorer_agent
from agents.graph_agent import graph_agent
from tools.score_calculator import score_calculator
from tools.graph_builder import graph_builder
from storage.json_store import JsonStore
from pathlib import Path
import uuid
from logger import setup_logger
from tracer import trace_manager

logger = setup_logger("nodes.requirement_flow")

# 需求存储
req_store = JsonStore(Path(__file__).parent.parent / "storage" / "data" / "requirements.json")

async def parse_node(state: RequirementFlowState) -> RequirementFlowState:
    """解析节点 - 调用ParserAgent"""
    trace_id = state.get("trace_id")
    try:
        logger.debug(f"[parse_node] 调用ParserAgent, trace_id={trace_id}")
        parsed = await parser_agent.parse_requirement(
            title=state.get("title", ""),
            value=state.get("value", ""),
            module=state.get("module", ""),
            target_user=state.get("target_user", ""),
            goal=state.get("goal", ""),
            document_content=state.get("document_content", ""),
            trace_id=trace_id,
        )
        state["parsed_data"] = parsed
        logger.debug(f"[parse_node] 解析完成: name={parsed.get('name')}")
    except Exception as e:
        logger.error(f"[parse_node] 解析失败: {e}")
        state["error"] = f"解析失败: {str(e)}"
    return state

async def score_node(state: RequirementFlowState) -> RequirementFlowState:
    """评分节点 - 调用ScorerAgent"""
    if state.get("error"):
        return state
    
    trace_id = state.get("trace_id")
    try:
        parsed = state.get("parsed_data", {})
        # 获取已有需求作为上下文
        existing = req_store.read_all()
        context = {"requirements": existing[:5]}
        
        logger.debug(f"[score_node] 调用ScorerAgent, trace_id={trace_id}")
        scores = await scorer_agent.score_requirement(parsed, context, trace_id=trace_id)
        state["scores"] = scores
        logger.debug(f"[score_node] 评分完成: totalScore={scores.get('totalScore')}")
    except Exception as e:
        logger.error(f"[score_node] 评分失败: {e}")
        state["error"] = f"评分失败: {str(e)}"
    return state

async def assemble_node(state: RequirementFlowState) -> RequirementFlowState:
    """组装节点 - 合并解析和评分结果，生成完整需求"""
    if state.get("error"):
        return state
    
    logger.debug("[assemble_node] 组装需求数据")
    
    parsed = state.get("parsed_data", {})
    scores = state.get("scores", {})
    
    # 生成ID
    existing = req_store.read_all()
    next_num = len(existing) + 1
    req_id = f"REQ-{next_num:03d}"
    
    # 确定优先级和风险等级
    total_score = scores.get("totalScore", 50)
    priority = score_calculator.determine_priority(total_score)
    risk_level = score_calculator.determine_risk_level(
        scores.get("riskDeduction", 0), 0, 0
    )
    
    requirement = {
        "id": req_id,
        "name": parsed.get("name", state.get("title", "未命名需求")),
        "description": parsed.get("description", state.get("value", "")),
        "module": parsed.get("module", state.get("module", "用户系统")),
        "targetUser": parsed.get("targetUser", state.get("target_user", "全部用户")),
        "goal": parsed.get("goal", state.get("goal", "")),
        "priority": priority,
        "totalScore": total_score,
        "businessScore": scores.get("businessScore", 5.0),
        "userScore": scores.get("userScore", 5.0),
        "strategyScore": scores.get("strategyScore", 5.0),
        "costDeduction": scores.get("costDeduction", -8),
        "riskDeduction": scores.get("riskDeduction", -4),
        "graphBonus": scores.get("graphBonus", 4),
        "relatedCount": 0,
        "dependencyCount": 0,
        "conflictCount": 0,
        "aiSuggestion": scores.get("aiSuggestion", "建议关注"),
        "status": "待评估",
        "riskLevel": risk_level,
        "isGraphCore": False,
        "hasDependency": False,
        "alignsWithStrategy": True,
        "source": state.get("source", "手动录入"),
        "impactPath": parsed.get("impactPath", "需求提出→分析→实施"),
        "aiExplanation": scores.get("aiExplanation", "AI分析完成"),
        "quarter": None,
    }
    
    state["requirement"] = requirement
    logger.debug(f"[assemble_node] 组装完成: id={req_id}, priority={priority}")
    return state

async def graph_node(state: RequirementFlowState) -> RequirementFlowState:
    """图谱关联节点 - 分析新需求与已有需求的关系并更新图谱"""
    if state.get("error"):
        return state
    
    trace_id = state.get("trace_id")
    try:
        requirement = state.get("requirement", {})
        req_id = requirement.get("id")
        
        # 获取已有图谱数据
        existing_nodes = graph_builder.get_nodes()
        existing_edges = graph_builder.get_edges()
        
        # 调用 GraphAgent 分析关系
        graph_result = await graph_agent.analyze_requirement(
            requirement, existing_nodes, existing_edges, trace_id=trace_id
        )
        
        # 构建新节点
        new_node = {
            "id": req_id,
            "label": requirement.get("name", ""),
            "priority": requirement.get("priority", "P2"),
            "score": requirement.get("totalScore", 0),
            "isCore": graph_result.get("isCore", False),
            "group": requirement.get("module", "未分类")
        }
        
        # 添加节点到图谱
        graph_builder.add_node(new_node)
        
        # 添加新边
        new_edges = graph_result.get("newEdges", [])
        added_count = graph_builder.add_edges(new_edges)
        
        # 更新需求的图谱相关信息
        requirement["isGraphCore"] = graph_result.get("isCore", False)
        requirement["graphBonus"] = graph_result.get("graphBonus", 0)
        requirement["relatedCount"] = len(new_edges)
        requirement["dependencyCount"] = len([e for e in new_edges if e.get("type") == "dependency"])
        requirement["conflictCount"] = len([e for e in new_edges if e.get("type") == "conflict"])
        requirement["hasDependency"] = requirement["dependencyCount"] > 0
        
        state["graph_result"] = graph_result
        state["requirement"] = requirement
        
        logger.info(f"[graph_node] 图谱关联完成: id={req_id}, isCore={graph_result.get('isCore')}, newEdges={added_count}")
        
    except Exception as e:
        # 图谱更新失败不阻塞主流程
        logger.error(f"[graph_node] 图谱关联失败: {e}")
        state["graph_result"] = {"error": str(e)}
    
    return state

async def save_node(state: RequirementFlowState) -> RequirementFlowState:
    """保存节点 - 存储到JSON"""
    if state.get("error"):
        return state
    
    requirement = state.get("requirement")
    if requirement:
        req_store.create(requirement)
        logger.info(f"[save_node] 需求已保存: id={requirement.get('id')}")
    
    return state

async def run_requirement_flow(
    title: str = "",
    value: str = "",
    module: str = "",
    target_user: str = "",
    goal: str = "",
    document_content: str = "",
    source: str = "手动录入",
) -> dict:
    """执行需求入池工作流（简化版，不使用完整LangGraph图）"""
    trace_id = trace_manager.start_trace("需求解析入池", f"标题: {title}")
    logger.info(f"===== 开始需求入池工作流 ===== title={title}, source={source}")
    
    state: RequirementFlowState = {
        "title": title,
        "value": value,
        "module": module,
        "target_user": target_user,
        "goal": goal,
        "document_content": document_content,
        "source": source,
        "trace_id": trace_id,
    }
    
    try:
        # 顺序执行节点
        state = await parse_node(state)
        state = await score_node(state)
        state = await assemble_node(state)
        state = await graph_node(state)  # 新增：图谱关联节点
        state = await save_node(state)
        
        if state.get("error"):
            raise Exception(state["error"])
        
        logger.info(f"===== 需求入池工作流完成 ===== id={state.get('requirement', {}).get('id')}")
        trace_manager.end_trace(trace_id, "completed")
    except Exception as e:
        logger.error(f"需求入池工作流失败: {e}")
        trace_manager.end_trace(trace_id, "failed")
        raise
    
    return state.get("requirement", {})
