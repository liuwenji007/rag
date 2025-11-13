# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY code-rag-api/package*.json ./
COPY code-rag-api/prisma ./prisma/

# 安装依赖（包括 devDependencies，用于构建）
RUN npm ci

# 复制源代码
COPY code-rag-api/ .

# 生成 Prisma Client
RUN npx prisma generate

# 构建应用
RUN npm run build

# 多阶段构建 - 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# 复制 package 文件
COPY code-rag-api/package*.json ./
COPY code-rag-api/prisma ./prisma/

# 仅安装生产依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# 生成 Prisma Client（生产环境）
RUN npx prisma generate

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "dist/main.js"]
