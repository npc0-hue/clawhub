# GitHub OAuth 登录问题排查

## 问题现象
点击 "Sign in with GitHub" 按钮无响应或失败

## 可能原因

### 1. 环境变量配置问题

检查 `.env.local` 文件中的 Convex URL 配置：

```bash
# 前端使用的 Convex URL
VITE_CONVEX_URL=https://impartial-jay-24.convex.cloud
VITE_CONVEX_SITE_URL=https://impartial-jay-24.convex.cloud

# Convex Auth 使用的 URL（必须与 Convex Dashboard 中配置的一致）
CONVEX_SITE_URL=https://clawhub.yafex.cn
SITE_URL=https://clawhub.yafex.cn
```

**问题**: `VITE_CONVEX_SITE_URL` 和 `CONVEX_SITE_URL` 不一致！

**解决方案**:
1. 登录 [Convex Dashboard](https://dashboard.convex.dev)
2. 进入你的项目设置
3. 检查 "Authentication" -> "OAuth" 配置
4. 确保 `CONVEX_SITE_URL` 与 Convex Dashboard 中的配置一致

### 2. GitHub OAuth App 配置

检查 GitHub OAuth App 设置：

1. 访问 https://github.com/settings/developers
2. 找到你的 OAuth App（`Ov23liwvsmJkguInjLc0`）
3. 检查 "Authorization callback URL"

**正确的回调地址应该是**:
```
https://impartial-jay-24.convex.cloud/api/auth/callback/github
```

或者如果是生产环境：
```
https://clawhub.yafex.cn/api/auth/callback/github
```

### 3. 本地开发环境

如果是本地开发，确保：

```bash
# .env.local
VITE_CONVEX_URL=https://impartial-jay-24.convex.cloud
VITE_CONVEX_SITE_URL=https://impartial-jay-24.convex.cloud
CONVEX_SITE_URL=https://impartial-jay-24.convex.cloud
```

### 4. 生产环境配置

生产环境需要确保：

```bash
# 所有环境变量都需要设置
VITE_CONVEX_URL=<你的 Convex URL>
VITE_CONVEX_SITE_URL=<你的 Convex URL>
CONVEX_SITE_URL=https://clawhub.yafex.cn
SITE_URL=https://clawhub.yafex.cn
AUTH_GITHUB_ID=<你的 GitHub OAuth ID>
AUTH_GITHUB_SECRET=<你的 GitHub OAuth Secret>
```

## 调试步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- Console 标签：是否有错误信息
- Network 标签：OAuth 请求是否发送，响应状态码

### 2. 检查 Convex 函数日志

```bash
# 查看 Convex 函数日志
bunx convex logs --level error
```

### 3. 验证环境变量

```bash
# 检查环境变量是否正确加载
echo $CONVEX_SITE_URL
echo $AUTH_GITHUB_ID
```

### 4. 测试 OAuth 流程

手动访问 OAuth 端点测试：
```
https://impartial-jay-24.convex.cloud/api/auth/signin/github
```

## K8s 部署注意事项

确保在 K8s Deployment 中设置正确的环境变量：

```yaml
env:
- name: VITE_CONVEX_URL
  value: "https://impartial-jay-24.convex.cloud"
- name: VITE_CONVEX_SITE_URL
  value: "https://impartial-jay-24.convex.cloud"
- name: CONVEX_SITE_URL
  value: "https://clawhub.yafex.cn"  # 生产环境域名
- name: SITE_URL
  value: "https://clawhub.yafex.cn"
- name: AUTH_GITHUB_ID
  value: "Ov23liwvsmJkguInjLc0"
- name: AUTH_GITHUB_SECRET
  valueFrom:
    secretKeyRef:
      name: clawhub-secrets
      key: AUTH_GITHUB_SECRET
```

## 快速修复

如果 `CONVEX_SITE_URL` 配置错误，修改 `.env.local`：

```bash
# 开发环境（使用 Convex Cloud）
CONVEX_SITE_URL=https://impartial-jay-24.convex.cloud

# 或生产环境（使用自定义域名）
CONVEX_SITE_URL=https://clawhub.yafex.cn
```

然后重新构建和部署：

```bash
# 本地开发
bun run dev

# 或重新构建 Docker 镜像
./scripts/build-amd64.sh
```
