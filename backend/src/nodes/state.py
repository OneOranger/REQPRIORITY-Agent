"""
LangGraph 工作流全局状态定义
"""
from typing import TypedDict, Optional, Any

class RequirementFlowState(TypedDict, total=False):
    """需求入池工作流状态"""
    # 输入
    title: str
    value: str
    module: str
    target_user: str
    goal: str
    document_content: str
    source: str
    
    # 中间结果
    parsed_data: dict  # ParserAgent输出
    scores: dict  # ScorerAgent输出
    graph_result: dict  # GraphAgent输出
    risk_result: dict  # RiskAgent输出
    
    # 最终输出
    requirement: dict  # 完整的需求对象
    error: Optional[str]

class ScoringFlowState(TypedDict, total=False):
    """评分工作流状态"""
    req_id: str
    requirement: dict
    context: dict
    scores: dict
    error: Optional[str]

class PriorityFlowState(TypedDict, total=False):
    """优先级决策工作流状态"""
    requirements: list
    scenario: str
    constraints: dict
    result: dict
    error: Optional[str]

class ReportFlowState(TypedDict, total=False):
    """报告生成工作流状态"""
    requirements: list
    graph_data: dict
    constraints: dict
    report: dict
    error: Optional[str]
