# ReqPriority Agent - AI驱动的需求优先级智能决策系统

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**基于LangGraph多Agent架构的智能需求管理与优先级决策平台**

[功能特性](#-功能特性) • [技术架构](#-技术架构) • [快速开始](#-快速开始) • [API文档](#-api文档) • [部署指南](#-部署指南)

</div>

---

## 📋 项目简介

**ReqPriority Agent** 是一个基于AI Agent架构的企业级需求优先级智能决策系统。系统采用LangGraph多Agent编排架构，结合大语言模型的语义理解能力，实现从需求解析、知识图谱构建、智能评分到优先级决策的全链路自动化管理。

### 核心价值

- 🎯 **智能决策**：基于多维度评分和AI推理的需求优先级排序
- 🔗 **知识图谱**：自动构建需求关联关系，识别依赖与冲突
- 📊 **数据驱动**：可视化仪表盘与多维度分析报告
- ⚡ **全自动化**：从需求录入到决策输出的端到端AI流程
- 🔍 **可追溯**：完整的AI调用链路追踪与决策依据记录

---

## ✨ 功能特性

### 1. 需求池管理 (Requirements Pool)
- 支持多格式需求文档导入（PDF、Word、Excel）
- AI自动解析需求要素并结构化存储
- 需求编辑、版本管理与状态跟踪
- 智能标签分类与检索

### 2. 知识图谱引擎 (Knowledge Graph)
- 自动识别需求间的依赖、冲突、增强关系
- 可视化图谱展示与交互式探索
- 模块级关联分析与影响范围评估
- 图谱动态更新与版本管理

### 3. 多维评分中心 (Scoring Center)
- 可配置的评分维度（业务价值、技术复杂度、风险等）
- AI辅助评分与人工校准
- 加权算法与自定义评分规则
- 评分历史追踪与对比分析

### 4. 优先级决策 (Priority Decision)
- 基于评分与图谱关系的智能排序
- 多目标优化算法（价值最大化、风险最小化）
- 决策依据透明化与可解释性
- 支持What-If场景模拟

### 5. 风险管理台 (Risk Dashboard)
- 自动识别技术风险与业务风险
- 风险等级评估与影响分析
- 风险缓解建议生成
- 风险趋势监控与预警

### 6. 路线图规划 (Roadmap)
- 基于优先级的迭代规划
- 依赖关系约束的排期优化
- 资源分配建议
- 里程碑跟踪

### 7. 报告输出 (Report Generation)
- 多维度决策报告生成
- 支持Markdown、PDF、PPTX格式导出
- 可视化图表与数据摘要
- 一键分享与协作

### 8. AI追踪面板 (AI Trace Panel)
- 实时AI调用链路可视化
- Token消耗统计与成本分析
- 决策过程时间线回放
- 性能监控与优化建议

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│  React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Dashboard │ │  Graph   │ │ Scoring  │ │ Priority │ ...  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                      Backend Layer                          │
│              FastAPI + LangGraph + OpenAI                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Agent Orchestrator                       │  │
│  └───────────────────────┬──────────────────────────────┘  │
│          ┌───────────────┼───────────────┐                 │
│          ▼               ▼               ▼                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Parser Agent │ │ Graph Agent  │ │Scorer Agent  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │Priority Agent│ │ Risk Agent   │ │Report Agent  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Storage Layer                             │
│              JSON-based File Storage                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Requirements│ │ Graph   │ │ Scores  │ │ Reports  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

#### 后端 (Backend)
| 组件 | 技术 | 版本 |
|------|------|------|
| **Web框架** | FastAPI | 0.115.12 |
| **ASGI服务器** | Uvicorn | 0.34.2 |
| **Agent框架** | LangGraph | 0.4.1 |
| **LLM集成** | LangChain + OpenAI | 0.3.25 / 1.82.0 |
| **数据验证** | Pydantic | 2.11.3 |
| **文件处理** | python-docx, PyPDF2, openpyxl | - |
| **报告生成** | python-pptx, reportlab, markdown | - |
| **搜索工具** | Tavily API | 0.5.0 |
| **可观测性** | LangSmith | 0.3.42 |

#### 前端 (Frontend)
| 组件 | 技术 | 版本 |
|------|------|------|
| **框架** | React | 18.3.1 |
| **语言** | TypeScript | 5.8.3 |
| **构建工具** | Vite | 5.4.19 |
| **UI库** | shadcn/ui + Radix UI | - |
| **样式** | TailwindCSS | 3.4.17 |
| **状态管理** | TanStack Query | 5.83.0 |
| **路由** | React Router | 6.30.1 |
| **图表** | Recharts | 3.8.1 |
| **图谱** | ReactFlow / XYFlow | 11/12 |
| **动画** | Framer Motion | 12.38.0 |

---

## 🚀 快速开始

### 环境要求

- **Python**: 3.10+
- **Node.js**: 18+
- **包管理器**: npm / bun
- **OpenAI API Key**: 用于AI功能

### 安装步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/OneOranger/REQPRIORITY-Agent.git
cd REQPRIORITY-Agent
```

#### 2. 后端配置

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

**环境变量配置** (`.env`):
```env
# OpenAI配置
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=openai_url
OPENAI_TEMPERATURE=0.7
OPENAI_ENABLED=true

# LangSmith可观测性（可选）
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=your_langsmith_key
LANGSMITH_PROJECT=reqpriority-agent

# Tavily搜索（可选）
TAVILY_API_KEY=your_tavily_key
```

#### 3. 前端配置

```bash
# 进入前端目录
cd insight-driver-ai

# 安装依赖
npm install
# 或使用 bun
bun install
```

#### 4. 启动服务

**方式一：使用启动脚本（推荐）**
```bash
# Windows PowerShell
.\start_backend.ps1
```

**方式二：手动启动**
```bash
# 启动后端（终端1）
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux
python src/main.py

# 启动前端（终端2）
cd insight-driver-ai
npm run dev
# 或 bun run dev
```

#### 5. 访问应用

- **前端界面**: http://localhost:8080
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs

---

## 📖 API文档

### 核心接口

| 模块 | 基础路径 | 功能描述 |
|------|----------|----------|
| 驾驶舱 | `/api/dashboard` | 全局概览与关键指标 |
| 需求池 | `/api/requirements` | 需求CRUD与AI解析 |
| 评分中心 | `/api/scoring` | 评分维度与计算 |
| 知识图谱 | `/api/graph` | 图谱构建与查询 |
| 优先级决策 | `/api/priority` | 优先级排序与决策 |
| 路线图 | `/api/roadmap` | 迭代规划与排期 |
| 风险台 | `/api/risks` | 风险识别与评估 |
| 报告输出 | `/api/reports` | 报告生成与导出 |
| 模块管理 | `/api/modules` | 模块配置管理 |
| AI追踪 | `/api/ai` | AI调用链路查询 |

### 示例请求

**需求解析**:
```bash
curl -X POST http://localhost:8000/api/requirements/parse \
  -H "Content-Type: multipart/form-data" \
  -F "file=@requirements.pdf"
```

**获取优先级排序**:
```bash
curl -X POST http://localhost:8000/api/priority/rank \
  -H "Content-Type: application/json" \
  -d '{"strategy": "value_maximization"}'
```

**导出决策报告**:
```bash
curl -X POST http://localhost:8000/api/reports/export \
  -H "Content-Type: application/json" \
  -d '{"format": "pptx", "sections": ["summary", "priority", "risks"]}'
```

完整API文档请访问: http://localhost:8000/docs

---

## 📂 项目结构

```
ReqPriority_Agent/
├── backend/                          # 后端服务
│   ├── src/
│   │   ├── agents/                   # Agent实现
│   │   │   ├── orchestrator.py       # 主控编排器
│   │   │   ├── parser_agent.py       # 需求解析Agent
│   │   │   ├── graph_agent.py        # 图谱构建Agent
│   │   │   ├── scorer_agent.py       # 评分Agent
│   │   │   ├── risk_agent.py         # 风险评估Agent
│   │   │   ├── report_agent.py       # 报告生成Agent
│   │   │   └── priority_agent.py     # 优先级决策Agent
│   │   ├── api/                      # API路由
│   │   │   ├── requirements.py       # 需求管理接口
│   │   │   ├── scoring.py            # 评分接口
│   │   │   ├── graph.py              # 图谱接口
│   │   │   ├── priority.py           # 优先级接口
│   │   │   └── ...
│   │   ├── nodes/                    # LangGraph节点
│   │   │   ├── requirement_flow.py   # 需求处理流
│   │   │   ├── scoring_flow.py       # 评分流程
│   │   │   ├── priority_flow.py      # 优先级流程
│   │   │   └── report_flow.py        # 报告流程
│   │   ├── models/                   # 数据模型
│   │   ├── tools/                    # 工具集
│   │   │   ├── file_parser.py        # 文件解析器
│   │   │   ├── graph_builder.py      # 图谱构建器
│   │   │   ├── score_calculator.py   # 评分计算器
│   │   │   └── report_exporter.py    # 报告导出器
│   │   ├── prompts/                  # Prompt模板
│   │   │   └── templates/            # Markdown模板
│   │   ├── storage/                  # 数据存储
│   │   │   └── data/                 # JSON数据文件
│   │   ├── config.py                 # 配置管理
│   │   ├── main.py                   # 应用入口
│   │   └── tracer.py                 # AI追踪器
│   ├── requirements.txt              # Python依赖
│   └── .env                          # 环境变量
│
├── insight-driver-ai/                # 前端应用
│   ├── src/
│   │   ├── components/               # React组件
│   │   │   ├── ui/                   # UI基础组件
│   │   │   ├── AppLayout.tsx         # 应用布局
│   │   │   ├── AppSidebar.tsx        # 侧边栏
│   │   │   └── AiTracePanel.tsx      # AI追踪面板
│   │   ├── pages/                    # 页面组件
│   │   │   ├── Dashboard.tsx         # 驾驶舱
│   │   │   ├── RequirementsPool.tsx  # 需求池
│   │   │   ├── KnowledgeGraphPage.tsx# 知识图谱
│   │   │   ├── ScoringCenter.tsx     # 评分中心
│   │   │   ├── PriorityDecision.tsx  # 优先级决策
│   │   │   ├── RiskDashboard.tsx     # 风险台
│   │   │   ├── Roadmap.tsx           # 路线图
│   │   │   └── ReportPage.tsx        # 报告页
│   │   ├── services/                 # API服务
│   │   │   └── api.ts                # API客户端
│   │   └── data/                     # 数据
│   │       └── mockData.ts           # Mock数据
│   ├── package.json                  # Node依赖
│   └── vite.config.ts                # Vite配置
│
└── start_backend.ps1                 # 启动脚本
```

---

## 🔧 开发指南

### 后端开发

**添加新的API端点**:
```python
# backend/src/api/your_module.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/your-endpoint")
async def your_endpoint():
    return {"message": "Hello"}
```

**注册路由** (`backend/src/main.py`):
```python
from api import your_module
app.include_router(your_module.router, prefix="/api/your-module", tags=["Your Module"])
```

**创建新Agent**:
```python
# backend/src/agents/your_agent.py
from langgraph.graph import StateGraph

class YourAgent:
    def __init__(self):
        # 初始化LLM
        pass
    
    def process(self, state):
        # 处理逻辑
        return state
```

### 前端开发

**添加新页面**:
```tsx
// insight-driver-ai/src/pages/YourPage.tsx
export default function YourPage() {
  return <div>Your Content</div>
}
```

**注册路由** (`insight-driver-ai/src/App.tsx`):
```tsx
<Route path="/your-page" element={<YourPage />} />
```

**调用API**:
```typescript
import { api } from '@/services/api'

const response = await api.get('/api/your-endpoint')
```

---

## 🚢 部署指南

### 生产环境部署

#### 后端部署

**使用Gunicorn**:
```bash
pip install gunicorn

gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  backend.src.main:app
```

**使用Docker**:
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src ./src

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 前端部署

**构建生产版本**:
```bash
cd insight-driver-ai
npm run build
```

**使用Nginx**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/insight-driver-ai/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 环境变量（生产环境）

```env
# 生产环境配置
OPENAI_API_KEY=your_production_key
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_ENABLED=true

LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_langsmith_key

# 安全配置
JWT_SECRET_KEY=your_strictly_secret_key

# 性能调优
OPENAI_TEMPERATURE=0.3
```

---

## 📊 性能优化

### 后端优化
- ✅ 启用异步处理 (`async/await`)
- ✅ 使用连接池（如改用数据库）
- ✅ 启用响应缓存
- ✅ 配置适当的worker数量

### 前端优化
- ✅ 代码分割与懒加载
- ✅ 启用gzip压缩
- ✅ 使用CDN加速
- ✅ 图片优化与缓存

---

## 🔐 安全建议

1. **API Key管理**: 永远不要将`.env`文件提交到版本控制
2. **CORS配置**: 生产环境中限制允许的域名
3. **速率限制**: 添加请求频率限制
4. **输入验证**: 使用Pydantic严格验证输入
5. **认证授权**: 实现JWT认证与权限控制

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 遵循PEP 8 (Python)
- 使用TypeScript严格模式
- 编写单元测试
- 更新文档

---

## 📝 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 📧 联系方式

- **项目维护者**: OneOranger
- **GitHub**: [https://github.com/OneOranger/REQPRIORITY-Agent](https://github.com/OneOranger/REQPRIORITY-Agent)
- **问题反馈**: [Issues](https://github.com/OneOranger/REQPRIORITY-Agent/issues)

---

## 🙏 致谢

感谢以下开源项目：

- [LangChain](https://github.com/langchain-ai/langchain) - LLM应用框架
- [LangGraph](https://github.com/langchain-ai/langgraph) - Agent编排框架
- [FastAPI](https://github.com/tiangolo/fastapi) - 高性能Web框架
- [shadcn/ui](https://ui.shadcn.com/) - 现代化UI组件库
- [ReactFlow](https://reactflow.dev/) - 节点图可视化

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个星标！**

Made with ❤️ by OneOranger

</div>
