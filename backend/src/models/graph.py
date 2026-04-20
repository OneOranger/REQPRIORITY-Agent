from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class GraphNode(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: str
    label: str
    priority: Literal["P0", "P1", "P2", "P3"]
    score: float
    is_core: bool
    group: str


class GraphEdge(BaseModel):
    source: str
    target: str
    type: Literal["dependency", "weak", "conflict", "complement", "sameGoal"]
    label: Optional[str] = None


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
