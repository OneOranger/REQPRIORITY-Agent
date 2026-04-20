from pydantic import BaseModel, ConfigDict
from typing import Optional


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class ScoringChild(BaseModel):
    id: str
    name: str
    question: str
    labels: list[str]


class ScoringDimension(BaseModel):
    id: str
    name: str
    weight: float
    children: list[ScoringChild]


class ScoringResult(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    req_id: str
    business_score: float
    user_score: float
    strategy_score: float
    cost_deduction: float
    risk_deduction: float
    graph_bonus: float
    total_score: float
    ai_explanation: str
    ai_suggestion: str


class ScoringRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    req_id: str
    answers: dict[str, int]
