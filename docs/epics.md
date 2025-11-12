# code-rag - Epic Breakdown

**Author:** commander
**Date:** 2025-11-11
**Project Level:** Level 2-3 (Medium complexity SaaS platform)
**Target Scale:** 200 concurrent users, 1000+ documents, 50+ code repositories

---

## Overview

This document provides the complete epic and story breakdown for code-rag, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

### Epic Structure

1. **Epic 1: 项目基础架构** - 项目初始化、技术栈搭建、容器化部署、CI/CD 基础
2. **Epic 2: 数据源集成与同步** - 飞书、GitLab、数据库三类数据源的接入与同步
3. **Epic 3: 核心检索能力** - 多角色视角检索、准确性优先策略、来源引用追溯
4. **Epic 4: 差异分析与代码建议** - 需求与代码自动对齐、差异总结生成、待办列表生成
5. **Epic 5: 内容共建平台** - 低门槛内容上传、PRD/设计资源管理、UI 需求提炼
6. **Epic 6: 权限与审核体系** - 四角色权限体系、人工审核机制、反馈闭环
7. **Epic 7: 监控与报表** - 数据看板、基础报表导出

---

## Epic 1: 项目基础架构

建立项目的基础技术架构，包括项目初始化、技术栈选择、容器化部署和 CI/CD 基础，为后续所有功能开发提供稳定的基础设施支撑。

### Story 1.1: 项目初始化与代码仓库设置

As a **开发工程师**,
I want **项目代码仓库和基础目录结构已建立**,
So that **团队可以开始协作开发，所有代码有统一的组织结构**.

**Acceptance Criteria:**

**Given** 项目需求已明确（PRD 已创建）
**When** 初始化项目代码仓库
**Then** 创建标准的项目目录结构（src、docs、tests、config 等）
**And** 初始化 Git 仓库并配置 .gitignore
**And** 创建 README.md 包含项目介绍、快速开始指南
**And** 建立基础的文档目录结构

**Prerequisites:** 无（这是第一个 Story）

**Technical Notes:**
- 选择 Node.js/TypeScript 或 Python 技术栈（根据团队偏好）
- 目录结构需考虑前后端分离（API 服务 + Web 控制台）
- 预留配置文件目录用于环境变量和部署配置
- 文档目录需与 PRD、Epic 文档保持一致

---

### Story 1.2: 技术栈与核心依赖配置

As a **开发工程师**,
I want **项目技术栈和核心依赖已配置完成**,
So that **可以开始编写业务代码，无需重复配置基础依赖**.

**Acceptance Criteria:**

**Given** 项目目录结构已建立
**When** 配置技术栈和依赖管理
**Then** 初始化包管理器（npm/pnpm 或 pip/poetry）
**And** 安装并配置核心框架（如 Express/FastAPI、React/Vue）
**And** 配置 TypeScript/ESLint/Prettier（如使用 TypeScript）
**And** 创建基础配置文件（tsconfig.json、.eslintrc、.prettierrc 等）
**And** 配置开发环境启动脚本

**Prerequisites:** Story 1.1

**Technical Notes:**
- API 服务：Node.js + Express/Fastify 或 Python + FastAPI
- Web 控制台：React + TypeScript 或 Vue 3 + TypeScript
- 数据库：PostgreSQL/MySQL（用于元数据）+ 向量数据库（如 Milvus/Pinecone）
- 向量检索：LangChain 或类似框架
- 确保依赖版本锁定，使用 package-lock.json 或 poetry.lock

---

### Story 1.3: 容器化部署配置

As a **运维工程师**,
I want **项目已配置 Docker 容器化部署**,
So that **可以在阿里云服务器上快速部署和扩展服务**.

**Acceptance Criteria:**

**Given** 技术栈和依赖已配置
**When** 创建 Docker 配置文件
**Then** 创建 Dockerfile 用于构建 API 服务镜像
**And** 创建 Dockerfile 用于构建 Web 控制台镜像
**And** 创建 docker-compose.yml 用于本地开发环境
**And** 配置多阶段构建以优化镜像大小
**And** 配置健康检查端点

**Prerequisites:** Story 1.2

**Technical Notes:**
- 使用多阶段构建减少生产镜像体积
- 配置 .dockerignore 排除不必要的文件
- 环境变量通过 .env 文件管理，不硬编码
- 考虑后续需要支持数据库、向量数据库等服务的容器编排

---

### Story 1.4: CI/CD 基础流水线

As a **开发工程师**,
I want **基础的 CI/CD 流水线已配置**,
So that **代码提交后可以自动进行测试和部署**.

**Acceptance Criteria:**

**Given** 项目已容器化
**When** 配置 CI/CD 流水线
**Then** 创建 GitHub Actions 或 GitLab CI 配置文件
**And** 配置代码检查步骤（lint、type check）
**And** 配置单元测试执行步骤
**And** 配置构建 Docker 镜像步骤
**And** 配置部署到阿里云服务器的步骤（手动触发或自动）

**Prerequisites:** Story 1.3

**Technical Notes:**
- 使用 GitHub Actions 或 GitLab CI（根据代码仓库选择）
- 部署步骤可以是手动触发，MVP 阶段不需要全自动部署
- 配置必要的密钥和凭证管理（使用 Secrets）
- 考虑后续扩展：自动化测试覆盖率检查、代码质量门禁

---

### Story 1.5: 基础 API 框架与路由结构

As a **开发工程师**,
I want **API 服务的基础框架和路由结构已建立**,
So that **可以开始实现具体的业务接口**.

**Acceptance Criteria:**

**Given** 技术栈已配置
**When** 搭建 API 框架
**Then** 创建 Express/FastAPI 应用实例
**And** 配置基础中间件（CORS、body parser、错误处理）
**And** 建立路由结构（/api/v1/...）
**And** 创建健康检查端点 GET /health
**And** 配置 API 版本管理机制（URL 路径或请求头）
**And** 创建基础的错误响应格式

**Prerequisites:** Story 1.2

**Technical Notes:**
- API 版本通过 URL 路径管理：/api/v1/...
- 统一错误响应格式：{ code, message, data }
- 配置 CORS 允许 Web 控制台跨域访问
- 预留认证中间件位置（SSO 集成）

---

### Story 1.6: 数据库连接与基础模型

As a **开发工程师**,
I want **数据库连接和基础数据模型已配置**,
So that **可以开始存储和查询业务数据**.

**Acceptance Criteria:**

