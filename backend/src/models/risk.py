from pydantic import BaseModel, ConfigDict
from typing import Optional


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class RiskDistribution(BaseModel):
    name: str
    value: int
    color: str


class RiskCategory(BaseModel):
    name: str
    count: int
    icon: str


class RiskCard(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    name: str
    priority: str
    risks: list[str]
    suggestions: list[str]
    ai_suggestion: Optional[str] = None
