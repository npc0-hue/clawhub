# ClawHub Docker 完整部署指南

## 部署模式选择

ClawHub 支持两种部署模式：

### 模式 A：Convex Cloud（推荐 ⭐）
- ✅ 官方托管，零运维
- ✅ 自动扩展，高可用
- ✅ 免费额度充足
- ❌ 数据在 Convex 云端

### 模式 B：Convex Self-Hosted（自建）
- ✅ 数据完全自控
- ✅ 可定制配置
- ❌ 需要运维 PostgreSQL
- ❌ 需要 Convex 自托管许可证

## 快速开始（推荐：Convex Cloud）

### 方式一：一键部署脚本（最简单）
```bash
# 运行完整部署脚本
./scripts/deploy-full.sh
# 选择选项 1 (Convex Cloud)
```

### 方式二：手动部署

### 1. 部署 Convex 后端
```bash
# 使用自动部署脚本
./scripts/deploy-convex.sh

# 或手动部署
bunx convex login
bunx convex init
bunx convex deploy
```

### 2. 配置环境变量
```bash
# 复制环境配置
cp .env.docker.example .env.docker

# 编辑 .env.docker，填入配置
# 脚本会自动设置 VITE_CONVEX_URL，其他需要手动填写
```

### 3. GitHub OAuth App
1. 访问 https://github.com/settings/developers
2. 创建新的 OAuth App
3. **Homepage URL**: `https://your-domain.com`
4. **Callback URL**: `https://your-domain.com/api/auth/callback/github`
   - Convex Cloud: `https://your-deployment.convex.cloud/api/auth/callback/github`
   - 自托管：`https://your-domain.com/api/auth/callback/github`
5. 记录 Client ID 和 Client Secret

### 4. 生成 JWT Keys
```bash
bunx @convex-dev/auth secret-key generate
```

### 5. 配置 Convex 环境变量
```bash
# 方式一：使用 convex.env 文件
cp convex.env.example convex.env
# 编辑 convex.env 填入配置
bunx convex env set --env-file convex.env

# 方式二：在 Convex Dashboard 手动设置
# https://dashboard.convex.dev -> Your Deployment -> Settings -> Environment Variables
```

必需的环境变量：
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `JWT_PRIVATE_KEY`
- `JWKS`
- `OPENAI_API_KEY`（可选，用于向量搜索）

### 6. 构建并运行 Docker 容器
```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f clawhub

# 停止服务
docker compose down
```

---

## 部署模式 B：Convex Self-Hosted（自建）

⚠️ **重要提示**：Convex 自托管需要额外的配置和可能的许可证。仅推荐有运维经验的团队使用。

### 前置要求

1. **Convex 自托管许可证**（如需要）
   - 联系 Convex 团队获取
   - 或查看开源许可证选项

2. **PostgreSQL 16+**
   - 可本地运行或使用托管服务（AWS RDS、Supabase 等）

3. **存储后端**
   - 本地存储（开发用）
   - AWS S3 / Cloudflare R2（生产用）

### 快速部署

```bash
# 运行完整部署脚本
./scripts/deploy-full.sh
# 选择选项 2 (Convex Self-Hosted)
```

### 手动部署

```bash
# 1. 配置环境变量
cp .env.docker.example .env.docker
# 编辑 .env.docker，设置 STORAGE_TYPE=local 或 s3

# 2. 启动完整服务栈
docker compose -f docker-compose.full.yml up -d --build

# 3. 查看日志
docker compose -f docker-compose.full.yml logs -f convex-backend
```

### 服务架构

```
┌─────────────────┐
│   Nginx (80)    │  ← 反向代理
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│Front  │ │Convex   │
│:3000  │ │:3216    │
└───────┘ └───┬─────┘
              │
         ┌────▼────┐
         │Postgres │
         │:5432    │
         └─────────┘
```

### 配置外部数据库（可选）

如果使用外部 PostgreSQL（如 AWS RDS）：

```yaml
# docker-compose.full.yml
services:
  convex-backend:
    environment:
      DATABASE_URL: postgresql://user:password@your-rds.amazonaws.com:5432/convex
  
  # 移除本地 postgres 服务
```

### 配置 S3 存储（可选）

```bash
# .env.docker
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket-name
```

---

## 外网访问配置

### 方案 A：直接 IP 访问（测试用）
```bash
# 在 .env.docker 中设置
SITE_URL=http://YOUR_SERVER_IP:3000
CONVEX_SITE_URL=http://YOUR_SERVER_IP:3000

# 确保防火墙开放 3000 端口
sudo ufw allow 3000/tcp
```

访问：`http://YOUR_SERVER_IP:3000`

### 方案 B：域名 + Nginx 反向代理（生产推荐）

#### 1. 安装 Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

#### 2. 配置 Nginx
```nginx
# /etc/nginx/sites-available/clawhub
server {
    listen 80;
    server_name clawhub.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. 启用站点并重启 Nginx
```bash
sudo ln -s /etc/nginx/sites-available/clawhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. 配置 HTTPS（Let's Encrypt）
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d clawhub.example.com
```

#### 5. 更新环境变量
```bash
# .env.docker
SITE_URL=https://clawhub.example.com
CONVEX_SITE_URL=https://clawhub.example.com
```

#### 6. 更新 GitHub OAuth Callback URL
在 GitHub OAuth App 设置中更新：
```
Callback URL: https://clawhub.example.com/api/auth/callback/github
```

#### 7. 重启 Docker 容器
```bash
docker compose down
docker compose up -d
```

### 方案 C：使用 Cloudflare Tunnel（无需开放端口）

#### 1. 安装 cloudflared
```bash
# Debian/Ubuntu
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

