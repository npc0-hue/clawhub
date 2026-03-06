# 调试 multipart/form-data 上传问题

## 问题症状

```bash
clawhub publish ./canvas-design --slug canvas-design --name "画布设计" --version 0.0.1
✖ {"error":"Only HTML requests are supported here"}
Error: {"error":"Only HTML requests are supported here"}
```

## 可能原因

1. **Convex HTTP Router 限制**
   - Convex 的 `httpRouter` 可能对 Content-Type 有特定要求
   - multipart/form-data 可能需要特殊处理

2. **本地 Convex Dev 服务器问题**
   - 如果你在运行 `bunx convex dev`，可能是本地服务器配置问题
   - 本地服务器可能对 multipart 支持不完整

3. **Curl 在 Bun 环境下的问题**
   - CLI 使用 curl 发送 multipart 请求
   - Bun 的 child_process 可能有兼容性问题

## 诊断步骤

### 1. 检查当前 Convex 部署

```bash
# 查看当前使用的 Convex URL
bunx convex deployment-url

# 检查是否在运行本地 dev 服务器
bunx convex dev --once
```

### 2. 测试 API 端点

```bash
# 手动测试 publish 端点
curl -X POST https://YOUR-DEPLOYMENT.convex.cloud/api/v1/skills \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "payload={\"slug\":\"test\",\"displayName\":\"Test\",\"version\":\"1.0.0\"}" \
  -F "files=@SKILL.md"
```

### 3. 检查 Convex 日志

```bash
bunx convex logs
```

## 解决方案

### 方案 A：使用云端部署（推荐）

确保你使用的是 Convex Cloud 部署，而不是本地 dev 服务器：

```bash
# 1. 登录 Convex
bunx convex login

# 2. 部署到云端
bunx convex deploy

# 3. 获取部署 URL
bunx convex deployment-url

# 4. 更新 .env.local 中的 VITE_CONVEX_URL
```

### 方案 B：修复本地开发环境

如果你在本地开发，确保正确配置：

```bash
# 1. 启动 Convex dev 服务器
bunx convex dev

# 2. 在另一个终端启动前端
bun run dev
```

### 方案 C：使用 JSON 而非 multipart（临时方案）

修改 CLI 使用 JSON 上传（需要服务端支持）：

但目前代码已经支持 JSON 和 multipart 两种方式。

## 检查清单

- [ ] 确认使用的是 Convex Cloud 部署 URL
- [ ] 确认 .env.local 中的 VITE_CONVEX_URL 正确
- [ ] 确认没有在运行本地 convex dev 服务器（如果要用云端）
- [ ] 检查 Convex 日志是否有错误
- [ ] 尝试重新部署 Convex 函数

## 快速修复

```bash
# 1. 停止所有 convex dev 进程
pkill -f "convex dev"

# 2. 重新部署到云端
bunx convex deploy --typecheck=disable --yes

# 3. 确认部署 URL
bunx convex deployment-url

# 4. 更新 .env.local
echo "VITE_CONVEX_URL=https://YOUR-DEPLOYMENT.convex.cloud" >> .env.local

# 5. 重新尝试发布
clawhub publish ./canvas-design --slug canvas-design --name "画布设计" --version 0.0.1
```

## 如果问题仍然存在

可能是 Convex 平台的限制。考虑：

1. 使用 Convex 的存储 API 而非 HTTP router
2. 使用预签名上传 URL（类似 S3）
3. 联系 Convex 支持团队
