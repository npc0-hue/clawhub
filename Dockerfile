# 多阶段构建 - 构建阶段
FROM oven/bun:1 AS builder

WORKDIR /app

# 复制 package.json 和 bun.lockb
COPY package.json bun.lockb ./

# 安装依赖
RUN bun install --frozen-lockfile --production=false

# 复制源代码
COPY . .

# 生成 Convex 类型（如果需要）
RUN bunx convex codegen || true

# 构建应用（前端 + Nitro 服务器）
ENV NODE_ENV=production
RUN bun run build

# 生产阶段
FROM oven/bun:1-slim AS runner

WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
ENV BUN_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

# 复制构建产物
COPY --from=builder --chown=appuser:appgroup /app/build ./build
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# 切换到非 root 用户
USER appuser

# 暴露端口（Nitro 默认 3000）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun --bun node_modules/.bin/nitro healthcheck || exit 1

# 启动应用
CMD ["bun", "--bun", "node_modules/.bin/nitro", "start"]