#### 2. 创建 Tunnel
```bash
cloudflared tunnel create clawhub
cloudflared tunnel route dns clawhub clawhub.example.com
```

#### 3. 配置并运行
```yaml
# ~/.cloudflared/config.yml
tunnel: clawhub
credentials-file: /root/.cloudflared/clawhub.json

ingress:
  - hostname: clawhub.example.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
cloudflared tunnel run clawhub
```

## 常用 Docker 命令

```bash
# 查看容器状态
docker compose ps

# 查看实时日志
docker compose logs -f clawhub

# 重启容器
docker compose restart

# 重新构建并启动
docker compose up -d --build

# 进入容器
docker compose exec clawhub sh

# 停止并清理
docker compose down --volumes --rmi local
```

## 健康检查

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 或使用 Docker 健康检查
docker inspect --format='{{.State.Health.Status}}' clawhub-app
```

## 监控与日志

### 查看应用日志
```bash
docker compose logs -f clawhub
```

### 资源使用监控
```bash
docker stats clawhub-app
```

### 持久化日志（可选）
修改 `docker-compose.yml`：
```yaml
services:
  clawhub:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并部署
docker compose up -d --build

# 3. 清理旧镜像
docker image prune -f
```

## 故障排查

### 容器无法启动
```bash
# 查看详细错误
docker compose logs clawhub

# 检查环境变量
docker compose exec clawhub env | grep -E 'CONVEX|AUTH|JWT'
```

### Convex 连接失败

**Convex Cloud 模式：**
- 确认 `VITE_CONVEX_URL` 正确（格式：`https://xxx.convex.cloud`）
- 确认 Convex 函数已部署：`bunx convex deploy`
- 检查 Convex Dashboard：https://dashboard.convex.dev
- 确认 Convex 环境变量已设置：`bunx convex env list`

**自托管模式：**
```bash
# 检查 Convex 后端状态
docker compose -f docker-compose.full.yml logs convex-backend

# 检查数据库连接
docker compose -f docker-compose.full.yml exec postgres psql -U convex -c "SELECT 1"

# 查看 Convex 日志
docker logs convex-backend | grep -i error
```

### GitHub OAuth 登录失败
- 确认 Callback URL 匹配（包含协议和域名）
  - Convex Cloud: `https://your-deployment.convex.cloud/api/auth/callback/github`
  - 自托管：`https://your-domain.com/api/auth/callback/github`
- 确认 `AUTH_GITHUB_ID` 和 `SECRET` 正确
- 检查 `JWT_PRIVATE_KEY` 和 `JWKS` 格式

### Convex 函数未生效
```bash
# 重新部署 Convex 函数
bunx convex deploy

# 或使用一次性部署
bunx convex dev --once
```

### 自托管模式常见问题

**Convex 后端启动失败：**
```bash
# 检查许可证
docker logs convex-backend | grep -i license

# 检查数据库迁移
docker compose -f docker-compose.full.yml exec convex-backend \
  bunx convex database migrate
```

**PostgreSQL 连接问题：**
```bash
# 检查数据库是否就绪
docker compose -f docker-compose.full.yml exec postgres pg_isready

# 查看数据库日志
docker compose -f docker-compose.full.yml logs postgres
```

**存储问题：**
```bash
# 检查存储目录权限
docker volume inspect clawhub_convex-storage

# 清理存储（警告：会删除数据！）
docker volume rm clawhub_convex-storage
```

### 端口冲突
```bash
# 查看端口占用
sudo lsof -i :3000
sudo lsof -i :3216  # Convex 端口

# 修改 HOST_PORT 环境变量
HOST_PORT=8080
```

### 查看 Convex 部署状态
```bash
# Convex Cloud
bunx convex deployment-url
bunx convex logs

# 自托管
docker logs convex-backend --tail 100
```

## 安全建议

1. **永远不要提交 `.env.docker` 到 Git**
2. 使用 HTTPS（生产环境必需）
3. 定期更新 Convex 密钥
4. 配置防火墙规则
5. 使用非 root 用户运行容器（已配置）
6. 启用 Docker 健康检查
7. 限制容器资源使用

## 性能优化

### 1. 使用多阶段构建（已实现）
最终镜像只包含运行时依赖，大小约 150-200MB。

### 2. 启用 Bun 生产优化
```dockerfile
ENV BUN_ENV=production
ENV NODE_ENV=production
```

### 3. 调整 Nitro 服务器配置
创建 `nitro.config.ts` 自定义服务器设置。

## 备份与恢复

### 备份 Convex 数据
```bash
bunx convex export > backup-$(date +%Y%m%d).jsonl
```

### 恢复 Convex 数据
```bash
bunx convex import < backup.jsonl
```

## 技术支持

- Convex 文档：https://docs.convex.dev/
- TanStack Start：https://tanstack.com/start
- Nitro 服务器：https://nitro.unjs.io/
- Docker 文档：https://docs.docker.com/
