# Embeddings 配置指南

## 概述

ClawHub 支持多种 Embeddings 方案用于向量搜索。如果不需要向量搜索，可以完全跳过此配置。

---

## 方案 1: 不使用向量搜索（最简单）

**适合：** 个人使用、小型项目、测试环境

**配置：**
```bash
# .env.local 或 .env.docker
# 留空所有 Embeddings 配置
OPENAI_API_KEY=
```

**效果：**
- ✅ 应用正常运行
- ✅ 搜索使用传统文本匹配
- ❌ 无向量搜索功能

---

## 方案 2: OpenAI（官方推荐）

**适合：** 生产环境、需要最佳搜索质量

**配置：**
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

**获取 API Key：**
1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 复制到配置文件

**费用：**
- 使用 `text-embedding-3-small` 模型
- 约 $0.02 / 1M tokens
- 非常便宜，适合大多数场景

---

## 方案 3: 本地部署（完全免费）

**适合：** 数据隐私要求高、有大量搜索需求

### 3.1 Ollama

```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 下载 embedding 模型
ollama pull nomic-embed-text

# 配置
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
```

### 3.2 LocalAI

```bash
# Docker 运行 LocalAI
docker run -p 8080:8080 localai/localai

# 配置
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_API_KEY=localai
```

### 3.3 vLLM

```bash
# 安装 vLLM
pip install vllm

# 运行
python -m vllm.entrypoints.openai.api_server \
  --model BAAI/bge-small-en-v1.5

# 配置
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=vllm
```

---

## 方案 4: 其他云服务商

### 4.1 Google Vertex AI

```bash
OPENAI_BASE_URL=https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/endpoints/openapi
OPENAI_API_KEY=your-google-api-key
```

### 4.2 Azure OpenAI

```bash
OPENAI_BASE_URL=https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT
OPENAI_API_KEY=your-azure-api-key
```

### 4.3 DeepSeek

```bash
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=your-deepseek-api-key
```

### 4.4 Moonshot (Kimi)

```bash
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_API_KEY=your-moonshot-api-key
```

---

## Docker 配置示例

### 使用 OpenAI

```bash
# .env.docker
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 使用本地 Ollama

```bash
# .env.docker
OPENAI_BASE_URL=http://host.docker.internal:11434/v1
OPENAI_API_KEY=ollama
```

**注意：** 需要确保 Docker 可以访问主机网络：
```bash
# macOS/Windows
# Docker Desktop 默认支持 host.docker.internal

# Linux
docker run --add-host=host.docker.internal:host-gateway ...
```

---

## 验证配置

### 测试 OpenAI API

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### 测试本地服务

```bash
curl http://localhost:11434/api/tags
```

### 测试应用

启动应用后，访问搜索页面，查看是否正常工作。

---

## 常见问题

### Q: 必须配置 Embeddings 吗？

**A:** 不必须。留空即可，应用会降级到文本搜索。

### Q: 哪个模型最好？

**A:** 
- **最佳质量**: OpenAI `text-embedding-3-large`
- **性价比**: OpenAI `text-embedding-3-small`
- **免费**: 本地部署（需要 GPU）

### Q: 可以中途切换吗？

**A:** 可以。修改配置后重启应用即可。

### Q: 向量数据会丢失吗？

**A:** 切换模型后，需要重新索引现有数据。

---

## 推荐配置

### 个人使用
```bash
# 不使用向量搜索
OPENAI_API_KEY=
```

### 小团队
```bash
# OpenAI 小模型
OPENAI_API_KEY=sk-xxx
# 使用 text-embedding-3-small
```

### 生产环境
```bash
# OpenAI 大模型 或 本地部署
OPENAI_API_KEY=sk-xxx
# 或
OPENAI_BASE_URL=http://localhost:11434/v1
```

---

**需要帮助？** 查看完整文档或提交 Issue。