**Given** API 框架已建立
**When** 配置数据库连接
**Then** 安装并配置 ORM（如 Prisma、TypeORM 或 SQLAlchemy）
**And** 创建数据库连接配置（支持环境变量）
**And** 定义基础数据模型（User、Role、DataSource、Document 等）
**And** 创建数据库迁移脚本
**And** 配置数据库连接池

**Prerequisites:** Story 1.5

**Technical Notes:**
- 使用 PostgreSQL 或 MySQL 作为主数据库
- 数据模型需考虑：用户、角色、数据源、文档、检索历史、反馈等
- 预留扩展字段，支持未来多租户或计费需求
- 配置数据库连接池参数，支持 200 并发用户

---

### Story 1.7: Web 控制台基础框架

As a **前端开发工程师**,
I want **Web 控制台的基础框架和路由已建立**,
So that **可以开始实现具体的页面和功能**.

**Acceptance Criteria:**

**Given** 技术栈已配置
**When** 搭建 Web 控制台框架
**Then** 创建 React/Vue 应用实例
**And** 配置路由系统（React Router 或 Vue Router）
**And** 创建基础布局组件（Header、Sidebar、Main Content）
**And** 配置 API 客户端（Axios/Fetch）与 API 基础 URL
**And** 创建基础的错误处理和加载状态组件
**And** 配置环境变量管理（开发/生产环境）

**Prerequisites:** Story 1.2

**Technical Notes:**
- 使用 React + TypeScript 或 Vue 3 + TypeScript
- 路由结构需考虑：登录、数据看板、数据源管理、检索、内容管理等
- API 客户端需统一错误处理和请求拦截（用于 SSO token）
- 预留主题和样式系统，支持轻量高效的 UI 风格

---

## Epic 2: 数据源集成与同步

建立飞书文档、GitLab 代码库、自建数据库三类数据源的接入与同步能力，为知识库提供数据基础。

### Story 2.1: 数据源配置管理

As a **管理员**,
I want **在 Web 控制台中配置数据源连接信息**,
So that **系统可以连接到飞书、GitLab 和数据库等外部数据源**.

**Acceptance Criteria:**

**Given** Web 控制台基础框架已建立
**When** 管理员在数据源管理页面添加新数据源
**Then** 系统支持配置飞书文档数据源（App ID、App Secret、文档空间 ID）
**And** 系统支持配置 GitLab 数据源（GitLab URL、Access Token、项目列表）
**And** 系统支持配置数据库数据源（数据库类型、连接字符串、表名）
**And** 系统验证连接信息有效性（测试连接功能）
**And** 系统保存数据源配置到数据库
**And** 系统支持启用/禁用数据源

**Prerequisites:** Story 1.6, Story 1.7

**Technical Notes:**
- 数据源配置存储在数据库 DataSource 表中
- 敏感信息（Token、Secret）需加密存储
- 提供测试连接 API：POST /api/v1/data-sources/test
- 支持配置多个同类型数据源（如多个 GitLab 项目）

---

### Story 2.2: 飞书文档同步能力

As a **系统**,
I want **从飞书文档空间同步 PRD 和需求文档**,
So that **这些文档可以被检索和引用**.

**Acceptance Criteria:**

**Given** 飞书数据源已配置
**When** 执行飞书文档同步任务
**Then** 系统通过飞书 API 获取文档列表
**And** 系统下载文档内容（支持 Markdown、Word 格式）
**And** 系统解析文档元信息（标题、作者、更新时间、文档链接）
**And** 系统将文档内容存储到向量数据库
**And** 系统将文档元信息存储到关系数据库
**And** 系统记录同步状态和错误日志

**Prerequisites:** Story 2.1

**Technical Notes:**
- 使用飞书开放平台 API（文档 API）
- 文档内容需要分块（chunking）后存入向量数据库
- 支持增量同步：仅同步更新时间和上次同步时间不一致的文档
- 处理同步失败：记录错误，支持重试机制
- 文档链接格式：https://xxx.feishu.cn/docs/...

---

### Story 2.3: GitLab 代码库同步能力

As a **系统**,
I want **从 GitLab 代码库同步代码文件**,
So that **代码可以被检索和引用**.

**Acceptance Criteria:**

**Given** GitLab 数据源已配置
**When** 执行 GitLab 代码同步任务
**Then** 系统通过 GitLab API 获取项目文件列表
**And** 系统下载代码文件内容（支持常见编程语言）
**And** 系统解析代码元信息（文件路径、仓库、分支、提交哈希、行号范围）
**And** 系统将代码内容分块存储到向量数据库
**And** 系统将代码元信息存储到关系数据库
**And** 系统支持按技术栈筛选（如仅同步 TypeScript、Python 文件）

**Prerequisites:** Story 2.1

**Technical Notes:**
- 使用 GitLab API（Repository Files API、Commits API）
- 代码分块策略：按函数/类/模块边界分块，保留上下文
- 支持增量同步：基于 Git commit 历史判断变更
- 代码链接格式：https://gitlab.com/xxx/yyy/-/blob/main/path/to/file.ts#L10-20
- 过滤规则：排除 node_modules、.git、构建产物等目录

---

### Story 2.4: 数据库数据同步能力

As a **系统**,
I want **从自建数据库同步业务数据上下文**,
So that **数据库结构和业务逻辑可以被检索**.

**Acceptance Criteria:**

**Given** 数据库数据源已配置
**When** 执行数据库数据同步任务
**Then** 系统连接目标数据库
**And** 系统读取表结构（表名、字段、类型、注释）
**And** 系统读取表数据样本（可选，用于理解业务逻辑）
**And** 系统将表结构和数据样本存储到向量数据库
**And** 系统将数据库元信息存储到关系数据库
**And** 系统支持配置同步范围（指定表名列表）

**Prerequisites:** Story 2.1

**Technical Notes:**
- 支持常见数据库：MySQL、PostgreSQL、MongoDB
- 表结构信息：CREATE TABLE 语句、字段注释、索引信息
- 数据样本：每个表取前 N 条记录作为示例（可配置）
- 数据库链接格式：通过数据源配置中的连接信息构建
- 注意数据安全：不同步敏感数据，仅同步结构信息

---

### Story 2.5: 定时同步任务调度

As a **管理员**,
I want **数据源可以按配置的频率自动同步**,
So that **知识库内容与源系统保持最新**.

**Acceptance Criteria:**

**Given** 数据源同步能力已实现
**When** 管理员配置数据源同步频率
**Then** 系统支持配置同步间隔（每小时、每天、每周等）
**And** 系统创建定时任务（使用 cron 或任务调度框架）
**And** 系统按配置频率自动触发同步任务
**And** 系统记录每次同步的执行时间和结果
**And** 系统支持手动触发同步（立即执行）

