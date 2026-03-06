#!/bin/bash

echo "🔍 ClawHub 发布问题诊断"
echo "========================"
echo ""

# 1. 检查 Convex 部署
echo "1️⃣ 检查 Convex 部署状态..."
if command -v bunx &> /dev/null; then
    DEPLOY_URL=$(bunx convex deployment-url 2>&1)
    if [[ $DEPLOY_URL == *"https://"* ]]; then
        echo "✅ Convex 部署 URL: $DEPLOY_URL"
    else
        echo "❌ 未找到 Convex 部署"
        echo "   运行：bunx convex deploy"
    fi
else
    echo "❌ 未找到 bunx"
fi

echo ""

# 2. 检查 .env.local
echo "2️⃣ 检查 .env.local 配置..."
if [ -f ".env.local" ]; then
    CONVEX_URL=$(grep "VITE_CONVEX_URL" .env.local | head -1)
    if [[ $CONVEX_URL == *"convex.cloud"* ]]; then
        echo "✅ VITE_CONVEX_URL 已配置：$CONVEX_URL"
    else
        echo "⚠️  VITE_CONVEX_URL 可能未正确配置"
        echo "   当前值：$CONVEX_URL"
    fi
else
    echo "❌ 未找到 .env.local"
fi

echo ""

# 3. 检查 canvas-design 目录
echo "3️⃣ 检查技能目录..."
if [ -d "skills/canvas-design" ]; then
    echo "✅ 找到 skills/canvas-design"
    ls -la skills/canvas-design/
elif [ -d "canvas-design" ]; then
    echo "✅ 找到 canvas-design"
    ls -la canvas-design/
else
    echo "❌ 未找到技能目录"
fi

echo ""

# 4. 检查是否在运行 convex dev
echo "4️⃣ 检查 convex dev 进程..."
if pgrep -f "convex dev" > /dev/null; then
    echo "⚠️  发现运行中的 convex dev 进程"
    echo "   如果在本地开发，请确保这是预期的"
    echo "   如果要使用云端部署，请停止：pkill -f 'convex dev'"
else
    echo "✅ 没有运行 convex dev 进程"
fi

echo ""

# 5. 检查 clawhub CLI 版本
echo "5️⃣ 检查 clawhub CLI..."
if command -v clawhub &> /dev/null; then
    CLAWHUB_VERSION=$(clawhub --version 2>&1)
    echo "✅ clawhub 版本：$CLAWHUB_VERSION"
else
    echo "❌ 未找到 clawhub CLI"
    echo "   运行：bun run build 然后安装 CLI"
fi

echo ""
echo "========================"
echo "💡 建议操作："
echo ""
echo "1. 如果未部署 Convex："
echo "   bunx convex deploy --typecheck=disable --yes"
echo ""
echo "2. 如果 VITE_CONVEX_URL 未配置："
echo "   编辑 .env.local，设置正确的 Convex URL"
echo ""
echo "3. 停止本地 convex dev（如果使用云端）："
echo "   pkill -f 'convex dev'"
echo ""
echo "4. 重新尝试发布："
echo "   clawhub publish ./canvas-design --slug canvas-design --name '画布设计' --version 0.0.1"
echo ""
