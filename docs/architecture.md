# code-rag - Architecture

**Author:** commander
**Date:** 2025-11-11
**Version:** 1.0

---

## Executive Summary

code-rag 采用 NestJS + React + TypeScript 全栈架构，API 优先设计，支持向量检索、多数据源同步和智能差异分析。系统部署在阿里云服务器，采用容器化部署，目标支持 200 并发用户和 1000+ 文档的检索能力。

---

## Project Initialization

### 后端 API 服务初始化

```bash
npx @nestjs/cli new code-rag-api --package-manager npm --skip-git
```

**启动模板提供的决策：**
- ✅ TypeScript 支持
- ✅ 模块化架构
- ✅ 依赖注入
- ✅ 基础项目结构

### 前端 Web 控制台初始化

```bash
npm create vite@latest code-rag-web -- --template react-ts
```

**启动模板提供的决策：**
- ✅ TypeScript 支持
- ✅ React 框架
- ✅ Vite 构建工具
- ✅ 快速热更新

---

## Decision Summary

| Category | Decision | Version | Affects Epics | Rationale | Provided by Starter |
| -------- | -------- | ------- | ------------- | --------- | ------------------- |
| Backend Framework | NestJS | TBD | All | 企业级 API 框架，模块化清晰 | ✅ |
| Frontend Framework | React + TypeScript | TBD | Epic 1, 5, 6, 7 | 轻量高效，生态成熟 | ✅ |
| Build Tool | Vite | TBD | Epic 1 | 快速构建，开发体验好 | ✅ |
| Language | TypeScript | TBD | All | 类型安全，统一技术栈 | ✅ |
| Database | PostgreSQL | 18 | All | JSON 支持好，扩展性强，适合企业级应用 | ❌ |
| ORM | Prisma | TBD | Epic 1, 2, 5, 6 | 类型安全，迁移管理完善，开发体验好 | ❌ |
| Vector Database | Milvus | TBD | Epic 2, 3 | 开源可自部署，性能好，适合企业内网 | ❌ |
| Vector Retrieval Framework | LangChain.js | TBD | Epic 2, 3, 4 | RAG 工具链完整，支持多种嵌入模型，便于扩展 | ❌ |
| Authentication | JWT + Password (临时) | TBD | Epic 6 | MVP 阶段先实现基础用户管理，SSO 后续手动接入 | ❌ |
| File Storage | Local Filesystem (MVP) → OSS (Production) | TBD | Epic 5 | MVP 阶段本地存储，生产环境迁移到阿里云 OSS | ❌ |
| Task Queue | BullMQ | TBD | Epic 2 | 基于 Redis，支持任务调度、重试、监控，适合数据同步任务 | ❌ |
| Cache | Redis | TBD | Epic 3, 7 | 与 BullMQ 共用，性能好，支持分布式缓存 | ❌ |
| Logging | Pino | TBD | All | 高性能结构化日志，适合高并发场景 | ❌ |
| Date/Time | date-fns/dayjs | TBD | All | UTC 存储，ISO 8601 格式，支持时区转换 | ❌ |

---

## Cross-Cutting Concerns

### Error Handling Strategy

**统一错误响应格式：**

```typescript
// 成功响应
{
  code: 200,
  message: "success",
  data: { ... }
}

// 错误响应
{
  code: 400, // HTTP 状态码
  message: "错误描述",
  error: "ERROR_CODE", // 错误代码
  details?: { ... } // 可选详细信息
}
```

**错误分类：**
- 4xx：客户端错误（参数错误、权限不足、资源不存在等）
- 5xx：服务器错误（内部错误、数据库错误、外部服务错误等）

### Logging Approach

**使用 Pino 进行结构化日志：**
- 日志级别：error, warn, info, debug
- 格式：JSON 结构化日志
- 输出：开发环境控制台，生产环境文件
- 包含字段：timestamp, level, message, context, userId, requestId

### API Response Format

