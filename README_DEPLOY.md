# 🚀 ClawHub 一键部署

## 3 分钟快速启动

### 步骤 1：配置 GitHub OAuth（只需一次）

1. 访问 https://github.com/settings/developers
2. 点击 **"New OAuth App"**
3. 填写：
   - **Application name**: `ClawHub`（随意）
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. 点击 **"Register application"**
5. 点击 **"Generate a new client secret"**
6. 复制 **Client ID** 和 **Client Secret**

### 步骤 2：编辑配置文件

打开 `.env.docker` 文件，替换这两行：

```bash
AUTH_GITHUB_ID=你的 Client ID
AUTH_GITHUB_SECRET=你的 Client Secret
```

### 步骤 3：一键部署

```bash
./scripts/deploy.sh
```

完成！🎉

访问：http://localhost:3000

---

## 手动部署（可选）

如果不想用脚本：

```bash
# 1. 生成密钥（如果还没有 .env.docker）
./scripts/generate-secrets.sh

# 2. 编辑 .env.docker，填入 GitHub OAuth 信息

# 3. 启动 Docker
docker compose up -d

# 4. 查看状态
docker compose ps

# 5. 查看日志
docker compose logs -f
```

---

## 常用命令

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 重启
docker compose restart

# 查看日志
docker compose logs -f

# 查看状态
docker compose ps

# 进入容器
docker compose exec clawhub sh

# 重新构建
docker compose up -d --build
```

---

## 服务架构

```
┌──────────────────────┐
│  Docker Compose      │
│                      │
│  ┌────────────────┐  │
│  │  Frontend      │  │ 端口 3000
│  │  (Nitro)       │  │
│  └───────┬────────┘  │
│          │           │
│  ┌───────▼────────┐  │
│  │  Convex        │  │ 端口 3216（内部）
│  │  Backend       │  │
│  └───────┬────────┘  │
│          │           │
│  ┌───────▼────────┐  │
│  │  PostgreSQL    │  │ 端口 5432（内部）
│  │  Database      │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │  Redis         │  │ 端口 6379（内部）
│  │  Cache         │  │
│  └────────────────┘  │
└──────────────────────┘
```

所有服务都在一个 `docker compose up -d` 中启动！

---

## 外网访问

### 方案 A：直接 IP（测试用）

```bash
# .env.docker
SITE_URL=http://你的服务器 IP:3000
```

开放防火墙端口 3000 即可访问。

### 方案 B：Nginx 反向代理（生产推荐）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 方案 C：Cloudflare Tunnel（最简单）

```bash
# 安装 cloudflared
cloudflared tunnel --url http://localhost:3000
```

会自动生成一个公网 URL！

---

## 故障排查

### 容器启动失败

```bash
# 查看详细错误
docker compose logs clawhub
docker compose logs convex
```

### GitHub OAuth 登录失败

- 检查 Callback URL 是否正确
- 检查 `.env.docker` 中的 `AUTH_GITHUB_ID` 和 `AUTH_GITHUB_SECRET`

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose ps postgres

# 查看数据库日志
docker compose logs postgres
```

### 重置所有数据（警告：会删除所有数据！）

```bash
docker compose down -v
docker compose up -d
```

---

## 技术栈

- **前端**: TanStack Start + React 19 + TypeScript
- **后端**: Convex（自托管）
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **服务器**: Nitro（Bun 运行时）
- **认证**: Convex Auth + GitHub OAuth

---

## 下一步

1. **配置域名**（可选）
2. **设置 HTTPS**（推荐）
3. **配置 OpenAI API**（用于向量搜索，可选）
4. **部署技能**：参考 `docs/spec.md`

---

**需要帮助？** 查看完整文档 `DEPLOYMENT.md`
