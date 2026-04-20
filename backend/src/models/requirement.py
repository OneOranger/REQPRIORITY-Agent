from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Literal


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class RequirementBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    
    id: str
    name: str
    description: str
    module: str
    target_user: str  # -> targetUser
    goal: str
    priority: Literal["P0", "P1", "P2", "P3"]
    total_score: float  # -> totalScore
    business_score: float  # -> businessScore
    user_score: float  # -> userScore
    strategy_score: float  # -> strategyScore
    cost_deduction: float  # -> costDeduction
    risk_deduction: float  # -> riskDeduction
    graph_bonus: float  # -> graphBonus
    related_count: int  # -> relatedCount
    dependency_count: int  # -> dependencyCount
    conflict_count: int  # -> conflictCount
    ai_suggestion: str  # -> aiSuggestion
    status: Literal["待评估", "已评分", "已排期", "已上线", "已延后"]
    risk_level: Literal["高", "中", "低"]  # -> riskLevel
    is_graph_core: bool  # -> isGraphCore
    has_dependency: bool  # -> hasDependency
    aligns_with_strategy: bool  # -> alignsWithStrategy
    source: str
    impact_path: str  # -> impactPath
    ai_explanation: str  # -> aiExplanation
    quarter: Optional[str] = None


class RequirementCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    name: str = ""
    description: str = ""
    module: str = ""
    target_user: str = ""
    goal: str = ""
    source: str = "手动录入"


class RequirementUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    name: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None
    priority: Optional[Literal["P0", "P1", "P2", "P3"]] = None
    status: Optional[str] = None
    target_user: Optional[str] = None
    goal: Optional[str] = None
    source: Optional[str] = None
    quarter: Optional[str] = None
