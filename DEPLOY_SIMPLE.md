# 🚀 ClawHub 超简单部署

## 重要说明

**Convex 后端使用官方云服务**（免费额度充足），Docker 只运行前端应用。

原因：
- Convex 自托管需要特殊许可证和内部镜像
- Convex Cloud 免费、自动扩展、零运维
- 数据同样安全，支持备份导出

---

## 5 分钟部署

### 步骤 1：部署 Convex 后端（云端）

```bash
# 登录 Convex（免费）
bunx convex login

# 部署后端函数
bunx convex deploy
```

记下输出的 URL，格式类似：`https://xxx-yyy.convex.cloud`

### 步骤 2：生成配置

```bash
# 生成 JWT 密钥和环境变量
./scripts/generate-secrets.sh
```

### 步骤 3：配置 GitHub OAuth

编辑 `.env.docker`：

```bash
# 1. 访问 https://github.com/settings/developers
# 2. 创建 OAuth App
# 3. Callback URL: http://localhost:3000/api/auth/callback/github
# 4. 复制 Client ID 和 Secret

AUTH_GITHUB_ID=你的 Client ID
AUTH_GITHUB_SECRET=你的 Client Secret

# 5. 填入 Convex URL（从步骤 1）
VITE_CONVEX_URL=https://你的部署.convex.cloud
VITE_CONVEX_SITE_URL=http://localhost:3000
```

### 步骤 4：启动 Docker

```bash
docker compose up -d
```

完成！访问 http://localhost:3000

---

## 一键部署脚本

```bash
./scripts/deploy.sh
```

脚本会：
1. 检查配置
2. 生成密钥
3. 构建 Docker
4. 启动服务

---

## 外网访问

### 方案 A：Cloudflare Tunnel（最简单）

```bash
# 安装 cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# 创建公网隧道
cloudflared tunnel --url http://localhost:3000
```

会自动生成一个公网 URL！

### 方案 B：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 方案 C：直接 IP

编辑 `.env.docker`：

```bash
SITE_URL=http://你的服务器 IP:3000
```

开放防火墙端口 3000。

---

## 架构说明

```
┌─────────────────┐
│   Docker        │
│  ┌───────────┐  │
│  │ Frontend  │──┼──► http://localhost:3000
│  │ (Nitro)   │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  Convex Cloud   │
│  - Database     │
│  - File Storage │
│  - Functions    │
│  - Auth         │
└─────────────────┘
```

---

## 环境变量说明

### .env.docker

```bash
# 网络
HOST_PORT=3000
SITE_URL=http://localhost:3000

# Convex Cloud（必需）
VITE_CONVEX_URL=https://xxx.convex.cloud
VITE_CONVEX_SITE_URL=http://localhost:3000

# GitHub OAuth（必需）
AUTH_GITHUB_ID=xxx
AUTH_GITHUB_SECRET=xxx

# JWT 密钥（已自动生成）
JWT_PRIVATE_KEY="-----BEGIN..."
JWKS={"keys":...}

# 可选
OPENAI_API_KEY=sk-xxx  # 向量搜索
```

---

## 常用命令

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker compose logs -f

# 重启
docker compose restart

# 查看状态
docker compose ps

# 重新部署 Convex
bunx convex deploy

# 查看 Convex 日志
bunx convex logs
```

---

## 故障排查

### Convex 连接失败

```bash
# 检查 Convex 部署
bunx convex dev --once

# 查看 Convex 状态
bunx convex deployment-url
```

### GitHub OAuth 失败

- 检查 Callback URL 是否匹配
- 确认 `.env.docker` 中的 ID 和 Secret 正确

### Docker 启动失败

```bash
# 查看详细错误
docker compose logs clawhub

# 清理重建
docker compose down
docker compose up -d --build
```

---

## 费用说明

**Convex Cloud 免费额度：**
- 每月 100 万次函数调用
- 5GB 存储
- 足够个人和小团队使用

升级计划：https://www.convex.dev/pricing

---

## 数据备份

```bash
# 导出数据
bunx convex export > backup.jsonl

# 导入数据
bunx convex import < backup.jsonl
```

---

**需要帮助？** 查看完整文档 `DEPLOYMENT.md`
