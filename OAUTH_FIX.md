# 🔧 OAuth "Invalid verifier" 错误修复

## 问题现象

```
Mar 06, 17:08:07.223
auth:store
error
Invalid verifier
```

## 根本原因

**OAuth verifier 验证失败是因为域名配置不一致**：

### 错误的配置（已修复）

```bash
# .env.local
VITE_CONVEX_URL=https://secret-mandrill-759.convex.cloud
VITE_CONVEX_SITE_URL=https://secret-mandrill-759.convex.cloud
CONVEX_SITE_URL=https://secret-mandrill-759.convex.cloud  # ❌ 错误！
SITE_URL=https://clawhub.dev.yafex.cn
```

**问题**：用户访问的是 `https://clawhub.dev.yafex.cn`，但 OAuth 回调地址生成的是 `https://secret-mandrill-759.convex.cloud/api/auth/callback/github`，导致 verifier 验证失败。

### 正确的配置（已应用）

```bash
# .env.local
VITE_CONVEX_URL=https://secret-mandrill-759.convex.cloud
VITE_CONVEX_SITE_URL=https://secret-mandrill-759.convex.cloud
CONVEX_SITE_URL=https://clawhub.dev.yafex.cn  # ✅ 正确！使用自定义域名
SITE_URL=https://clawhub.dev.yafex.cn
```

## 修复步骤

### 1. ✅ 已修复：更新 .env.local

```bash
# 修改 CONVEX_SITE_URL 为自定义域名
CONVEX_SITE_URL=https://clawhub.dev.yafex.cn
```

### 2. ✅ 已修复：更新 K8s 部署配置

修改 `k8s-deployment.yaml`：

```yaml
env:
- name: VITE_CONVEX_URL
  value: "https://secret-mandrill-759.convex.cloud"
- name: VITE_CONVEX_SITE_URL
  value: "https://secret-mandrill-759.convex.cloud"
- name: CONVEX_SITE_URL
  value: "https://clawhub.dev.yafex.cn"  # ✅ 与自定义域名一致
- name: AUTH_GITHUB_ID
  value: "Ov23lipQ6P3pwWwSe7Wi"  # ✅ 使用正确的 OAuth App ID
- name: AUTH_GITHUB_SECRET
  value: "43118e7a7fcedc797c4220fc5f88c6640da9cf0f"
```

### 3. ⚠️ 必须完成：配置 GitHub OAuth App

访问 https://github.com/settings/developers，找到你的 OAuth App，确保：

**Authorization callback URL** 配置为：
```
https://clawhub.dev.yafex.cn/api/auth/callback/github
```

**如果配置错误，OAuth 回调会失败！**

### 4. 重新部署

```bash
# 1. 重新构建 Docker 镜像
./scripts/build-amd64.sh

# 2. 更新 K8s 部署
kubectl apply -f k8s-deployment.yaml

# 3. 重启 Pod
kubectl rollout restart deployment/clawhub

# 4. 查看日志
kubectl logs -f deployment/clawhub
```

## 验证修复

1. 访问 https://clawhub.dev.yafex.cn
2. 点击 "Sign in with GitHub"
3. 应该能正常跳转到 GitHub 授权页面
4. 授权后成功回调并登录

## 配置说明

### 各个环境变量的作用

| 变量名 | 用途 | 应该设置为 |
|--------|------|-----------|
| `VITE_CONVEX_URL` | 前端连接 Convex 后端的 URL | Convex Cloud URL |
| `VITE_CONVEX_SITE_URL` | 前端构建时使用的站点 URL | Convex Cloud URL |
| `CONVEX_SITE_URL` | **Convex Auth 生成 OAuth 回调地址的域名** | **自定义域名** |
| `SITE_URL` | 应用的公开访问地址 | 自定义域名 |

### 为什么 `CONVEX_SITE_URL` 必须是自定义域名？

Convex Auth 使用 `CONVEX_SITE_URL` 来：
1. 生成 OAuth 授权请求的 `redirect_uri` 参数
2. 验证回调时的 verifier 签名

如果这个值与实际访问的域名不一致：
- GitHub 会拒绝回调（域名不匹配）
- 或者 verifier 验证失败（状态丢失）

## 开发环境 vs 生产环境

### 本地开发

```bash
# .env.local
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.cloud
CONVEX_SITE_URL=http://localhost:3000  # 本地开发用 localhost
SITE_URL=http://localhost:3000
```

### 生产环境（K8s）

```bash
# k8s-deployment.yaml
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.cloud
CONVEX_SITE_URL=https://clawhub.dev.yafex.cn  # 生产域名
SITE_URL=https://clawhub.dev.yafex.cn
```

## 常见问题

### Q: 为什么 `VITE_CONVEX_SITE_URL` 和 `CONVEX_SITE_URL` 不一样？

- `VITE_CONVEX_SITE_URL`：前端代码中使用的 Convex 站点 URL（用于 Convex 内部通信）
- `CONVEX_SITE_URL`：Convex Auth 生成 OAuth 回调地址时使用的域名

它们可以相同（开发环境），也可以不同（生产环境使用自定义域名）。

### Q: 如何确认 GitHub OAuth App 配置正确？

访问 https://github.com/settings/developers，检查：
1. Application callback URL 是否包含 `/api/auth/callback/github`
2. 域名是否与 `CONVEX_SITE_URL` 一致

### Q: 还是失败怎么办？

1. 检查浏览器控制台错误
2. 查看 Convex 函数日志：`bunx convex logs`
3. 确认所有环境变量已正确加载
4. 清除浏览器缓存和 Cookie 后重试

## 参考资料

- [Convex Auth 文档](https://docs.convex.dev/auth)
- [GitHub OAuth App 配置](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GITHUB_OAUTH_TROUBLESHOOTING.md](./GITHUB_OAUTH_TROUBLESHOOTING.md)
