# 数据库设置指南

本文档介绍如何设置 PostgreSQL 数据库并配置 Prisma 连接。

## 前置要求

- PostgreSQL 18（或兼容版本）
- Node.js 20.19+ 或 22.12+
- 已安装 Prisma（已在项目中配置）

## 步骤 1: 安装 PostgreSQL

### macOS

使用 Homebrew 安装：

```bash
brew install postgresql@18
brew services start postgresql@18
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql-18 postgresql-contrib-18
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Docker（推荐用于开发环境）

```bash
docker run --name code-rag-postgres \
  -e POSTGRES_USER=code_rag_user \
  -e POSTGRES_PASSWORD=code_rag_password \
  -e POSTGRES_DB=code_rag \
  -p 5432:5432 \
  -d postgres:18
```

## 步骤 2: 创建数据库

### 方法 1: 使用 psql 命令行

```bash
# 连接到 PostgreSQL
psql -U postgres

# 在 PostgreSQL 中执行以下命令
CREATE DATABASE code_rag;
CREATE USER code_rag_user WITH PASSWORD 'code_rag_password';
GRANT ALL PRIVILEGES ON DATABASE code_rag TO code_rag_user;
\q
```

### 方法 2: 使用 Docker（如果使用 Docker）

数据库已在容器启动时自动创建。

## 步骤 3: 配置环境变量

### 创建 .env 文件

在 `code-rag-api/` 目录下创建 `.env` 文件：

```bash
cd code-rag-api
cp .env.example .env
```

### 编辑 .env 文件

根据你的数据库配置修改 `DATABASE_URL`：

```env
# 本地 PostgreSQL
DATABASE_URL="postgresql://code_rag_user:code_rag_password@localhost:5432/code_rag?schema=public&connection_limit=20"

# Docker PostgreSQL
DATABASE_URL="postgresql://code_rag_user:code_rag_password@localhost:5432/code_rag?schema=public&connection_limit=20"

# 远程 PostgreSQL（生产环境）
DATABASE_URL="postgresql://user:password@your-host:5432/code_rag?schema=public&connection_limit=20&sslmode=require"
```

**连接字符串格式说明：**
- `postgresql://` - 协议
- `user:password` - 数据库用户名和密码
- `@host:port` - 数据库主机和端口（默认 5432）
- `database_name` - 数据库名称
- `?schema=public` - 数据库 schema
- `&connection_limit=20` - 连接池大小（支持约 200 并发用户）

## 步骤 4: 验证数据库连接

### 测试连接

```bash
cd code-rag-api
npx prisma db pull
```

如果连接成功，Prisma 会显示数据库结构。

### 使用 psql 测试

```bash
psql -U code_rag_user -d code_rag -h localhost
```

## 步骤 5: 执行数据库迁移

### 创建初始迁移

```bash
cd code-rag-api
npx prisma migrate dev --name init
```

这个命令会：
1. 创建迁移文件到 `prisma/migrations/` 目录
2. 执行迁移到数据库
3. 重新生成 Prisma Client

### 查看迁移状态

```bash
npx prisma migrate status
```

### 应用迁移（生产环境）

```bash
npx prisma migrate deploy
```

## 步骤 6: 生成 Prisma Client

如果迁移后 Client 未自动生成，手动生成：

```bash
npx prisma generate
```

## 步骤 7: 验证设置

### 测试数据库连接（在代码中）

创建一个简单的测试脚本 `test-db.ts`：

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    const userCount = await prisma.user.count();
    console.log(`📊 当前用户数量: ${userCount}`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

运行测试：

```bash
npx ts-node test-db.ts
```

### 使用 Prisma Studio 查看数据

```bash
npx prisma studio
```

这会打开一个 Web 界面（默认 http://localhost:5555），可以查看和编辑数据库数据。

## 常见问题

### 1. 连接被拒绝

**错误：** `Error: P1001: Can't reach database server`

**解决方案：**
- 检查 PostgreSQL 服务是否运行：`brew services list` (macOS) 或 `sudo systemctl status postgresql` (Linux)
- 检查端口是否正确（默认 5432）
- 检查防火墙设置

### 2. 认证失败

**错误：** `Error: P1000: Authentication failed`

**解决方案：**
- 检查用户名和密码是否正确
- 检查 PostgreSQL 的 `pg_hba.conf` 配置
- 确保用户有访问数据库的权限

### 3. 数据库不存在

**错误：** `Error: P1003: Database does not exist`

**解决方案：**
- 使用 `psql` 创建数据库（见步骤 2）
- 检查 `DATABASE_URL` 中的数据库名称是否正确

### 4. 迁移失败

**错误：** `Error: Migration failed`

**解决方案：**
- 检查数据库连接是否正常
- 检查是否有未完成的迁移：`npx prisma migrate status`
- 如果是开发环境，可以重置数据库：`npx prisma migrate reset`（⚠️ 会删除所有数据）

## 生产环境注意事项

1. **使用环境变量管理敏感信息**
   - 不要在代码中硬编码数据库密码
   - 使用环境变量或密钥管理服务

2. **连接池配置**
   - 根据实际并发需求调整 `connection_limit`
   - 监控数据库连接数

3. **SSL 连接**
   - 生产环境建议启用 SSL：`?sslmode=require`

4. **备份策略**
   - 定期备份数据库
   - 测试恢复流程

5. **迁移策略**
   - 使用 `prisma migrate deploy` 在生产环境应用迁移
   - 在应用迁移前备份数据库

## 下一步

数据库设置完成后，可以：

1. 开始使用 Prisma Client 进行数据库操作
2. 创建用户和角色数据
3. 继续开发其他功能模块

## 参考资源

- [Prisma 文档](https://www.prisma.io/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Prisma 迁移指南](https://www.prisma.io/docs/concepts/components/prisma-migrate)

