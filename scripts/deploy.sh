#!/bin/bash
# ===========================================
# ClawHub 一键部署脚本
# ===========================================

set -e

echo "🚀 ClawHub 一键部署"
echo "===================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 检查是否已有配置
if [ ! -f ".env.docker" ]; then
    echo "📝 首次运行，生成配置文件..."
    ./scripts/generate-secrets.sh
fi

# 提示用户检查配置
echo ""
echo "⚠️  请检查 .env.docker 中的配置："
echo ""
echo "GitHub OAuth 配置（必需）："
echo "  1. 访问 https://github.com/settings/developers"
echo "  2. 创建新的 OAuth App"
echo "  3. Homepage URL: http://localhost:3000"
echo "  4. Callback URL: http://localhost:3000/api/auth/callback/github"
echo "  5. 复制 Client ID 和 Client Secret"
echo ""

read -p "是否已配置 GitHub OAuth？(y/N): " CONFIGURED

if [ "$CONFIGURED" != "y" ] && [ "$CONFIGURED" != "Y" ]; then
    echo ""
    echo "📖 打开 .env.docker 文件，替换以下内容："
    echo "  AUTH_GITHUB_ID=your-github-oauth-id"
    echo "  AUTH_GITHUB_SECRET=your-github-oauth-secret"
    echo ""
    echo "配置完成后重新运行：./scripts/deploy.sh"
    exit 0
fi

# 检查配置文件
if ! grep -q "your-github-oauth-id" .env.docker 2>/dev/null; then
    echo ""
    echo "✅ 配置检查通过"
else
    echo ""
    echo "⚠️  检测到占位符配置，请编辑 .env.docker 填入真实的 GitHub OAuth 信息"
    exit 1
fi

# 构建并启动
echo ""
echo "🔨 开始构建 Docker 镜像..."
docker compose --env-file .env.docker build

echo ""
echo "🚀 启动服务..."
docker compose --env-file .env.docker up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 健康检查
echo ""
echo "🏥 检查服务状态..."

if docker compose ps clawhub | grep -q "healthy"; then
    echo "✅ ClawHub 已启动！"
else
    echo "⚠️  服务启动中，请查看日志..."
fi

echo ""
echo "📊 服务状态："
docker compose ps

echo ""
echo "🌐 访问地址：http://localhost:3000"
echo ""
echo "📋 常用命令："
echo "  查看日志：docker compose logs -f"
echo "  停止服务：docker compose down"
echo "  重启服务：docker compose restart"
echo ""
echo "🎉 部署完成！"