**Prerequisites:** Story 2.2, Story 2.3, Story 2.4

**Technical Notes:**
- 使用 node-cron（Node.js）或 APScheduler（Python）实现定时任务
- 同步任务异步执行，不阻塞 API 请求
- 支持任务队列：使用 Bull/BullMQ 或 Celery 管理任务
- 记录同步历史：成功/失败、耗时、数据量变化
- 错误处理：同步失败时发送通知（后续实现）

---

### Story 2.6: 数据源状态监控

As a **管理员**,
I want **在数据看板中查看数据源状态和同步情况**,
So that **可以及时发现和处理数据源问题**.

**Acceptance Criteria:**

**Given** 数据源同步任务已配置
**When** 管理员访问数据看板
**Then** 系统显示所有数据源的连接状态（正常/异常）
**And** 系统显示每个数据源的最后同步时间
**And** 系统显示每个数据源的数据量统计（文档数、代码文件数等）
**And** 系统显示最近的同步错误记录
**And** 系统提供数据源健康度提示和处理建议

**Prerequisites:** Story 2.5, Story 1.7

**Technical Notes:**
- 数据源状态通过定期健康检查更新
- 健康检查：测试连接、验证权限、检查最近同步结果
- 状态展示在管理员看板首页
- 异常状态需明确提示：连接失败、权限不足、同步错误等
- 提供快速操作：重新测试连接、手动触发同步

---

## Epic 3: 核心检索能力

实现多角色视角的智能检索、准确性优先的检索策略、来源引用追溯等核心检索能力，这是产品的核心价值所在。

### Story 3.1: 向量数据库集成与检索基础

As a **开发工程师**,
I want **向量数据库已集成并支持基础的向量检索**,
So that **可以实现语义检索功能**.

**Acceptance Criteria:**

**Given** 数据源同步能力已实现（文档和代码已存入向量数据库）
**When** 用户发起检索请求
**Then** 系统连接向量数据库（Milvus/Pinecone/Chroma）
**And** 系统将用户查询转换为向量嵌入
**And** 系统执行向量相似度搜索
**And** 系统返回相似度最高的前 N 条结果
**And** 系统返回结果包含相似度分数

**Prerequisites:** Story 2.2, Story 2.3, Story 2.4

**Technical Notes:**
- 使用 LangChain 或类似框架进行向量嵌入和检索
- 嵌入模型：选择适合中文的模型（如 text-embedding-ada-002 或开源中文模型）
- 向量数据库索引：配置合适的索引类型（HNSW、IVF 等）以优化检索速度
- 检索参数：top_k 数量、相似度阈值可配置
- 性能要求：检索接口 P95 < 5 秒

---

### Story 3.2: 多角色视角检索逻辑

As a **开发/产品/UI 角色**,
I want **检索结果根据我的角色视角返回差异化内容**,
So that **我能快速找到对我最有用的信息**.

**Acceptance Criteria:**

**Given** 向量检索基础能力已实现
**When** 用户以特定角色身份发起检索（开发/产品/UI）
**Then** 系统根据角色类型应用不同的检索权重策略
**And** 开发角色：优先返回代码片段、实现细节、技术文档
**And** 产品角色：优先返回 PRD、需求文档、业务逻辑说明
**And** UI 角色：优先返回设计稿、交互说明、UI 组件文档
**And** 系统对检索结果按角色相关性重新排序
**And** 系统在结果中标注内容类型（代码/文档/设计）

**Prerequisites:** Story 3.1

**Technical Notes:**
- 角色信息从用户会话或请求头中获取
- 实现角色权重策略：为不同类型内容设置权重系数
- 内容类型标记：在数据同步时标记内容类型（code/document/design）
- 检索时根据角色和内容类型计算加权相似度
- 支持混合检索：同时考虑语义相似度和角色权重

---

### Story 3.3: 置信度计算与疑似结果处理

As a **用户**,
I want **系统在检索结果不可靠时明确标记为"疑似"**,
So that **我不会被错误信息误导**.

**Acceptance Criteria:**

**Given** 检索结果已返回
**When** 系统计算检索结果的置信度
**Then** 系统基于相似度分数、结果数量、内容质量等因素计算置信度
**And** 当置信度低于阈值时，系统标记结果为"疑似"状态
**And** 系统限制疑似结果最多返回 3 条候选文档
**And** 系统在返回结果中明确标注"疑似"状态和置信度
**And** 系统提示用户需要确认或补充信息
**And** 系统不生成或返回不确定的答案内容

**Prerequisites:** Story 3.2

**Technical Notes:**
- 置信度计算公式：综合考虑相似度分数、结果数量、内容完整性
- 置信度阈值可配置（建议初始值 0.7）
- 疑似结果处理：返回原始文档片段，不进行 LLM 生成或总结
- 用户交互：提供"确认"或"补充信息"操作入口
- 记录疑似结果：用于后续算法优化和数据分析

---

### Story 3.4: 来源引用与可追溯性

As a **用户**,
I want **每个检索结果都附带原始来源链接和元信息**,
So that **我可以快速验证结果的可靠性并追溯上下文**.

**Acceptance Criteria:**

**Given** 检索结果已返回
**When** 系统返回检索结果
**Then** 每条结果包含可点击的原始来源链接
**And** 飞书文档：包含文档链接，点击跳转到飞书文档页面
**And** GitLab 代码：包含代码文件链接和行号范围，点击跳转到 GitLab 代码页面
**And** 数据库：包含数据库连接信息和表名
**And** 每条结果包含元信息（作者、更新时间、版本、数据源类型）
**And** 系统在结果中高亮显示匹配的文本片段

**Prerequisites:** Story 3.3

**Technical Notes:**
- 来源链接格式：
  - 飞书：https://xxx.feishu.cn/docs/xxx
  - GitLab：https://gitlab.com/xxx/yyy/-/blob/main/path#L10-20
  - 数据库：通过数据源配置构建连接信息
- 元信息从关系数据库的 Document 表中获取
- 文本高亮：在返回的文档片段中标记匹配的关键词
- 支持批量导出来源链接（用于引用和审计）

---

### Story 3.5: 检索历史记录

As a **开发角色**,
I want **查看我的检索历史记录**,
So that **可以回顾和复用之前的查询**.

**Acceptance Criteria:**

