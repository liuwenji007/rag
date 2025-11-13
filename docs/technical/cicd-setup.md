# CI/CD 配置说明

本文档说明如何配置 CI/CD 流水线所需的 Secrets 和环境变量。

## 概述

项目使用 GitHub Actions 作为 CI/CD 平台，支持以下功能：

- **代码检查**：自动运行 lint 和 TypeScript 类型检查
- **构建**：自动构建 Docker 镜像
- **部署**：手动触发部署到阿里云服务器

## GitHub Actions 工作流

工作流文件位于：`.github/workflows/ci.yml`

### 触发条件

- **代码检查**：在 push 和 pull_request 时自动触发
- **构建**：在 push 到 main/master/develop 分支时触发
- **部署**：手动触发（workflow_dispatch），仅限 main/master 分支

### 工作流步骤

1. **Lint and Type Check**：并行检查 API 和 Web 项目的代码质量和类型
2. **Build Docker Images**：构建 API 和 Web 的 Docker 镜像
3. **Deploy to Aliyun Server**：部署到阿里云服务器（手动触发）

## Secrets 配置

在 GitHub 仓库中配置以下 Secrets：

### 必需 Secrets

#### SSH 相关

- **`SSH_HOST`**：阿里云服务器地址（IP 或域名）
  - 示例：`123.456.789.0` 或 `example.com`

- **`SSH_USER`**：SSH 用户名
  - 示例：`root` 或 `ubuntu`

- **`SSH_PRIVATE_KEY`**：SSH 私钥
  - 生成 SSH 密钥对：
    ```bash
    ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
    ```
  - 将公钥添加到服务器：
    ```bash
    ssh-copy-id -i ~/.ssh/id_rsa.pub user@server
    ```
  - 将私钥内容复制到 GitHub Secrets（包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`）

### 可选 Secrets

#### 部署路径

- **`DEPLOY_PATH`**：服务器上的项目部署路径（默认：`/opt/code-rag`）
  - 示例：`/opt/code-rag` 或 `/home/user/code-rag`

#### 部署 URL

- **`DEPLOY_URL`**：部署后的访问 URL（用于 GitHub Actions 环境显示）
  - 示例：`http://example.com` 或 `http://123.456.789.0`

#### Docker 镜像仓库（可选）

如果使用 Docker 镜像仓库（如 GitHub Container Registry、Docker Hub、阿里云容器镜像服务），需要配置：

- **`DOCKER_REGISTRY`**：Docker 镜像仓库地址
  - GitHub Container Registry：`ghcr.io`
  - Docker Hub：`docker.io`
  - 阿里云容器镜像服务：`registry.cn-hangzhou.aliyuncs.com`

- **`DOCKER_USERNAME`**：Docker 仓库用户名

- **`DOCKER_PASSWORD`**：Docker 仓库密码或访问令牌

## 配置步骤

### 1. 配置 GitHub Secrets

1. 进入 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加上述 Secrets

### 2. 配置服务器环境

在阿里云服务器上执行以下操作：

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 创建部署目录
sudo mkdir -p /opt/code-rag
sudo chown $USER:$USER /opt/code-rag
```

### 3. 配置 SSH 密钥

在本地生成 SSH 密钥对并添加到服务器：

```bash
# 生成密钥对
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub user@server

# 测试连接
ssh user@server
```

### 4. 配置环境变量文件

在服务器上创建 `.env` 文件：

```bash
cd /opt/code-rag
cp docker/.env.example docker/.env
nano docker/.env
```

根据实际情况修改环境变量：

```env
# PostgreSQL 配置
POSTGRES_USER=code_rag_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=code_rag
POSTGRES_PORT=5432

# API 服务配置
API_PORT=3000
CORS_ORIGIN=http://your-domain.com

# Web 控制台配置
WEB_PORT=80
VITE_API_BASE_URL=http://your-domain.com:3000
```

## 使用工作流

### 手动触发部署

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **CI/CD Pipeline** 工作流
4. 点击 **Run workflow**
5. 选择分支（main 或 master）
6. 点击 **Run workflow** 按钮

### 查看工作流状态

1. 进入 **Actions** 标签
2. 查看工作流运行历史
3. 点击具体运行查看详细日志

### 查看部署日志

在服务器上查看部署日志：

```bash
# 查看容器日志
docker-compose -f /opt/code-rag/docker/docker-compose.yml logs -f

# 查看特定服务日志
docker-compose -f /opt/code-rag/docker/docker-compose.yml logs -f api
docker-compose -f /opt/code-rag/docker/docker-compose.yml logs -f web
```

## 故障排查

### SSH 连接失败

- 检查 `SSH_HOST` 和 `SSH_USER` 是否正确
- 检查 `SSH_PRIVATE_KEY` 格式是否正确（包含完整的密钥内容）
- 检查服务器防火墙是否允许 SSH 连接
- 检查服务器上的 `~/.ssh/authorized_keys` 文件权限（应为 600）

### 部署失败

- 检查服务器上是否安装了 Docker 和 Docker Compose
- 检查部署路径是否存在且有写权限
- 检查 `docker/.env` 文件是否配置正确
- 查看 GitHub Actions 日志了解具体错误信息

### 健康检查失败

- 检查服务是否正常启动：`docker-compose ps`
- 查看服务日志：`docker-compose logs api` 或 `docker-compose logs web`
- 检查端口是否被占用：`netstat -tulpn | grep :3000`
- 检查防火墙是否允许端口访问

## 安全建议

1. **使用强密码**：为 PostgreSQL 和其他服务使用强密码
2. **限制 SSH 访问**：配置防火墙只允许特定 IP 访问 SSH
3. **定期更新**：定期更新服务器系统和 Docker 镜像
4. **备份数据**：定期备份 PostgreSQL 数据
5. **监控日志**：定期检查应用和系统日志
6. **使用 HTTPS**：生产环境建议配置 HTTPS（使用 Nginx 反向代理和 SSL 证书）

## 后续扩展

可以考虑添加以下功能：

- 自动化测试覆盖率检查
- 代码质量门禁（SonarQube、CodeClimate 等）
- 自动回滚机制
- 多环境部署（开发、测试、生产）
- 蓝绿部署或金丝雀部署
- 监控和告警集成

