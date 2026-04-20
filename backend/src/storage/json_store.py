import json
import threading
from pathlib import Path
from typing import TypeVar, Generic, Optional

T = TypeVar("T")


class JsonStore(Generic[T]):
    """JSON文件存储引擎，支持泛型，线程安全"""
    
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self._lock = threading.Lock()
        # 确保目录存在
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        # 如果文件不存在，创建空数组
        if not self.file_path.exists():
            self.write_all([])
    
    def read_all(self) -> list[dict]:
        """读取所有数据"""
        with self._lock:
            if not self.file_path.exists():
                return []
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
    
    def write_all(self, data: list[dict]) -> None:
        """写入所有数据"""
        with self._lock:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    
    def get_by_id(self, id: str) -> Optional[dict]:
        """按ID获取数据"""
        data = self.read_all()
        for item in data:
            if item.get("id") == id:
                return item
        return None
    
    def create(self, item: dict) -> dict:
        """创建新数据"""
        data = self.read_all()
        data.append(item)
        self.write_all(data)
        return item
    
    def update(self, id: str, updates: dict) -> Optional[dict]:
        """更新数据"""
        data = self.read_all()
        for i, item in enumerate(data):
            if item.get("id") == id:
                data[i].update(updates)
                self.write_all(data)
                return data[i]
        return None
    
    def delete(self, id: str) -> bool:
        """删除数据"""
        data = self.read_all()
        for i, item in enumerate(data):
            if item.get("id") == id:
                data.pop(i)
                self.write_all(data)
                return True
        return False