**Given** 用户已执行多次检索
**When** 开发角色访问检索历史页面
**Then** 系统显示用户的检索查询列表（按时间倒序）
**And** 每条记录包含：查询内容、检索时间、返回结果数量、采纳状态
**And** 系统支持按时间范围、关键词、角色筛选历史记录
**And** 系统支持查看历史记录的详细结果
**And** 系统支持重新执行历史查询
**And** 系统支持团队视角查看（管理员可查看团队检索统计）

**Prerequisites:** Story 3.4

**Technical Notes:**
- 检索历史存储在关系数据库的 SearchHistory 表中
- 记录字段：user_id、query、role、results_count、adoption_status、created_at
- 支持分页查询，避免历史记录过多影响性能
- 团队视角：聚合团队成员的检索统计（热门查询、采纳率等）
- 数据保留策略：可配置保留时间（如 90 天）

---

### Story 3.6: 检索 API 接口

As a **业务 agent 或 Web 前端**,
I want **通过 API 接口调用检索功能**,
So that **可以集成到现有工作流中**.

**Acceptance Criteria:**

**Given** 检索能力已实现
**When** 调用检索 API
**Then** 系统提供 POST /api/v1/search 接口
**And** 接口接收参数：query（查询文本）、role（角色类型）、limit（返回数量）、threshold（置信度阈值）
**And** 接口返回检索结果列表，包含：内容、来源链接、元信息、置信度、疑似标记
**And** 接口响应时间 P95 < 5 秒
**And** 接口支持并发请求（200 并发用户）
**And** 接口返回统一的 JSON 格式

**Prerequisites:** Story 3.5

**Technical Notes:**
- API 接口设计遵循 RESTful 规范
- 请求参数验证：query 必填，role 可选（默认开发角色）
- 响应格式：{ code, message, data: { results: [], total, confidence } }
- 性能优化：使用缓存、异步处理、连接池等技术
- API 文档：使用 Swagger/OpenAPI 生成接口文档
- 限流保护：防止恶意请求，保护系统稳定性

---

## Epic 4: 差异分析与代码建议

实现需求与代码自动对齐、差异总结生成、待办列表生成等能力，这是产品的"魔力时刻"——让用户在同一界面看到"改什么、为何改、怎么改"。

### Story 4.1: 需求解析与变更识别

As a **开发角色**,
I want **系统能解析我的需求描述并识别需要新增或修改的功能点**,
So that **可以快速理解需求变更范围**.

**Acceptance Criteria:**

**Given** 用户输入需求描述
**When** 系统处理需求描述
**Then** 系统使用 LLM 或规则引擎解析需求文本
**And** 系统识别需求中的新增功能点
**And** 系统识别需求中的修改功能点
**And** 系统识别需求中的影响范围（相关模块、依赖关系）
**And** 系统输出结构化的变更清单（新增/修改/影响面）

**Prerequisites:** Story 3.6

**Technical Notes:**
- 使用 LLM（如 GPT-4、Claude）进行需求解析，或使用规则引擎+关键词匹配
- 需求解析提示词：明确要求输出结构化 JSON（新增项、修改项、影响面）
- 变更识别策略：结合关键词匹配和语义理解
- 输出格式：{ new_features: [], modified_features: [], impact_scope: [] }
- 支持中文需求描述，理解业务术语和技术术语

---

### Story 4.2: 历史代码匹配与推荐

As a **开发角色**,
I want **系统能匹配历史相关代码并推荐实现示例**,
So that **可以参考已有的实现方式**.

**Acceptance Criteria:**

**Given** 需求变更点已识别
**When** 系统匹配历史代码
**Then** 系统对每个变更点进行向量检索，查找相似的历史代码
**And** 系统返回与变更点相关的代码片段（函数、类、模块）
**And** 系统返回代码的完整上下文（文件路径、相关函数、依赖关系）
**And** 系统标注代码与需求变更点的匹配度
**And** 系统提供代码的原始来源链接

**Prerequisites:** Story 4.1

**Technical Notes:**
- 使用向量检索匹配历史代码：将变更点描述转换为向量，检索相似代码
- 代码匹配策略：考虑函数名、注释、实现逻辑的相似度
- 上下文提取：不仅返回匹配的代码片段，还包含前后相关代码
- 匹配度计算：综合考虑语义相似度、代码结构相似度
- 支持多语言代码匹配（TypeScript、Python、Java 等）

---

### Story 4.3: 差异总结生成

As a **开发角色**,
I want **系统自动生成清晰的差异总结**,
So that **可以快速理解改动逻辑和影响范围**.

**Acceptance Criteria:**

**Given** 需求变更点和历史代码已匹配
**When** 系统生成差异总结
**Then** 系统生成新增功能点摘要，包含功能描述和推荐实现方式
**And** 系统生成修改功能点摘要，包含修改前后对比和影响分析
**And** 系统生成影响范围分析，列出可能受影响的模块和依赖
**And** 系统附上相关 PRD 片段，说明需求背景
**And** 系统附上历史代码对比，展示参考实现
**And** 差异总结清晰可读，包含具体变更项和对应来源

**Prerequisites:** Story 4.2

**Technical Notes:**
- 使用 LLM 生成差异总结，基于需求变更点和匹配的历史代码
- 总结格式：Markdown 格式，包含标题、列表、代码块
- PRD 片段提取：从检索结果中提取相关的 PRD 段落
- 代码对比：使用 diff 算法展示代码变更（如有历史版本）
- 影响分析：基于代码依赖关系分析影响范围

---

### Story 4.4: 待办列表生成

As a **开发角色**,
I want **系统基于差异分析结果自动生成待办事项列表**,
So that **可以直接用于任务管理和开发流程**.

**Acceptance Criteria:**

**Given** 差异总结已生成
**When** 系统生成待办列表
**Then** 系统为每个新增功能点创建待办项
**And** 系统为每个修改功能点创建待办项
**And** 每个待办项包含：任务描述、优先级、关联文档链接、代码引用链接
**And** 系统支持导出待办列表（JSON、Markdown 格式）
**And** 系统支持将待办列表导入到任务管理工具（如 Jira、Trello）

**Prerequisites:** Story 4.3

**Technical Notes:**
- 待办项数据结构：{ title, description, priority, related_docs: [], code_refs: [], status }
- 优先级计算：基于影响范围、依赖关系、业务重要性
- 导出格式：支持 JSON（用于 API 集成）、Markdown（用于文档）
- 任务管理工具集成：提供 Webhook 或 API 接口，支持推送到外部工具
- 待办项状态跟踪：支持标记完成、更新进度

---

### Story 4.5: 差异分析 API 接口

