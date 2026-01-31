# AGENTS.md

本仓库实现「简历分析 + 追问面试 + 结果诊断」网站：用户上传简历后，系统生成 3–10 条专家问题（用户选择数量），用户逐条作答，全部回答完成后输出痛点、优化建议、改进方向；全流程会话记录落地到本地 MySQL。

---

## 1. 目标与边界

### 目标
- 简历上传与解析（PDF/DOCX）。
- 基于简历内容生成 N 条专家问题（N ∈ [3,10]，由用户选择）。
- 问答回合管理：一次只呈现 1 个问题，用户提交答案后生成下一个问题，直到结束。
- 回合结束后生成最终分析：痛点、优化建议、改进方向（结构化输出）。
- 会话记录持久化：问题、答案、最终建议可追溯。

### 边界
- 默认匿名会话；若要账号体系，新增 user 表与鉴权中间件，不改动核心流程。
- 文件存储默认只存解析文本 + 元信息到 MySQL（可切换本地文件夹存储）。

---

## 2. 统一架构决策

### 后端技术栈
- FastAPI
- MySQL 8.x
- SQLAlchemy 2.x（async）+ aiomysql
- Alembic（迁移）
- Pydantic v2
- LangChain + LangGraph
- DeepSeek（通过 LangChain Chat 模型接入）

### 前端技术栈（建议）
- Next.js 14（App Router）
- TypeScript
- TailwindCSS + shadcn/ui
- React Query（或 Next 内置 fetch；保持一致即可）

---

## 3. 仓库结构（约定）

/
backend/
app/
main.py
api/ # 路由层：只做参数校验与组装返回
core/ # 配置、日志、依赖注入、错误处理
db/ # engine/session, models, migrations hooks
services/ # 业务层：会话、简历、LLM编排
llm/ # prompts, langgraph, output schemas
utils/ # 文本抽取、清洗、分段、token计数等
tests/
alembic/
pyproject.toml
.env.example
frontend/
app/
components/
lib/
styles/
.env.example
AGENTS.md
README.md

---

## 4. Agent 分工（Codex 执行协议）

### 4.1 Architect Agent（架构与契约）
- 维护 API 契约、DB schema、LangGraph 状态机定义。
- 定义所有结构化输出的 JSON Schema（Pydantic 模型）。
- 审核跨模块变更：接口字段变更必须同步前后端与迁移。

### 4.2 Backend Agent（FastAPI + MySQL）
- 实现上传、会话、问答、最终分析的 API。
- 实现 MySQL 表结构与迁移。
- 实现服务层：ResumeService / SessionService / InterviewService / AnalysisService。
- 实现统一错误码与日志（request_id）。

### 4.3 LLM Orchestrator Agent（LangGraph）
- 实现 LangGraph 图与节点函数。
- 实现 DeepSeek 调用、重试、超时、输出校验（严格 schema）。
- 实现“专家问题生成”与“最终分析”两段链路。

### 4.4 Prompt Agent（提示词与输出一致性）
- 维护 prompt 模板与 few-shot（如需要）。
- 保证输出严格为 JSON（禁止夹杂解释文本）。
- 维护专家画像映射（领域 -> persona）。

### 4.5 Frontend Agent（Next.js）
- 实现 UI：上传、选择问题数量、逐题作答、结果页、历史会话列表与详情。
- 实现状态管理：会话状态机与后端对齐。
- 提供精美样式与可用交互（loading、error、progress）。

### 4.6 QA Agent（测试与验收）
- 定义端到端验收清单。
- 覆盖关键路径：上传失败、解析为空、LLM 输出不合规、会话中断恢复。
- 维护后端单测与最少量前端 smoke test。

---

## 5. 数据模型（MySQL）

### 5.1 表：resumes
- id (bigint, pk)
- filename (varchar)
- mime_type (varchar)
- size_bytes (bigint)
- sha256 (char(64))
- extracted_text (mediumtext)        # 解析后的纯文本
- extracted_meta (json)             # 页数/段落数/解析器版本等
- created_at (datetime)
- updated_at (datetime)

### 5.2 表：sessions
- id (bigint, pk)
- resume_id (bigint, fk -> resumes.id)
- question_count (int)              # 3..10
- status (varchar)                  # in_progress | completed | failed
- current_index (int)               # 已完成题数
- llm_plan (json)                   # 本轮问题规划/专家领域等（可选）
- created_at (datetime)
- updated_at (datetime)

### 5.3 表：messages
- id (bigint, pk)
- session_id (bigint, fk -> sessions.id)
- seq (int)                         # 递增序号
- role (varchar)                    # system | assistant | user
- kind (varchar)                    # question | answer | final
- content (longtext)
- content_json (json)               # 结构化内容（如 question_id、domain）
- created_at (datetime)

### 5.4 表：analyses
- id (bigint, pk)
- session_id (bigint, fk -> sessions.id)
- result_json (json)                # 痛点/建议/方向（最终结构化输出）
- raw_model_output (longtext)       # 可选：调试用
- created_at (datetime)

---

## 6. LangGraph 状态机（核心编排）

