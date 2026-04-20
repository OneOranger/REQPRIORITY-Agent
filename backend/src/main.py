import uvicorn
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from logger import setup_logger

# 导入所有路由
from api import requirements, scoring, graph, priority, dashboard, roadmap, risks, reports, modules, trace

logger = setup_logger("api")

app = FastAPI(
    title="ReqPriority Agent API",
    description="AI驱动的需求优先级智能管家",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://[::]:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求日志中间件
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    logger.info(f"→ {request.method} {request.url.path}")
    response = await call_next(request)
    duration = round((time.time() - start_time) * 1000, 1)
    logger.info(f"← {request.method} {request.url.path} [{response.status_code}] {duration}ms")
    return response

# 挂载路由
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["驾驶舱"])
app.include_router(requirements.router, prefix="/api/requirements", tags=["需求池"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["评分中心"])
app.include_router(graph.router, prefix="/api/graph", tags=["知识图谱"])
app.include_router(priority.router, prefix="/api/priority", tags=["优先级决策"])
app.include_router(roadmap.router, prefix="/api/roadmap", tags=["路线图"])
app.include_router(risks.router, prefix="/api/risks", tags=["风险台"])
app.include_router(reports.router, prefix="/api/reports", tags=["报告输出"])
app.include_router(modules.router, prefix="/api/modules", tags=["模块管理"])
app.include_router(trace.router, prefix="/api/ai", tags=["AI追踪"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "ReqPriority Agent API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
