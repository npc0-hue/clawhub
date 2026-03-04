#!/bin/bash
# ===========================================
# ClawHub 完整部署脚本
# ===========================================

set -e

echo "🚀 开始部署 ClawHub..."
echo ""

# 选择部署模式
echo "请选择部署模式:"
echo "1) Convex Cloud（推荐，托管服务）"
echo "2) Convex Self-Hosted（自建，需要 PostgreSQL）"
read -p "请输入选项 (1/2): " DEPLOY_MODE

if [ "$DEPLOY_MODE" = "1" ]; then
    echo ""
    echo "☁️  Convex Cloud 部署模式"
    echo ""
    
    # 检查 Convex 登录
    if ! bunx convex whoami > /dev/null 2>&1; then
        echo "❌ 未登录 Convex，请先执行：bunx convex login"
        exit 1
    fi
    
    # 部署 Convex 函数
    echo "📦 部署 Convex 函数..."
    DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-"clawhub"}
    bunx convex deploy --deployment-name "$DEPLOYMENT_NAME" --typecheck=disable --yes
    
    # 获取部署 URL
    CONVEX_URL=$(bunx convex deployment-url --deployment-name "$DEPLOYMENT_NAME")
    
    echo ""
    echo "✅ Convex Cloud 部署成功！"
    echo "📍 Convex URL: $CONVEX_URL"
    echo ""
    
    # 更新前端环境变量
    echo "📝 更新前端配置..."
    if [ -f ".env.docker" ]; then
        sed -i.bak "s|VITE_CONVEX_URL=.*|VITE_CONVEX_URL=$CONVEX_URL|g" .env.docker
        echo "✅ 已更新 .env.docker"
    else
        echo "⚠️  .env.docker 不存在，请手动设置 VITE_CONVEX_URL=$CONVEX_URL"
    fi
    
    echo ""
    echo "🔨 构建并启动前端容器..."
    docker compose up -d --build
    
    echo ""
    echo "✅ 部署完成！"
    echo "🌐 访问地址：http://localhost:3000"
    echo ""
    echo "📋 下一步："
    echo "1. 在 Convex Dashboard 配置 OAuth: https://dashboard.convex.dev"
    echo "2. 设置环境变量：AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, JWT_PRIVATE_KEY, JWKS"
    echo "3. 查看日志：docker compose logs -f"
    
elif [ "$DEPLOY_MODE" = "2" ]; then
    echo ""
    echo "🏠 Convex Self-Hosted 部署模式"
    echo ""
    echo "⚠️  警告：Convex 自托管需要额外的配置和许可证"
    echo "请确保你已经："
    echo "1. 获取了 Convex 自托管许可证"
    echo "2. 准备了 PostgreSQL 数据库"
    echo "3. 配置了存储后端（本地或 S3）"
    echo ""
    
    read -p "是否继续？(y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "❌ 部署已取消"
        exit 0
    fi
    
    # 检查环境变量文件
    if [ ! -f ".env.docker" ]; then
        echo "❌ .env.docker 不存在，请复制 .env.docker.example 并配置"
        exit 1
    fi
    
    echo ""
    echo "🔨 启动完整服务栈（Frontend + Convex + PostgreSQL + Redis）..."
    docker compose -f docker-compose.full.yml up -d --build
    
    echo ""
    echo "✅ 服务启动中..."
    echo "🌐 访问地址：http://localhost:3000"
    echo "📊 Convex 后端：http://localhost:3216"
    echo ""
    echo "📋 查看日志："
    echo "  docker compose -f docker-compose.full.yml logs -f"
    echo ""
    echo "⚠️  注意：Convex 自托管需要额外的许可证和配置"
    echo "请参考：https://docs.convex.dev/self-hosted"
    
else
    echo "❌ 无效选项"
    exit 1
fi

echo ""
echo "🎉 部署完成！"
