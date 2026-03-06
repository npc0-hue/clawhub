# 多阶段构建 - 构建阶段
FROM oven/bun:1 AS builder

WORKDIR /app

# 复制所有源代码（工作区需要完整目录结构）
COPY . .

# 安装依赖（包括 devDependencies，用于构建）
RUN bun install --frozen-lockfile

# 构建应用（前端 + Nitro 服务器）
# 注意：convex/_generated 文件需要在本地运行 `bunx convex codegen` 生成
ENV NODE_ENV=production
RUN bun run build

# 生产阶段
FROM oven/bun:1-slim AS runner

WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
ENV BUN_ENV=production

# 复制完整的构建产物（TanStack Start + Nitro 输出到 .output）
# .output 包含 server/ 和 public/ 目录
COPY --from=builder /app/.output ./

# 复制 package.json（用于可能的依赖解析）
COPY --from=builder /app/package.json ./

# 暴露端口（Nitro 默认 3000）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --bun server/healthcheck.mjs || exit 1

# 启动应用（Nitro server）
CMD ["bun", "--bun", "server/index.mjs"]
