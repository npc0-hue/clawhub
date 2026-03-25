# 🐳 Docker 一键部署 - 超简单指南

## 🎯 只需 3 步

### 1️⃣ 生成配置（自动创建所有密钥）

```bash
./scripts/generate-secrets.sh
```

✅ 自动生成：
- RSA JWT 私钥
- JWKS 配置
- .env.docker 文件
- convex.env 文件

### 2️⃣ 配置 GitHub OAuth

打开 `.env.docker`，替换这两行：

```bash
AUTH_GITHUB_ID=你的 GitHub OAuth Client ID
AUTH_GITHUB_SECRET=你的 GitHub OAuth Client Secret
```

**如何获取？**
1. 访问 https://github.com/settings/developers
2. 创建新的 OAuth App
3. Homepage URL: `http://localhost:3000`
4. Callback URL: `http://localhost:3000/api/auth/callback/github`
5. 复制 Client ID 和 Secret

### 3️⃣ 启动 Docker

```bash
docker compose up -d
```

完成！🎉

访问：http://localhost:3000

---

## 📦 启动了什么？

```bash
docker compose ps
```

会看到 4 个服务：

| 服务 | 端口 | 说明 |
|------|------|------|
| clawhub | 3000 | 前端应用（Nitro 服务器） |
| convex | 3216 | Convex 后端（自托管） |
| postgres | 5432 | PostgreSQL 数据库 |
| redis | 6379 | Redis 缓存 |

所有数据都保存在 Docker volumes 中，重启不会丢失。

---

## 🔧 常用命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 重新构建
docker compose up -d --build

# 清理所有数据（警告：会删除所有数据！）
docker compose down -v
```

---

## 🌐 外网访问

### 方法 1：直接 IP（测试用）

编辑 `.env.docker`：

```bash
SITE_URL=http://你的服务器 IP:3000
```

开放防火墙端口 3000：

```bash
sudo ufw allow 3000/tcp
```

访问：`http://你的服务器 IP:3000`

### 方法 2：Nginx 反向代理（推荐）

安装 Nginx：

```bash
sudo apt install nginx -y
```

配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用并重启：

```bash
sudo ln -s /etc/nginx/sites-available/clawhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 方法 3：Cloudflare Tunnel（最简单，无需开放端口）

```bash
# 安装 cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# 创建 tunnel
cloudflared tunnel --url http://localhost:3000
```

会自动生成一个公网 URL！

---

## ❓ 故障排查

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

### 重置所有（慎用！）

```bash
# 删除所有容器和数据
docker compose down -v

# 重新启动
docker compose up -d
```

---

## 📊 资源占用

默认配置下：

- **CPU**: 约 1-2 核心
- **内存**: 约 1-2 GB
- **磁盘**: 约 500MB（不含数据）

可以在 `docker-compose.yml` 中调整资源限制。

---

## 🔐 安全建议

1. **生产环境务必使用 HTTPS**
2. **不要提交 `.env.docker` 到 Git**（已添加到 .gitignore）
3. **定期备份数据库**：
   ```bash
   docker compose exec postgres pg_dump -U convex convex > backup.sql
   ```
4. **使用强密码**（如果需要外网访问）
5. **配置防火墙规则**

---

## 📚 更多文档

- **完整部署指南**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **快速部署**: [README_DEPLOY.md](README_DEPLOY.md)
- **项目文档**: [docs/README.md](docs/README.md)

---

**有问题？** 查看日志是最快的排查方式：

```bash
docker compose logs -f
```
