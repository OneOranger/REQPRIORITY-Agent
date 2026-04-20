from fastapi import APIRouter
from models import GraphData, GraphNode, GraphEdge
from tools.graph_builder import graph_builder
from agents.graph_agent import graph_agent
from storage.json_store import JsonStore
from config import settings
import json

router = APIRouter()


def load_graph_data() -> dict:
    """加载图谱数据"""
    return graph_builder.get_graph()


@router.get("/", response_model=GraphData)
async def get_graph():
    """获取知识图谱数据"""
    data = load_graph_data()
    return GraphData(**data)


@router.get("/nodes", response_model=list[GraphNode])
async def get_nodes():
    """获取所有节点"""
    data = load_graph_data()
    return data.get("nodes", [])


@router.get("/edges", response_model=list[GraphEdge])
async def get_edges():
    """获取所有边"""
    data = load_graph_data()
    return data.get("edges", [])


@router.get("/impact/{req_id}")
async def get_impact_analysis(req_id: str):
    """获取需求的影响分析"""
    data = load_graph_data()
    nodes = {n["id"]: n for n in data.get("nodes", [])}
    
    # 找到直接依赖
    direct_deps = [e for e in data.get("edges", []) if e["source"] == req_id]
    reverse_deps = [e for e in data.get("edges", []) if e["target"] == req_id]
    
    return {
        "reqId": req_id,
        "directDependencies": [
            {"id": e["target"], "name": nodes.get(e["target"], {}).get("label", e["target"]), "type": e["type"]}
            for e in direct_deps
        ],
        "reverseDependencies": [
            {"id": e["source"], "name": nodes.get(e["source"], {}).get("label", e["source"]), "type": e["type"]}
            for e in reverse_deps
        ],
        "impactScore": len(direct_deps) + len(reverse_deps),
        "aiAnalysis": f"该需求影响范围较广，建议评估其对{len(direct_deps)}个下游需求的影响。"
    }


@router.post("/analyze")
async def analyze_graph():
    """AI分析整个图谱"""
    nodes = graph_builder.get_nodes()
    edges = graph_builder.get_edges()
    result = await graph_agent.analyze_full_graph(nodes, edges, [])
    return result


@router.get("/analysis")
async def get_graph_analysis():
    """获取缓存的图谱分析结果"""
    nodes = graph_builder.get_nodes()
    edges = graph_builder.get_edges()
    result = await graph_agent.analyze_full_graph(nodes, edges, [])
    return result
