# code-rag

企业内网的代码增强型知识库，聚焦"5 秒内提供可靠业务代码参考"。

## 项目简介

code-rag 作为企业内网的代码增强型知识库，持续聚焦"5 秒内提供可靠业务代码参考"这一核心愿景。当前目标是面向企业业务工程团队，统一飞书 PRD、GitLab 代码、数据库上下文三类关键资产，让业务 agent 能在一次查询中就获得可追溯、可验证的实现建议。

### 核心特性

当业务工程师提出新需求或改动诉求时，code-rag 会即时返回"差异视角"的答案：不仅指出需要新增或修改的功能，还给出与之对应的高质量代码实现示例，并附上 PRD 原文与历史代码引用。用户在同一个界面中即可看到"改什么、为何改、怎么改"。

## 技术栈

### 后端
- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: PostgreSQL 18
- **ORM**: Prisma
- **日志**: Pino
- **任务队列**: BullMQ
- **缓存**: Redis

### 前端
- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **路由**: React Router
- **HTTP 客户端**: Axios
- **日期处理**: dayjs

### 基础设施
- **容器化**: Docker
- **CI/CD**: GitHub Actions / GitLab CI
- **向量数据库**: Milvus
- **向量检索**: LangChain.js

## 项目结构

```
code-rag/
├── code-rag-api/              # 后端 API 服务
│   ├── src/                   # 源代码
│   ├── test/                  # 测试文件
│   └── prisma/                # Prisma 配置
├── code-rag-web/              # 前端 Web 控制台
│   ├── src/                   # 源代码
│   └── public/                # 静态资源
├── docs/                      # 项目文档
│   ├── PRD.md                 # 产品需求文档
│   ├── epics.md               # Epic 分解
│   ├── architecture.md        # 架构文档
│   └── technical/             # 技术文档
├── docker/                    # Docker 配置
│   ├── Dockerfile.api         # API 服务 Dockerfile
│   ├── Dockerfile.web         # Web 控制台 Dockerfile
│   └── docker-compose.yml     # 本地开发环境
└── .github/                   # GitHub 配置
    └── workflows/             # CI/CD 工作流
```

## 快速开始

### 前置要求

- Node.js >= 18.0.0 (LTS)
- npm >= 9.0.0
- Docker >= 20.0.0 (可选，用于本地开发)
- PostgreSQL 18 (可选，用于本地开发)

### 安装依赖

```bash
# 后端
cd code-rag-api
npm install

# 前端
cd ../code-rag-web
npm install
```

### 启动开发环境

```bash
# 后端（在 code-rag-api 目录）
npm run start:dev

# 前端（在 code-rag-web 目录）
npm run dev
```

### 环境变量配置

复制 `.env.example` 文件并配置必要的环境变量：

```bash
# 后端
cp code-rag-api/.env.example code-rag-api/.env

# 前端
cp code-rag-web/.env.example code-rag-web/.env
```

详细的环境变量配置说明请参考各子项目的文档。

## 开发规范

- 代码风格：遵循 ESLint 和 Prettier 配置
- 提交规范：使用语义化提交信息
- 测试要求：新功能需包含单元测试和集成测试
- 文档更新：重要变更需更新相关文档

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 相关文档

- [产品需求文档](./docs/PRD.md)
- [架构文档](./docs/architecture.md)
- [Epic 分解](./docs/epics.md)

## 许可证

内部项目，暂不对外开源。

---

**目标上线时间**: 2 个月内交付上线可用版本