As a **业务 agent 或 Web 前端**,
I want **通过 API 接口调用差异分析功能**,
So that **可以集成到自动化工作流中**.

**Acceptance Criteria:**

**Given** 差异分析能力已实现
**When** 调用差异分析 API
**Then** 系统提供 POST /api/v1/analyze-diff 接口
**And** 接口接收参数：requirement（需求描述）、role（角色类型）
**And** 接口返回差异分析结果：变更清单、代码推荐、差异总结、待办列表
**And** 接口响应时间合理（可接受较长的处理时间，如 30 秒内）
**And** 接口支持异步处理（返回任务 ID，通过轮询获取结果）
**And** 接口返回统一的 JSON 格式

**Prerequisites:** Story 4.4

**Technical Notes:**
- API 接口设计：支持同步和异步两种模式
- 异步模式：POST /api/v1/analyze-diff（创建任务）→ GET /api/v1/tasks/{task_id}（查询结果）
- 响应格式：{ code, message, data: { changes: {}, code_recommendations: [], summary: "", todos: [] } }
- 性能考虑：差异分析涉及 LLM 调用，可能需要较长时间，建议使用异步模式
- 错误处理：需求描述不清晰时，返回错误提示，建议用户补充信息

---

### Story 4.6: 差异分析结果展示界面

As a **开发角色**,
I want **在 Web 控制台中查看差异分析结果**,
So that **可以直观地理解需求变更和实现建议**.

**Acceptance Criteria:**

**Given** 差异分析已完成
**When** 用户在 Web 控制台查看分析结果
**Then** 系统展示需求变更清单（新增/修改/影响面）
**And** 系统展示推荐的代码片段，支持代码高亮和折叠
**And** 系统展示差异总结，支持 Markdown 渲染
**And** 系统展示待办列表，支持标记完成和导出
**And** 系统提供所有来源链接，点击可跳转到原始文档或代码
**And** 界面布局清晰，信息密度适中，符合轻量高效的 UI 风格

**Prerequisites:** Story 4.5, Story 1.7

**Technical Notes:**
- 前端组件：使用代码编辑器组件（如 Monaco Editor）展示代码
- Markdown 渲染：使用 Markdown 渲染库（如 marked、react-markdown）
- 交互设计：支持展开/折叠、标签页切换、搜索过滤
- 响应式设计：适配桌面端，确保信息完整展示
- 性能优化：大量代码片段时使用虚拟滚动

---

## Epic 5: 内容共建平台

实现低门槛的内容上传、PRD/设计资源管理、UI 需求提炼等功能，让产品与 UI 团队能够主动参与知识库维护。

### Story 5.1: 文档上传功能

As a **产品/UI 角色**,
I want **通过 Web 控制台上传 PRD、设计稿等文档**,
So that **可以快速将新内容添加到知识库**.

**Acceptance Criteria:**

**Given** 用户已登录并具有产品/UI 角色权限
**When** 用户在内容管理页面上传文档
**Then** 系统支持拖拽上传和点击选择文件两种方式
**And** 系统支持上传 Markdown、Word、PDF、图片等格式
**And** 系统支持批量上传多个文件
**And** 系统显示上传进度和状态
**And** 系统在上传完成后自动解析文档内容
**And** 系统提取文档元信息（标题、作者、类型等）
**And** 非技术用户能在 5 分钟内完成一次文档上传

**Prerequisites:** Story 1.7, Story 6.1（权限体系）

**Technical Notes:**
- 文件上传使用 multipart/form-data 格式
- 文件大小限制：单个文件不超过 50MB
- 文件存储：使用对象存储（OSS）或本地文件系统
- 文档解析：使用库解析不同格式（如 mammoth 解析 Word、pdf-parse 解析 PDF）
- 元信息提取：从文档标题、元数据、文件名中提取
- 上传 API：POST /api/v1/documents/upload

---

### Story 5.2: 文档自动入库与索引

As a **系统**,
I want **上传的文档自动解析并存入知识库**,
So that **文档可以被检索和引用**.

**Acceptance Criteria:**

**Given** 文档已上传
**When** 系统处理上传的文档
**Then** 系统解析文档内容（文本提取、格式转换）
**And** 系统将文档内容分块（chunking）后存入向量数据库
**And** 系统将文档元信息存入关系数据库
**And** 系统标记文档类型（PRD、设计稿、知识片段等）
**And** 系统记录文档来源（上传用户、上传时间）
**And** 系统支持文档版本管理（同一文档多次上传视为新版本）

**Prerequisites:** Story 5.1

**Technical Notes:**
- 文档分块策略：按段落、章节、页面分块，保留上下文
- 向量化：使用与检索相同的嵌入模型将文档块转换为向量
- 元数据存储：Document 表存储文档基本信息，DocumentVersion 表存储版本历史
- 版本管理：支持查看历史版本、回滚到指定版本
- 异步处理：文档解析和索引在后台异步执行，不阻塞上传

---

### Story 5.3: PRD 文档管理

As a **产品角色**,
I want **集中管理我上传的 PRD 文档**,
So that **可以统一管理产品需求文档**.

**Acceptance Criteria:**

**Given** 产品角色已上传多个 PRD 文档
**When** 产品角色访问 PRD 管理页面
**Then** 系统显示所有 PRD 文档列表（按时间倒序）
**And** 系统支持按标题、标签、时间范围搜索筛选
**And** 系统支持查看文档详情（内容、元信息、版本历史）
**And** 系统支持编辑文档（更新内容、修改标签）
**And** 系统支持删除文档（软删除，保留历史记录）
**And** 系统支持文档标签分类（如：功能需求、技术需求、业务需求）

**Prerequisites:** Story 5.2

**Technical Notes:**
- PRD 管理页面：/content/prd 路由
- 文档列表：支持分页、排序、筛选
- 文档编辑：支持在线编辑（Markdown 编辑器）或重新上传
- 标签系统：支持多标签，标签可自定义
- 权限控制：产品角色只能管理自己上传的文档，管理员可管理所有文档

---

### Story 5.4: 设计资源管理

As a **UI 角色**,
I want **集中管理我上传的设计稿和设计资源**,
So that **可以统一管理设计资产**.

**Acceptance Criteria:**

**Given** UI 角色已上传多个设计稿
**When** UI 角色访问设计资源管理页面
**Then** 系统显示所有设计资源列表（支持缩略图预览）
**And** 系统支持按名称、标签、时间范围搜索筛选
**And** 系统支持查看设计稿详情（图片预览、元信息、关联 PRD）
**And** 系统支持编辑设计稿信息（更新名称、标签、描述）
**And** 系统支持删除设计稿（软删除）
**And** 系统支持设计稿与 PRD 关联（标记设计稿对应的 PRD 文档）

