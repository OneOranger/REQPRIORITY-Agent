"""
图谱构建工具 - 管理图谱节点和边
"""
import json
import threading
from pathlib import Path
from logger import setup_logger

logger = setup_logger("tools.graph_builder")


class GraphBuilder:
    def __init__(self):
        self.store_path = Path(__file__).parent.parent / "storage" / "data" / "graph.json"
        self._lock = threading.Lock()
        # 确保目录存在
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        # 如果文件不存在，创建空结构
        if not self.store_path.exists():
            self._write_graph({"nodes": [], "edges": []})
        logger.info(f"GraphBuilder初始化完成: store_path={self.store_path}")

    def _read_graph(self) -> dict:
        """读取图谱数据"""
        with self._lock:
            if self.store_path.exists():
                with open(self.store_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return {"nodes": [], "edges": []}

    def _write_graph(self, data: dict):
        """写入图谱数据"""
        with self._lock:
            with open(self.store_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

    def get_nodes(self) -> list:
        """获取所有节点"""
        return self._read_graph().get("nodes", [])

    def get_edges(self) -> list:
        """获取所有边"""
        return self._read_graph().get("edges", [])

    def get_graph(self) -> dict:
        """获取完整图谱"""
        return self._read_graph()

    def add_node(self, node: dict):
        """添加节点"""
        graph = self._read_graph()
        # 避免重复
        if not any(n["id"] == node["id"] for n in graph["nodes"]):
            graph["nodes"].append(node)
            self._write_graph(graph)
            logger.info(f"添加图谱节点: {node.get('id')}, label={node.get('label')}")
            return True
        logger.debug(f"节点已存在，跳过: {node.get('id')}")
        return False

    def update_node(self, node_id: str, updates: dict):
        """更新节点"""
        graph = self._read_graph()
        for i, node in enumerate(graph["nodes"]):
            if node["id"] == node_id:
                graph["nodes"][i].update(updates)
                self._write_graph(graph)
                logger.info(f"更新图谱节点: {node_id}")
                return True
        logger.debug(f"节点不存在，无法更新: {node_id}")
        return False

    def remove_node(self, node_id: str):
        """删除节点"""
        graph = self._read_graph()
        original_len = len(graph["nodes"])
        graph["nodes"] = [n for n in graph["nodes"] if n["id"] != node_id]
        # 同时删除相关边
        graph["edges"] = [e for e in graph["edges"] if e["source"] != node_id and e["target"] != node_id]

        if len(graph["nodes"]) < original_len:
            self._write_graph(graph)
            logger.info(f"删除图谱节点: {node_id}")
            return True
        return False

    def add_edge(self, edge: dict):
        """添加边"""
        graph = self._read_graph()
        # 避免重复
        exists = any(
            e["source"] == edge["source"] and e["target"] == edge["target"]
            for e in graph["edges"]
        )
        if not exists:
            graph["edges"].append(edge)
            self._write_graph(graph)
            logger.debug(f"添加图谱边: {edge.get('source')} -> {edge.get('target')}, type={edge.get('type')}")
            return True
        return False

    def add_edges(self, edges: list):
        """批量添加边"""
        graph = self._read_graph()
        added_count = 0
        for edge in edges:
            exists = any(
                e["source"] == edge["source"] and e["target"] == edge["target"]
                for e in graph["edges"]
            )
            if not exists:
                graph["edges"].append(edge)
                added_count += 1
        if added_count > 0:
            self._write_graph(graph)
            logger.info(f"批量添加图谱边: {added_count}条")
        return added_count

    def remove_edge(self, source: str, target: str):
        """删除边"""
        graph = self._read_graph()
        original_len = len(graph["edges"])
        graph["edges"] = [e for e in graph["edges"] if not (e["source"] == source and e["target"] == target)]

        if len(graph["edges"]) < original_len:
            self._write_graph(graph)
            logger.info(f"删除图谱边: {source} -> {target}")
            return True
        return False

    def get_node_by_id(self, node_id: str) -> dict | None:
        """根据ID获取节点"""
        nodes = self.get_nodes()
        for node in nodes:
            if node["id"] == node_id:
                return node
        return None

    def get_node_edges(self, node_id: str) -> dict:
        """获取节点的所有边（入边和出边）"""
        edges = self.get_edges()
        incoming = [e for e in edges if e["target"] == node_id]
        outgoing = [e for e in edges if e["source"] == node_id]
        return {"incoming": incoming, "outgoing": outgoing}

    def get_neighbors(self, node_id: str) -> list:
        """获取节点的邻居节点"""
        edges = self.get_edges()
        neighbor_ids = set()
        for edge in edges:
            if edge["source"] == node_id:
                neighbor_ids.add(edge["target"])
            if edge["target"] == node_id:
                neighbor_ids.add(edge["source"])

        nodes = self.get_nodes()
        return [n for n in nodes if n["id"] in neighbor_ids]

    def clear(self):
        """清空图谱"""
        self._write_graph({"nodes": [], "edges": []})
        logger.info("清空图谱")


graph_builder = GraphBuilder()
