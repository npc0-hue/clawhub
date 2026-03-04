#!/bin/bash
# ===========================================
# 一键生成所有密钥和配置文件
# ===========================================

set -e

echo "🔑 生成 ClawHub 所需的所有密钥和配置..."
echo ""

# 创建临时目录
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# 1. 生成 RSA 私钥
echo "1/4 生成 RSA 私钥..."
openssl genrsa 2048 2>/dev/null > "$TEMP_DIR/private.pem"
openssl rsa -in "$TEMP_DIR/private.pem" -pubout 2>/dev/null > "$TEMP_DIR/public.pem"

# 读取私钥（格式化为一行）
PRIVATE_KEY=$(cat "$TEMP_DIR/private.pem" | awk 'NR==1{print; next} {printf "\\n%s", $0}')

# 2. 提取 RSA 参数用于生成 JWKS
echo "2/4 生成 JWKS..."

# 使用 Node.js 生成 JWKS（如果有 node）
if command -v node &> /dev/null; then
    node -e "
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const publicKey = fs.readFileSync('$TEMP_DIR/public.pem', 'utf8');
const keyObject = crypto.createPublicKey(publicKey);
const jwk = keyObject.export({ format: 'jwk' });

const jwks = {
  keys: [{
    ...jwk,
    use: 'sig',
    alg: 'RS256',
    kid: 'clawhub-' + Date.now().toString(36)
  }]
};

console.log(JSON.stringify(jwks));
" > "$TEMP_DIR/jwks.json"
    JWKS=$(cat "$TEMP_DIR/jwks.json")
else
    # 备用方案：创建占位符 JWKS
    echo "⚠️  Node.js 不可用，创建占位符 JWKS"
    JWKS='{"keys":[{"kty":"RSA","use":"sig","alg":"RS256","kid":"clawhub-placeholder"}]}'
fi

# 3. 生成 GitHub OAuth 占位符
echo "3/4 生成 GitHub OAuth 占位符..."
GITHUB_ID="your-github-oauth-id"
GITHUB_SECRET="your-github-oauth-secret"

echo ""
echo "⚠️  GitHub OAuth 需要手动配置："
echo "   1. 访问 https://github.com/settings/developers"
echo "   2. 创建新的 OAuth App"
echo "   3. Homepage URL: http://localhost:3000"
echo "   4. Callback URL: http://localhost:3000/api/auth/callback/github"
echo "   5. 将 Client ID 和 Client Secret 填入 .env.docker"
echo ""

# 4. 生成 .env.docker 文件
echo "4/4 生成配置文件..."

cat > .env.docker << EOF
# ===========================================
# ClawHub Docker 环境配置
# 由 scripts/generate-secrets.sh 自动生成
# ===========================================

# 网络配置
HOST_PORT=3000
SITE_URL=http://localhost:3000

# Convex 配置（自动连接到本地 Convex 容器）
VITE_CONVEX_URL=http://convex:3216
VITE_CONVEX_SITE_URL=http://localhost:3000

# GitHub OAuth（需要手动替换）
AUTH_GITHUB_ID=$GITHUB_ID
AUTH_GITHUB_SECRET=$GITHUB_SECRET

# JWT 密钥（已自动生成）
JWT_PRIVATE_KEY="$PRIVATE_KEY"
JWKS='$JWKS'

# Embeddings（可选）
OPENAI_API_KEY=

# 其他配置
VITE_SOULHUB_SITE_URL=
VITE_SOULHUB_HOST=
VITE_SITE_MODE=production
EOF

# 5. 生成 convex.env 文件
cat > convex.env << EOF
# ===========================================
# Convex 后端环境变量
# 由 scripts/generate-secrets.sh 自动生成
# ===========================================

# GitHub OAuth（需要手动替换）
AUTH_GITHUB_ID=$GITHUB_ID
AUTH_GITHUB_SECRET=$GITHUB_SECRET

# JWT 密钥（已自动生成）
JWT_PRIVATE_KEY="$PRIVATE_KEY"
JWKS='$JWKS'

# Embeddings（可选）
OPENAI_API_KEY=

# 其他配置
SITE_MODE=production
EOF

echo ""
echo "✅ 密钥生成完成！"
echo ""
echo "📁 生成的文件："
echo "   - .env.docker（Docker 环境变量）"
echo "   - convex.env（Convex 后端配置）"
echo ""
echo "⚠️  下一步："
echo "   1. 编辑 .env.docker，填入你的 GitHub OAuth ID 和 Secret"
echo "   2. 运行：docker compose up -d"
echo ""
echo "🚀 快速启动："
echo "   docker compose up -d"
echo ""
