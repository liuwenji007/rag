# Docker 容器化部署

本目录包含项目的 Docker 容器化配置文件。

## 文件结构

```
docker/
├── api/
│   └── Dockerfile          # API 服务 Dockerfile（多阶段构建）
├── web/
│   ├── Dockerfile          # Web 控制台 Dockerfile（多阶段构建）
│   └── nginx.conf          # Nginx 配置文件
├── docker-compose.yml      # Docker Compose 编排文件
├── .env.example            # 环境变量示例文件
└── README.md               # 本文件
```

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 2. 启动所有服务

在项目根目录执行：

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 3. 查看服务状态

```bash
docker-compose -f docker/docker-compose.yml ps
```

### 4. 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker/docker-compose.yml logs -f

# 查看特定服务日志
docker-compose -f docker/docker-compose.yml logs -f api
docker-compose -f docker/docker-compose.yml logs -f web
docker-compose -f docker/docker-compose.yml logs -f postgres
```

### 5. 停止服务

```bash
docker-compose -f docker/docker-compose.yml down
```

### 6. 停止并删除数据卷

```bash
docker-compose -f docker/docker-compose.yml down -v
```

## 服务说明

### API 服务

- **端口**: 3000（可通过 `API_PORT` 环境变量配置）
- **健康检查**: `GET http://localhost:3000/health`
- **依赖**: PostgreSQL 数据库

### Web 控制台

- **端口**: 80（可通过 `WEB_PORT` 环境变量配置）
- **健康检查**: `GET http://localhost/health`
- **依赖**: API 服务

### PostgreSQL 数据库

- **端口**: 5432（可通过 `POSTGRES_PORT` 环境变量配置）
- **数据持久化**: 使用 Docker 卷 `postgres_data`
- **初始化**: 首次启动会自动创建数据库

## 构建镜像

### 单独构建 API 服务镜像

```bash
docker build -f docker/api/Dockerfile -t code-rag-api:latest ..
```

### 单独构建 Web 控制台镜像

```bash
docker build -f docker/web/Dockerfile -t code-rag-web:latest ..
```

## 环境变量

主要环境变量说明：

- `POSTGRES_USER`: PostgreSQL 用户名（默认: `code_rag_user`）
- `POSTGRES_PASSWORD`: PostgreSQL 密码（默认: `code_rag_password`）
- `POSTGRES_DB`: PostgreSQL 数据库名（默认: `code_rag`）
- `POSTGRES_PORT`: PostgreSQL 端口（默认: `5432`）
- `API_PORT`: API 服务端口（默认: `3000`）
- `WEB_PORT`: Web 控制台端口（默认: `80`）
- `CORS_ORIGIN`: CORS 允许的源（默认: `http://localhost:80`）
- `VITE_API_BASE_URL`: Web 控制台 API 基础 URL（默认: `http://localhost:3000`）

## 健康检查

所有服务都配置了健康检查：

- **API 服务**: 每 30 秒检查一次 `/health` 端点
- **Web 控制台**: 每 30 秒检查一次 Nginx 健康检查端点
- **PostgreSQL**: 每 10 秒检查一次数据库连接状态

## 数据持久化

PostgreSQL 数据存储在 Docker 卷 `postgres_data` 中，即使容器删除，数据也会保留。

删除数据卷：

```bash
docker volume rm docker_postgres_data
```

## 故障排查

### 查看容器日志

```bash
docker-compose -f docker/docker-compose.yml logs api
docker-compose -f docker/docker-compose.yml logs web
docker-compose -f docker/docker-compose.yml logs postgres
```

### 进入容器调试

```bash
# 进入 API 服务容器
docker exec -it code-rag-api sh

# 进入 Web 控制台容器
docker exec -it code-rag-web sh

# 进入 PostgreSQL 容器
docker exec -it code-rag-postgres psql -U code_rag_user -d code_rag
```

### 重新构建镜像

```bash
docker-compose -f docker/docker-compose.yml build --no-cache
docker-compose -f docker/docker-compose.yml up -d
```

## 生产环境部署

生产环境部署时，建议：

1. 修改默认密码和敏感配置
2. 使用 Docker Secrets 或外部密钥管理服务
3. 配置 HTTPS（在 Nginx 中配置 SSL 证书）
4. 配置日志收集和监控
5. 配置资源限制（CPU、内存）
6. 使用 Docker Swarm 或 Kubernetes 进行容器编排

