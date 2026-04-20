from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json

router = APIRouter()

DATA_FILE = Path(__file__).parent.parent / "storage" / "data" / "modules.json"
REQ_FILE = Path(__file__).parent.parent / "storage" / "data" / "requirements.json"


def _read_modules() -> list:
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _write_modules(modules: list):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(modules, f, ensure_ascii=False, indent=2)


class ModuleCreate(BaseModel):
    name: str


@router.get("/")
async def get_modules():
    """获取所有模块"""
    return _read_modules()


@router.post("/")
async def create_module(data: ModuleCreate):
    """新增模块"""
    modules = _read_modules()
    if data.name in modules:
        raise HTTPException(status_code=400, detail=f"模块 '{data.name}' 已存在")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="模块名不能为空")
    modules.append(data.name.strip())
    _write_modules(modules)
    return {"success": True, "modules": modules}


@router.delete("/{module_name}")
async def delete_module(module_name: str):
    """删除模块（检查是否有需求引用）"""
    modules = _read_modules()
    if module_name not in modules:
        raise HTTPException(status_code=404, detail=f"模块 '{module_name}' 不存在")
    
    # 检查是否有需求引用该模块
    if REQ_FILE.exists():
        with open(REQ_FILE, "r", encoding="utf-8") as f:
            requirements = json.load(f)
        refs = [r for r in requirements if r.get("module") == module_name]
        if refs:
            raise HTTPException(
                status_code=400, 
                detail=f"模块 '{module_name}' 下有 {len(refs)} 个需求，无法删除。请先迁移或删除相关需求。"
            )
    
    modules.remove(module_name)
    _write_modules(modules)
    return {"success": True, "modules": modules}