**统一响应格式：**
- 所有 API 返回 `{ code, message, data }` 格式
- HTTP 状态码：200（成功）、4xx（客户端错误）、5xx（服务器错误）
- 业务错误码：通过 `error` 字段标识具体错误类型

### Date/Time Handling

**日期时间处理：**
- 存储：UTC 时间，ISO 8601 格式（如：2025-11-11T10:30:00Z）
- 显示：根据用户时区或系统时区转换
- 库：date-fns 或 dayjs（推荐 dayjs，更轻量）
- 时区：默认使用系统时区，后续可支持用户时区设置

---

## Project Structure

```
code-rag/
├── code-rag-api/              # 后端 API 服务
│   ├── src/
│   │   ├── main.ts            # 应用入口
│   │   ├── app.module.ts      # 根模块
│   │   ├── common/            # 公共模块
│   │   │   ├── decorators/    # 装饰器
│   │   │   ├── filters/       # 异常过滤器
│   │   │   ├── guards/        # 守卫（认证、权限）
│   │   │   ├── interceptors/  # 拦截器（日志、响应格式化）
│   │   │   └── pipes/         # 管道（验证、转换）
│   │   ├── config/            # 配置文件
│   │   ├── database/          # 数据库配置
│   │   │   └── prisma/        # Prisma schema 和 migrations
│   │   ├── modules/           # 业务模块
│   │   │   ├── auth/          # 认证模块（Epic 6）
│   │   │   ├── users/         # 用户管理（Epic 6）
│   │   │   ├── datasources/   # 数据源管理（Epic 2）
│   │   │   ├── sync/          # 数据同步（Epic 2）
│   │   │   ├── search/        # 检索服务（Epic 3）
│   │   │   ├── documents/     # 文档管理（Epic 5）
│   │   │   ├── diff/          # 差异分析（Epic 4）
│   │   │   ├── feedback/      # 反馈管理（Epic 6）
│   │   │   └── reports/       # 报表统计（Epic 7）
│   │   ├── services/          # 共享服务
│   │   │   ├── vector/        # 向量检索服务（Milvus + LangChain）
│   │   │   ├── embedding/     # 嵌入模型服务
│   │   │   ├── cache/         # 缓存服务（Redis）
│   │   │   └── queue/         # 任务队列（BullMQ）
│   │   └── utils/             # 工具函数
│   ├── test/                  # 测试文件
│   ├── prisma/                # Prisma 配置
│   │   └── schema.prisma      # 数据模型定义
│   ├── .env.example           # 环境变量示例
│   ├── package.json
│   └── tsconfig.json
│
├── code-rag-web/              # 前端 Web 控制台
│   ├── src/
│   │   ├── main.tsx           # 应用入口
│   │   ├── App.tsx            # 根组件
│   │   ├── assets/            # 静态资源
│   │   ├── components/        # 公共组件
│   │   ├── pages/             # 页面组件
│   │   │   ├── dashboard/     # 数据看板（Epic 7）
│   │   │   ├── search/        # 检索页面（Epic 3）
│   │   │   ├── documents/     # 文档管理（Epic 5）
│   │   │   ├── datasources/   # 数据源管理（Epic 2）
│   │   │   ├── users/         # 用户管理（Epic 6）
│   │   │   └── reports/       # 报表页面（Epic 7）
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── services/          # API 服务
│   │   ├── store/             # 状态管理（可选）
│   │   ├── utils/             # 工具函数
│   │   └── types/             # TypeScript 类型定义
│   ├── public/                # 公共文件
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                      # 项目文档
│   ├── PRD.md                 # 产品需求文档
│   ├── epics.md               # Epic 分解
│   ├── architecture.md        # 架构文档（本文件）
│   └── technical/             # 技术文档
│
├── docker/                    # Docker 配置
│   ├── Dockerfile.api         # API 服务 Dockerfile
│   ├── Dockerfile.web         # Web 控制台 Dockerfile
│   └── docker-compose.yml     # 本地开发环境
│
├── .github/                   # GitHub 配置
│   └── workflows/             # CI/CD 工作流
│
├── .gitignore
└── README.md
```

