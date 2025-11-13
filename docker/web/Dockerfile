# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY code-rag-web/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY code-rag-web/ .

# 构建应用
RUN npm run build

# 多阶段构建 - 运行阶段
FROM nginx:alpine AS runner

# 复制构建产物到 Nginx 静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置文件
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Nginx 默认启动命令
CMD ["nginx", "-g", "daemon off;"]
