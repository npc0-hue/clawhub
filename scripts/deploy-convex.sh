#!/bin/bash
# ===========================================
# Convex 部署脚本
# ===========================================

set -e

echo "🚀 开始部署 Convex 后端..."

# 检查是否已登录 Convex
if ! bunx convex whoami > /dev/null 2>&1; then
    echo "❌ 未登录 Convex，请先执行：bunx convex login"
    exit 1
fi

# 获取部署名称
DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-"clawhub"}

echo "📦 部署名称：$DEPLOYMENT_NAME"

# 部署 Convex 函数
echo "🔨 部署 Convex 函数..."
bunx convex deploy --deployment-name "$DEPLOYMENT_NAME" --typecheck=disable --yes

# 获取部署 URL
CONVEX_URL=$(bunx convex deployment-url --deployment-name "$DEPLOYMENT_NAME")

echo "✅ Convex 部署成功！"
echo "📍 部署 URL: $CONVEX_URL"
echo ""
echo "📝 请将以下配置添加到你的环境变量："
echo "VITE_CONVEX_URL=$CONVEX_URL"
echo ""
echo "⚠️  记得在 Convex Dashboard 配置 OAuth 和环境变量！"