**Prerequisites:** Story 5.2

**Technical Notes:**
- 设计资源管理页面：/content/designs 路由
- 图片预览：支持常见图片格式（PNG、JPG、SVG），生成缩略图
- 设计稿元信息：名称、描述、标签、关联 PRD、上传时间、版本
- 关联关系：DesignDocument 关联表记录设计稿与 PRD 的关联
- 权限控制：UI 角色只能管理自己上传的设计稿

---

### Story 5.5: UI 需求提炼功能

As a **UI 角色**,
I want **从 PRD 中识别需要新设计的内容并生成设计任务清单**,
So that **可以提前识别设计需求**.

**Acceptance Criteria:**

**Given** PRD 文档已上传
**When** UI 角色查看 PRD 文档
**Then** 系统支持在 PRD 段落中标记"需要设计"
**And** 系统自动识别 PRD 中的 UI 相关关键词（如：界面、交互、按钮、表单等）
**And** 系统汇总所有标记的段落，生成设计待办列表
**And** 系统为每个设计待办项创建任务描述和优先级
**And** 系统支持导出设计待办列表（用于设计工具或任务管理）

**Prerequisites:** Story 5.3

**Technical Notes:**
- UI 需求识别：使用关键词匹配或 LLM 识别 PRD 中的 UI 相关需求
- 标记功能：在 PRD 查看页面提供"标记为需要设计"按钮
- 设计待办数据结构：{ prd_id, paragraph_id, description, priority, status, created_at }
- 优先级计算：基于 PRD 中的优先级标记、功能重要性
- 导出格式：支持 JSON、Markdown，可导入到设计工具（如 Figma、蓝湖）

---

### Story 5.6: 内容审核工作流

As a **管理员或审核员**,
I want **审核用户上传的新内容**,
So that **确保知识库内容质量**.

**Acceptance Criteria:**

**Given** 用户上传了新文档
**When** 管理员访问审核页面
**Then** 系统显示待审核的文档列表
**And** 系统展示文档内容和元信息
**And** 系统提供"确认"和"退回"操作
**And** 系统支持填写退回原因
**And** 系统记录审核结果和审核人
**And** 审核通过后文档自动入库，审核退回后通知上传用户

**Prerequisites:** Story 5.2, Story 6.1

**Technical Notes:**
- 审核工作流：文档上传后进入"待审核"状态，审核通过后变为"已发布"
- 审核权限：管理员和指定的审核员角色
- 审核记录：AuditLog 表记录审核历史（审核人、时间、结果、原因）
- 通知机制：审核退回时通过站内消息或邮件通知上传用户
- 批量审核：支持批量确认或退回多个文档

---

## Epic 6: 权限与审核体系

实现四角色权限体系、SSO 认证集成、人工审核机制和反馈闭环，保障数据安全和内容质量。

### Story 6.1: SSO 认证集成

As a **用户**,
I want **通过 SSO 单点登录访问系统**,
So that **可以使用企业内部账号登录，无需单独注册**.

**Acceptance Criteria:**

**Given** 系统已部署
**When** 用户访问系统
**Then** 系统提供 SSO 登录入口
**And** 系统集成企业内部 SSO 服务（如 SAML、OAuth2）
**And** 用户通过 SSO 登录后，系统获取用户信息（姓名、邮箱、部门等）
**And** 系统创建或更新用户账号
**And** 系统建立用户会话，用户可正常访问系统
**And** 系统记录用户登录日志

**Prerequisites:** Story 1.5, Story 1.6

**Technical Notes:**
- SSO 集成：使用 passport.js（Node.js）或类似库实现 SSO 认证
- 支持 SAML 2.0 或 OAuth2 协议（根据企业 SSO 系统选择）
- 用户信息同步：从 SSO 系统获取用户基本信息，存储到 User 表
- 会话管理：使用 JWT token 或 session 管理用户会话
- 登录日志：记录登录时间、IP 地址、登录方式

---

### Story 6.2: 四角色权限体系

As a **管理员**,
I want **系统支持管理员、产品、UI、开发四类角色**,
So that **不同角色拥有不同的功能权限和数据访问范围**.

**Acceptance Criteria:**

**Given** 用户已通过 SSO 登录
**When** 系统识别用户角色
**Then** 系统支持管理员、产品、UI、开发四类角色
**And** 管理员角色：拥有所有功能权限，可管理数据源、用户、权限配置
**And** 产品角色：可上传和管理 PRD 文档，查看检索结果
**And** UI 角色：可上传和管理设计稿，查看检索结果，提炼 UI 需求
**And** 开发角色：可执行检索、差异分析，查看检索历史
**And** 不同角色登录后看到的功能菜单和数据范围符合权限定义

**Prerequisites:** Story 6.1

**Technical Notes:**
- 角色定义：Role 表存储角色信息，UserRole 关联表记录用户角色
- 权限控制：基于角色的访问控制（RBAC），在 API 和前端路由层面实现
- 角色分配：管理员可在用户管理页面分配角色，或通过 SSO 属性自动分配
- 权限中间件：API 路由使用权限中间件验证用户角色和权限
- 前端路由守卫：前端路由根据用户角色显示/隐藏功能菜单

---

### Story 6.3: 权限配置界面

As a **管理员**,
I want **在 Web 控制台配置角色权限和用户分配**,
So that **可以灵活管理团队权限**.

**Acceptance Criteria:**

**Given** 管理员已登录
**When** 管理员访问权限配置页面
**Then** 系统显示角色列表和权限矩阵
**And** 系统支持编辑角色权限（勾选/取消功能权限）
**And** 系统支持用户角色分配（为用户分配或移除角色）
**And** 系统支持批量操作（批量分配角色、批量修改权限）
**And** 权限配置修改后立即生效，无需重启系统
**And** 系统记录权限变更日志（谁在何时修改了哪些权限）

**Prerequisites:** Story 6.2, Story 1.7

**Technical Notes:**
- 权限配置页面：/admin/permissions 路由
- 权限矩阵：以表格形式展示角色和功能的权限关系
- 权限存储：Permission 表存储功能权限，RolePermission 关联表记录角色权限
- 权限缓存：权限配置修改后更新缓存，确保实时生效
- 变更日志：PermissionChangeLog 表记录所有权限变更历史

---

### Story 6.4: 检索结果反馈机制

