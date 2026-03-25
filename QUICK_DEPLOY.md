# 🚀 ClawHub 快速部署指南

## 5 分钟快速部署（推荐）

### 步骤 1：部署 Convex 后端
```bash
# 登录 Convex
bunx convex login

# 一键部署脚本（自动处理所有步骤）
./scripts/deploy-convex.sh
```

### 步骤 2：配置环境变量
```bash
# 复制配置模板
cp .env.docker.example .env.docker

# 编辑 .env.docker
# 脚本会自动设置 VITE_CONVEX_URL
# 还需要手动设置：
# - AUTH_GITHUB_ID
# - AUTH_GITHUB_SECRET
# - JWT_PRIVATE_KEY
# - JWKS
```

### 步骤 3：启动 Docker
```bash
docker compose up -d --build
```

### 步骤 4：验证部署
```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 访问应用
open http://localhost:3000
```

✅ 完成！

---

## 完整部署（包含所有配置）

```bash
# 运行交互式部署脚本
./scripts/deploy-full.sh
```

脚本会引导你完成：
1. ✅ Convex 部署（Cloud 或自托管）
2. ✅ 环境变量配置
3. ✅ Docker 容器启动
4. ✅ 服务健康检查

---

## 生产环境部署清单

### 必需配置
- [ ] Convex 已部署并获取 URL
- [ ] GitHub OAuth App 已创建
- [ ] JWT 密钥已生成
- [ ] 环境变量已配置（.env.docker）
- [ ] Convex 环境变量已设置（convex.env 或 Dashboard）

### 推荐配置
- [ ] 域名已配置 DNS
- [ ] Nginx 反向代理已设置
- [ ] HTTPS 证书已安装（Let's Encrypt）
- [ ] 防火墙规则已配置
- [ ] 监控和日志已设置

### 可选配置
- [ ] OpenAI API Key（向量搜索）
- [ ] 自定义存储（S3/R2）
- [ ] 外部数据库（RDS/Supabase）

---

## 常用命令速查

```bash
# 部署 Convex
bunx convex deploy

# 设置 Convex 环境变量
bunx convex env set KEY=value

# 查看 Convex 日志
bunx convex logs

# Docker 操作
docker compose up -d --build    # 启动
docker compose down             # 停止
docker compose logs -f          # 日志
docker compose ps               # 状态
docker compose restart          # 重启

# 健康检查
curl http://localhost:3000/api/health
docker inspect --format='{{.State.Health.Status}}' clawhub-app
```

---

## 环境变量快速参考

### .env.docker（前端容器）
```bash
HOST_PORT=3000
SITE_URL=https://your-domain.com
VITE_CONVEX_URL=https://xxx.convex.cloud
AUTH_GITHUB_ID=xxx
AUTH_GITHUB_SECRET=xxx
JWT_PRIVATE_KEY="-----BEGIN..."
JWKS={"keys":...}
```

### convex.env（Convex 后端）
```bash
AUTH_GITHUB_ID=xxx
AUTH_GITHUB_SECRET=xxx
JWT_PRIVATE_KEY="-----BEGIN..."
JWKS={"keys":...}
OPENAI_API_KEY=sk-xxx
```

---

## 遇到问题？

1. **查看完整文档**：`DEPLOYMENT.md`
2. **Convex 文档**：https://docs.convex.dev/
3. **GitHub Issues**：https://github.com/your-repo/clawhub/issues

### 快速诊断命令
```bash
# 检查所有服务状态
docker compose ps

# 查看错误日志
docker compose logs | grep -i error

# 检查 Convex 连接
docker compose exec clawhub curl $VITE_CONVEX_URL/health

# 测试 OAuth 配置
docker compose exec clawhub env | grep AUTH
```

---

**需要帮助？** 运行 `./scripts/deploy-full.sh` 获取交互式部署向导！