---

## Epic to Architecture Mapping

| Epic | 主要模块/目录 | 技术组件 |
|------|--------------|---------|
| Epic 1: 项目基础架构 | `code-rag-api/`, `code-rag-web/`, `docker/` | NestJS, React, Vite, Docker |
| Epic 2: 数据源集成与同步 | `modules/datasources/`, `modules/sync/`, `services/queue/` | Prisma, BullMQ, Redis |
| Epic 3: 核心检索能力 | `modules/search/`, `services/vector/`, `services/embedding/` | LangChain.js, Milvus |
| Epic 4: 差异分析与代码建议 | `modules/diff/` | LangChain.js, LLM API |
| Epic 5: 内容共建平台 | `modules/documents/`, `pages/documents/` | Prisma, 文件系统/OSS |
| Epic 6: 权限与审核体系 | `modules/auth/`, `modules/users/`, `modules/feedback/` | JWT, Prisma |
| Epic 7: 监控与报表 | `modules/reports/`, `pages/dashboard/`, `pages/reports/` | Prisma, 图表库 |

---

## Implementation Patterns

这些模式确保所有 AI 代理实现一致的代码风格和结构。

### Naming Conventions

**API 路由：**
- RESTful 风格，使用复数形式：`/api/v1/users`, `/api/v1/documents`
- 使用 kebab-case：`/api/v1/data-sources`
- 版本号在路径中：`/api/v1/...`

**数据库表名：**
- 使用复数形式，snake_case：`users`, `data_sources`, `search_history`
- Prisma model 使用 PascalCase：`User`, `DataSource`, `SearchHistory`

**变量和函数：**
- TypeScript/JavaScript：camelCase
- 常量：UPPER_SNAKE_CASE
- 类名：PascalCase

**文件命名：**
- 组件文件：PascalCase（`UserCard.tsx`）
- 工具文件：camelCase（`formatDate.ts`）
- 配置文件：kebab-case（`docker-compose.yml`）

### Structure Patterns

**模块组织：**
- 按功能模块组织（feature-based），而非按类型（type-based）
- 每个模块包含：controller, service, dto, entity, module
- 共享代码放在 `common/` 目录

**测试文件位置：**
- 单元测试：与源文件同目录，`*.spec.ts`
- E2E 测试：`test/` 目录

**配置文件：**
- 环境变量：`.env`（不提交），`.env.example`（提交）
- 配置文件：`config/` 目录

### Format Patterns

**API 响应格式：**
```typescript
// 成功响应
{
  code: 200,
  message: "success",
  data: { ... }
}

// 错误响应
{
  code: 400,
  message: "错误描述",
  error: "ERROR_CODE",
  details?: { ... }
}
```

**日期格式：**
- API 请求/响应：ISO 8601 字符串（`2025-11-11T10:30:00Z`）
- 数据库存储：UTC 时间戳或 ISO 字符串

**错误代码：**
- 格式：`MODULE_ERROR_TYPE`（如：`USER_NOT_FOUND`, `DATASOURCE_SYNC_FAILED`）
- 统一在 `common/errors/` 中定义

### Communication Patterns

**模块间通信：**
- 使用 NestJS 依赖注入
- 服务间通过 Service 类调用，避免直接访问数据库
- 异步任务使用 BullMQ 队列

**前后端通信：**
- RESTful API
- 使用 Axios 或 Fetch API
- 统一错误处理拦截器

### Lifecycle Patterns

**数据同步任务：**
- 使用 BullMQ 队列处理
- 支持重试机制（最多 3 次）
- 失败后记录错误日志

**检索请求：**
- 同步处理，超时时间 5 秒
- 使用 Redis 缓存热门查询结果
- 记录检索历史