### 6.1 State
- resume_text: str
- question_count: int
- expert_domains: list[str]
- questions: list[Question]
- answers: list[Answer]
- current_index: int
- final_analysis: AnalysisResult | None

### 6.2 Nodes
1) parse_resume  
- 输入：resume_id  
- 输出：resume_text（必要时做清洗与分段）

2) profile_infer  
- 从 resume_text 抽取：行业/岗位/年限/技能栈/项目类型/短板线索  
- 输出：profile_json（用于后续问题生成）

3) generate_questions  
- 输入：profile_json + question_count  
- 输出：questions（3–10 条，带 domain、difficulty、focus、expected_signal）

4) next_question  
- 输出：questions[current_index]

5) record_answer  
- 输入：answer_text  
- 追加 answers，current_index += 1

6) finalize_analysis  
- 输入：resume_text + questions + answers  
- 输出：final_analysis（痛点/建议/改进方向，结构化）

---

## 7. 强约束输出 Schema（Pydantic 对齐）

### Question
- id: string
- domain: string
- question: string
- why_it_matters: string
- good_answer_signals: list[string]
- red_flags: list[string]

### Answer
- question_id: string
- answer: string

### AnalysisResult
- pain_points: list[{title: string, evidence: string, impact: string}]
- optimization_suggestions: list[{title: string, actions: list[string], priority: int}]
- improvement_directions: list[{direction: string, roadmap_30d: list[string], roadmap_90d: list[string]}]

规则：
- LLM 返回必须严格为 JSON；解析失败按重试策略处理（最多 2 次），仍失败则 session.status = failed 并记录原因。

---

## 8. 后端 API 契约（v1）

### 8.1 上传简历
- POST /api/v1/resumes
- multipart/form-data: file
- Response:
  - resume_id: number
  - extracted_preview: string（前 500 字）

### 8.2 创建会话（选择题数）
- POST /api/v1/sessions
- Body:
  - resume_id: number
  - question_count: number（3..10）
- Response:
  - session_id: number
  - status: "in_progress"
  - current_question: Question

### 8.3 提交答案并获取下一题/最终结果
- POST /api/v1/sessions/{session_id}/answers
- Body:
  - question_id: string
  - answer: string
- Response（未结束）:
  - status: "in_progress"
  - current_index: number
  - next_question: Question
- Response（结束）:
  - status: "completed"
  - final_analysis: AnalysisResult

### 8.4 获取会话详情（含消息记录）
- GET /api/v1/sessions/{session_id}
- Response:
  - session: {...}
  - messages: [...]

### 8.5 历史会话列表
- GET /api/v1/sessions?limit=20&offset=0
- Response:
  - items: [...]
  - total: number

---

## 9. 关键实现规则（强制）

- 服务层不得直接拼接 prompt；prompt 统一放在 backend/app/llm/prompts。
- 所有 LLM 输出必须经过 Pydantic 模型校验，不通过则重试或失败落库。
- messages 表为事实记录源；sessions.current_index 仅用于加速查询。
- 每次生成 question/analysis 必须写入 messages（assistant/question 与 assistant/final）。
- 状态推进必须可重入：重复提交答案需幂等（按 question_id 去重）。
- 上传文件大小限制与 MIME 白名单（pdf/docx）。
- 统一错误响应：
  - code: string
  - message: string
  - request_id: string

---

## 10. 环境变量（.env.example）

### 10.1 backend/.env.example
APP_NAME="resume-interview"
APP_ENV="local"
APP_HOST="0.0.0.0"
APP_PORT="8000"
APP_LOG_LEVEL="INFO"
APP_CORS_ORIGINS="http://localhost:3000
"

MYSQL_HOST="127.0.0.1"
MYSQL_PORT="3306"
MYSQL_DB="resume_interview"
MYSQL_USER="root"
MYSQL_PASSWORD=""

DATABASE_URL="mysql+aiomysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}?charset=utf8mb4"

DEEPSEEK_API_KEY=""
DEEPSEEK_BASE_URL=""
DEEPSEEK_MODEL="deepseek-chat"
LLM_TIMEOUT_SECONDS="60"
LLM_MAX_RETRIES="2"

RESUME_MAX_MB="10"
RESUME_STORAGE_MODE="db_text" # db_text | local_file
RESUME_LOCAL_DIR="./.data/resumes" # 当 mode=local_file 时使用

SECRET_KEY=""
REQUEST_ID_HEADER="X-Request-ID"


### 10.2 frontend/.env.example
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
NEXT_PUBLIC_APP_NAME="Resume Interview"


---

## 11. 验收清单（DoD）

- 上传 PDF/DOCX -> extracted_preview 非空（解析失败给出可读错误）。
- 创建会话后立即返回第 1 题。
- 连续答题直到第 N 题结束，返回 final_analysis 且落库 analyses + messages。
- 断线后刷新：GET session 可恢复当前进度与历史问答。
- 历史会话列表可打开详情页，完整展示问题、答案、最终建议。
- migrations 可一键初始化；核心路径有单测覆盖。
- 前端 UI 覆盖上传/答题/结果/历史，样式一致且可用。