As a **用户**,
I want **对检索结果进行采纳/拒绝标记并提供反馈**,
So that **系统可以持续优化检索准确性**.

**Acceptance Criteria:**

**Given** 检索结果已返回
**When** 用户查看检索结果
**Then** 每条检索结果提供反馈入口（采纳/拒绝按钮）
**And** 用户可以选择采纳或拒绝检索结果
**And** 用户可以提供反馈意见（文本输入）
**And** 系统记录用户的反馈（采纳状态、反馈内容、时间）
**And** 系统计算检索结果的采纳率
**And** 管理员可在看板查看采纳率统计和反馈内容

**Prerequisites:** Story 3.6, Story 6.2

**Technical Notes:**
- 反馈数据结构：Feedback 表存储反馈信息（user_id、search_id、adoption_status、comment、created_at）
- 采纳率计算：采纳的检索次数 / 总检索次数
- 反馈展示：在检索结果页面提供反馈按钮，点击后弹出反馈表单
- 统计分析：管理员看板展示采纳率趋势、热门反馈、问题反馈等
- 反馈闭环：反馈数据用于算法优化和检索策略调整

---

### Story 6.5: 操作审计日志

As a **管理员**,
I want **系统记录所有关键操作的审计日志**,
So that **可以追踪用户行为和系统变更**.

**Acceptance Criteria:**

**Given** 用户执行关键操作
**When** 系统记录操作日志
**Then** 系统记录检索操作（查询内容、用户、时间、结果数量）
**And** 系统记录文档上传操作（文档名称、用户、时间、状态）
**And** 系统记录权限变更操作（变更内容、操作人、时间）
**And** 系统记录数据源配置变更（配置项、操作人、时间）
**And** 系统支持按用户、时间范围、操作类型查询审计日志
**And** 系统支持导出审计日志（CSV、PDF 格式）

**Prerequisites:** Story 6.3, Story 5.1, Story 2.1

**Technical Notes:**
- 审计日志表：AuditLog 表存储所有操作日志
- 日志字段：user_id、action_type、resource_type、resource_id、details、ip_address、created_at
- 日志级别：区分关键操作（权限变更、数据源配置）和普通操作（检索、查看）
- 日志保留：可配置日志保留时间（如 90 天），过期日志自动归档或删除
- 日志查询：提供日志查询 API 和 Web 界面，支持复杂查询条件

---

### Story 6.6: 疑似结果人工确认机制

As a **用户**,
I want **对系统标记为"疑似"的检索结果进行确认或补充信息**,
So that **可以提高检索结果的准确性**.

**Acceptance Criteria:**

**Given** 检索结果包含"疑似"标记
**When** 用户查看疑似结果
**Then** 系统明确标注结果为"疑似"状态和置信度
**And** 系统提供"确认"操作（确认结果有效）
**And** 系统提供"补充信息"操作（提供更多上下文信息）
**And** 用户确认后，系统记录确认结果，用于算法优化
**And** 用户补充信息后，系统重新执行检索
**And** 系统限制疑似结果最多返回 3 条候选文档

**Prerequisites:** Story 3.3, Story 6.2

**Technical Notes:**
- 疑似结果处理：在检索结果中明确标注疑似状态，使用不同的 UI 样式（如黄色警告图标）
- 确认机制：用户确认后，系统记录确认结果到 Feedback 表，用于训练和优化
- 补充信息：用户可以提供更多上下文，系统使用补充信息重新检索
- 疑似结果限制：在检索逻辑中限制疑似结果数量，避免信息过载
- 用户引导：提供清晰的提示，说明疑似结果的含义和处理方式

---

## Epic 7: 监控与报表

实现数据看板、基础报表导出等功能，帮助管理员了解系统运行状况，为管理层提供数据支撑。

### Story 7.1: 管理员数据看板

As a **管理员**,
I want **在数据看板中查看系统关键指标**,
So that **可以了解系统运行状况和用户使用情况**.

**Acceptance Criteria:**

**Given** 管理员已登录
**When** 管理员访问数据看板首页
**Then** 系统显示数据源状态概览（连接状态、最后同步时间、数据量统计）
**And** 系统显示检索统计（检索次数、命中率、响应时长、P95 延迟）
**And** 系统显示用户活跃度（日活、周活、月活用户数）
**And** 系统显示采纳率统计（总体采纳率、趋势图）
**And** 系统显示用户反馈概览（正向/负向反馈比例、热门反馈）
**And** 系统支持按时间范围筛选查看趋势（今天、本周、本月、自定义范围）
**And** 看板数据实时更新或定时刷新

**Prerequisites:** Story 1.7, Story 2.6, Story 3.6, Story 6.4

**Technical Notes:**
- 看板页面：/admin/dashboard 路由
- 数据聚合：使用 SQL 聚合查询或时序数据库（如 InfluxDB）存储指标数据
- 实时更新：使用 WebSocket 或定时轮询更新看板数据
- 图表组件：使用 ECharts、Chart.js 等图表库展示数据趋势
- 性能优化：看板数据使用缓存，避免频繁查询数据库
- 指标计算：检索次数、命中率、采纳率等指标实时计算或定时计算

---

### Story 7.2: 检索统计报表

As a **管理员**,
I want **查看详细的检索统计报表**,
So that **可以分析检索使用情况和优化方向**.

**Acceptance Criteria:**

**Given** 管理员已登录
**When** 管理员访问检索统计页面
**Then** 系统显示检索次数统计（按时间、角色、用户分组）
**And** 系统显示命中率统计（总体命中率、按角色命中率、趋势分析）
**And** 系统显示响应时长统计（平均响应时间、P95/P99 延迟、分布图）
**And** 系统显示热门查询（最常检索的关键词、查询频率）
**And** 系统显示检索结果分布（代码/文档/设计稿的检索比例）
**And** 系统支持导出检索统计报表（CSV、PDF 格式）

**Prerequisites:** Story 7.1

**Technical Notes:**
- 检索统计页面：/admin/reports/search 路由
- 数据来源：SearchHistory 表和检索日志
- 统计维度：时间、角色、用户、查询内容、结果类型
- 报表导出：使用库生成 CSV 或 PDF 文件（如 csv-writer、pdfkit）
- 数据筛选：支持按时间范围、角色、用户筛选统计数据
- 性能考虑：大量数据时使用分页或采样统计

---

### Story 7.3: 用户活跃度报表

As a **管理员**,
I want **查看用户活跃度报表**,
So that **可以了解用户使用情况和参与度**.

**Acceptance Criteria:**