**文档上传：**
- 异步处理：上传 → 解析 → 向量化 → 入库
- 使用 BullMQ 队列处理解析和向量化

### Location Patterns

**API 路由结构：**
```
/api/v1/
  ├── auth/          # 认证相关
  ├── users/         # 用户管理
  ├── datasources/   # 数据源管理
  ├── search/        # 检索接口
  ├── documents/     # 文档管理
  ├── diff/          # 差异分析
  └── reports/       # 报表统计
```

**静态资源：**
- 前端：`code-rag-web/public/`
- 上传文件：`code-rag-api/uploads/`（MVP），后续迁移到 OSS

**配置文件：**
- 环境变量：项目根目录 `.env`
- 应用配置：`code-rag-api/src/config/`

### Consistency Patterns

**日志格式：**
```json
{
  "timestamp": "2025-11-11T10:30:00Z",
  "level": "info",
  "message": "User logged in",
  "context": "AuthService",
  "userId": "123",
  "requestId": "req-abc-123"
}
```

**日期显示：**
- 列表页：相对时间（如：2 小时前）
- 详情页：完整时间（如：2025-11-11 10:30:00）
- 使用 dayjs 格式化

**用户错误提示：**
- 友好、可操作的错误信息
- 避免暴露技术细节
- 提供解决建议（如：请检查网络连接）

---

## Novel Pattern Designs

基于 PRD 中的创新点，以下是需要特别设计的架构模式：

### 1. 多角色视角检索逻辑

**问题：** 不同角色（开发、产品、UI）需要看到不同维度的检索结果。

**架构设计：**
- 在检索服务中实现角色权重策略（Role-based Weighting Strategy）
- 为每个角色定义检索偏好配置（检索权重、结果排序规则）
- 检索时根据用户角色动态调整向量相似度计算和结果排序

**组件：**
- `SearchService`：核心检索逻辑
- `RoleWeightStrategy`：角色权重策略
- `SearchResultRanker`：结果排序器

**实现位置：** `modules/search/services/role-weight-strategy.ts`

### 2. 需求与代码自动对齐算法

**问题：** 将需求片段与历史代码自动匹配，给出实现建议。

**架构设计：**
- 使用 LangChain 的 RAG 链实现需求理解 → 代码检索 → 差异分析
- 需求向量化：将需求描述转换为向量
- 代码片段检索：在 Milvus 中检索相似代码
- 差异分析：使用 LLM 分析需求与代码的差异，生成修改建议

**组件：**
- `RequirementAnalyzer`：需求分析服务
- `CodeMatcher`：代码匹配服务
- `DiffGenerator`：差异生成服务

**实现位置：** `modules/diff/services/`

### 3. 置信度计算与疑似结果处理

**问题：** 当检索结果不可信时，返回"疑似"状态而非错误信息。

**架构设计：**
- 置信度计算：基于向量相似度、元数据匹配度、历史采纳率
- 阈值策略：定义置信度阈值（如：>0.8 为可信，0.5-0.8 为疑似，<0.5 为未命中）
- 疑似结果处理：限制返回数量（最多 3 条），明确标注状态

**组件：**
- `ConfidenceCalculator`：置信度计算器
- `ResultFilter`：结果过滤器
- `SuspectedResultHandler`：疑似结果处理器

**实现位置：** `modules/search/services/confidence-calculator.ts`

### 4. 低学习成本的知识共建

**问题：** 让非技术用户（产品、UI）能够参与知识库维护。

**架构设计：**
- 提供简单的上传界面（拖拽上传、批量上传）
- 自动文档解析和元信息提取
- 可视化审核流程（待审核 → 审核中 → 已发布）
- 支持在线编辑和版本管理

**组件：**
- `DocumentUploadService`：文档上传服务
- `DocumentParser`：文档解析器
- `ReviewWorkflow`：审核工作流

**实现位置：** `modules/documents/services/`

---

