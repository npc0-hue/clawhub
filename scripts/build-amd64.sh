#!/bin/bash
set -e

# 镜像信息
REGISTRY="registry-harbor.yourdomain.com/base"
IMAGE_NAME="clawhub"
PLATFORM="linux/amd64"

# 使用时间戳生成版本号，避免不可变标签冲突
TIMESTAMP=$(date +%Y%m%d%H%M%S)
VERSION="v1-${TIMESTAMP}"

echo "🔨 开始构建 AMD64 架构镜像..."
echo "📦 镜像：${REGISTRY}/${IMAGE_NAME}:${VERSION}"
echo "🖥️  平台：${PLATFORM}"

# 构建并推送镜像（使用 buildx 支持跨平台）
docker buildx build \
  --platform ${PLATFORM} \
  -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} \
  --push \
  .

echo "✅ 镜像构建并推送完成！"
echo "📋 可用的镜像标签："
echo "   - ${REGISTRY}/${IMAGE_NAME}:${VERSION}"

# 验证镜像架构
echo ""
echo "🔍 验证镜像架构..."
docker manifest inspect ${REGISTRY}/${IMAGE_NAME}:${VERSION} | grep -A 5 '"platform"'

echo ""
echo "💡 提示：请更新 K8s deployment 中的镜像版本为：${VERSION}"