**Given** 管理员已登录
**When** 管理员访问用户活跃度报表页面
**Then** 系统显示日活用户数（DAU）和趋势图
**And** 系统显示周活用户数（WAU）和月活用户数（MAU）
**And** 系统显示用户留存率（次日留存、7 日留存、30 日留存）
**And** 系统显示用户使用频率分布（活跃用户、普通用户、低频用户）
**And** 系统显示按角色的用户活跃度（开发/产品/UI 角色的使用情况）
**And** 系统支持导出用户活跃度报表（CSV、PDF 格式）

**Prerequisites:** Story 7.1

**Technical Notes:**
- 用户活跃度页面：/admin/reports/activity 路由
- 活跃度定义：DAU（当日有检索或上传操作的用户）、WAU（7 日内有操作的用户）、MAU（30 日内有操作的用户）
- 留存率计算：基于用户首次使用时间和后续使用记录
- 数据来源：UserActivity 表或从 AuditLog 表聚合计算
- 报表导出：支持 CSV、PDF 格式，包含图表和数据表格

---

### Story 7.4: 数据源使用情况报表

As a **管理员**,
I want **查看数据源使用情况报表**,
So that **可以了解各数据源的使用频率和价值**.

**Acceptance Criteria:**

**Given** 管理员已登录
**When** 管理员访问数据源使用情况报表页面
**Then** 系统显示各数据源的检索次数（飞书/GitLab/数据库的检索占比）
**And** 系统显示各数据源的命中率（哪个数据源最常被命中）
**And** 系统显示数据源的数据量统计（文档数、代码文件数、数据量变化趋势）
**And** 系统显示数据源同步情况（同步次数、成功率、平均耗时）
**And** 系统显示数据源健康度（连接状态、错误率、最后同步时间）
**And** 系统支持导出数据源使用情况报表（CSV、PDF 格式）

**Prerequisites:** Story 7.1, Story 2.6

**Technical Notes:**
- 数据源报表页面：/admin/reports/data-sources 路由
- 数据来源：SearchHistory 表（检索统计）、DataSource 表（数据源信息）、SyncHistory 表（同步历史）
- 使用情况分析：统计每个数据源被检索的次数和命中率
- 健康度评估：基于连接状态、同步成功率、错误率计算健康度分数
- 报表导出：包含数据源列表、使用统计、健康度评估等内容

---

### Story 7.5: 业务流程完成时间统计

As a **管理员**,
I want **查看业务流程完成时间统计**,
So that **可以向管理层证明系统价值**.

**Acceptance Criteria:**

**Given** 系统已记录用户操作时间
**When** 管理员查看业务流程完成时间报表
**Then** 系统统计典型需求从提出到初版代码交付的周期
**And** 系统对比使用系统前后的流程时间（如有历史数据）
**And** 系统显示代码生成一次命中率（首次检索满足需求的比例）
**And** 系统显示多轮问答最终解决率（3 轮内解决问题的比例）
**And** 系统显示流程时间缩短比例（目标：缩短 40% 以上）
**And** 系统支持导出业务流程时间报表（CSV、PDF 格式）

**Prerequisites:** Story 7.1, Story 4.6

**Technical Notes:**
- 业务流程统计页面：/admin/reports/business-process 路由
- 数据来源：从差异分析记录、检索历史、反馈记录中提取流程时间数据
- 流程时间计算：需求提出时间（差异分析请求时间）到代码交付时间（待办完成时间）
- 命中率计算：首次检索结果被采纳的比例
- 解决率计算：3 轮检索内用户标记"已解决"的比例
- 对比分析：如有历史数据，展示使用系统前后的对比

---

### Story 7.6: 报表导出与分享

As a **管理员**,
I want **导出报表并分享给管理层**,
So that **可以定期汇报系统使用情况和价值**.

**Acceptance Criteria:**

**Given** 报表数据已生成
**When** 管理员导出报表
**Then** 系统支持导出 CSV 格式（用于数据分析）
**And** 系统支持导出 PDF 格式（用于汇报展示）
**And** 系统支持导出 Excel 格式（用于进一步处理）
**And** 导出的报表包含图表、数据表格、摘要说明
**And** 系统支持自定义报表内容（选择要包含的指标和图表）
**And** 系统支持定时生成报表（如每周自动生成周报）

**Prerequisites:** Story 7.2, Story 7.3, Story 7.4, Story 7.5

**Technical Notes:**
- 报表导出功能：使用库生成不同格式文件（csv-writer、pdfkit、exceljs）
- 报表模板：设计统一的报表模板，包含 Logo、标题、图表、数据表格、页脚
- 自定义报表：允许用户选择要包含的指标、时间范围、图表类型
- 定时报表：使用定时任务（cron）自动生成报表，发送邮件或保存到指定位置
- 报表存储：导出的报表可保存到文件系统或对象存储，支持下载链接分享

---

## Epic Breakdown Summary

### 总体概览

本 Epic 分解将 PRD 中的 17 个功能需求分解为 **7 个 Epic、42 个 Story**，每个 Story 都是可独立实现的小功能单元。

### Epic 执行顺序建议

1. **Epic 1: 项目基础架构**（7 个 Story）- 必须首先完成，为所有功能提供基础
2. **Epic 2: 数据源集成与同步**（6 个 Story）- 建立数据基础
3. **Epic 3: 核心检索能力**（6 个 Story）- 实现核心价值
4. **Epic 6: 权限与审核体系**（6 个 Story）- 可与 Epic 3 并行开发
5. **Epic 4: 差异分析与代码建议**（6 个 Story）- 依赖 Epic 3，实现"魔力时刻"
6. **Epic 5: 内容共建平台**（6 个 Story）- 依赖 Epic 6，实现内容共建
7. **Epic 7: 监控与报表**（6 个 Story）- 最后完成，依赖其他 Epic 的数据

### Story 特点

- **垂直切片**：每个 Story 都包含完整的功能实现（前端+后端+数据库）
- **独立价值**：每个 Story 完成后都能提供可用的功能
- **清晰依赖**：Story 之间的依赖关系明确，无循环依赖
- **可测试性**：每个 Story 都有明确的验收标准，便于测试验证
- **适合单会话开发**：每个 Story 的规模适合一个开发会话完成

### 下一步行动

1. **架构设计**：运行 `workflow create-architecture` 进行技术架构设计
2. **Story 实现**：使用 `workflow create-story` 为每个 Story 生成详细的实现计划
3. **Sprint 规划**：使用 `workflow sprint-planning` 规划开发迭代

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

