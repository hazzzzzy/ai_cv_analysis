# 简历分析 + 追问面试 + 结果诊断

本仓库包含后端（FastAPI + MySQL + LangGraph）与前端（Next.js + shadcn/ui）两部分，用于简历上传、生成追问、逐题作答以及最终诊断建议输出。

## 目录结构

- `backend/` 后端服务（FastAPI、SQLAlchemy async、Alembic、LangGraph）
- `frontend/` 前端应用（Next.js 14 App Router + shadcn/ui）
- `AGENTS.md` 项目规范、契约与约束

## 后端使用（backend）

### 1) 环境准备

- Python 3.12
- MySQL 8.x

### 2) 安装依赖

在 `backend` 目录创建并使用虚拟环境（示例）：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### 3) 环境变量

复制示例配置并按需修改：

```powershell
Copy-Item .env.example .env
```

关键项：

- `DATABASE_URL` 指向 MySQL（默认 `mysql+aiomysql`）
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL`
- `RESUME_STORAGE_MODE`：`db_text` 或 `local_file`

### 4) 数据库迁移

确保 MySQL 已创建对应数据库后执行：

```powershell
alembic upgrade head
```

### 5) 启动后端

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6) 主要接口

按 `AGENTS.md` 第 8 节约定：

- `POST /api/v1/resumes` 上传简历
- `POST /api/v1/sessions` 创建会话并返回第 1 题
- `POST /api/v1/sessions/{session_id}/answers` 作答并返回下一题或最终分析
- `GET /api/v1/sessions/{session_id}` 会话详情
- `GET /api/v1/sessions?limit=20&offset=0` 历史列表

## 前端使用（frontend）

### 1) 安装依赖

```powershell
cd frontend
npm install
```

### 2) 环境变量

```powershell
Copy-Item .env.example .env.local
```

关键项：

- `NEXT_PUBLIC_API_BASE_URL` 指向后端地址（默认 `http://localhost:8000`）
- `NEXT_PUBLIC_APP_NAME`

### 3) 启动前端

```powershell
npm run dev
```

访问：`http://localhost:3000`

## 说明

- 后端解析 PDF/DOCX 使用 pypdf + python-docx。解析异常会记录到 `extracted_meta.error`。
- LLM 输出必须为严格 JSON；Pydantic 校验失败会按重试策略处理。
- LangGraph 流程图在 `backend/app/llm/langgraph_flow.png`。
