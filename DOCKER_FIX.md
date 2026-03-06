# Docker 部署修复说明

## 问题诊断

### 问题 1: exec format error
**错误信息**: `exec /usr/local/bin/docker-entrypoint.sh: exec format error`

**原因**: 镜像架构与 K8s 节点不匹配（ARM64 vs AMD64）

**解决方案**: 
- 使用 `docker buildx build --platform linux/amd64` 构建 AMD64 架构镜像
- 运行 `./scripts/build-amd64.sh` 自动构建

### 问题 2: Cannot find any route matching /assets/xxx.js
**错误信息**: `ENOENT: no such file or directory, open '/app/public/assets/index-xxx.js'`

**原因**: 
1. `.dockerignore` 排除了 `.output` 目录，导致构建产物未被复制到镜像
2. 静态资源文件丢失

**解决方案**:
- 从 `.dockerignore` 中移除 `.output` 排除规则
- 确保 Dockerfile 复制完整的 `.output` 目录

## 修复内容

### 1. .dockerignore 修复
```diff
- output
+# Keep .output for Docker builds (Nitro output)
+# .output
```

### 2. Dockerfile 修复
- 复制完整的 `.output` 目录（包含 `server/` 和 `public/`）
- 添加健康检查配置

### 3. 构建脚本
- `scripts/build-amd64.sh` - 自动构建 AMD64 架构镜像并推送

## 部署步骤

### 1. 构建并推送镜像

```bash
# 构建 AMD64 架构镜像
./scripts/build-amd64.sh

# 输出示例：
# 📦 镜像：registry-harbor.yafex.cn/base/clawhub:v1-20260305112345
# ✅ 镜像构建并推送完成！
```

### 2. 更新 K8s 部署

```bash
# 方式 1: 使用 kubectl set image
kubectl set image deployment/clawhub \
  clawhub=registry-harbor.yafex.cn/base/clawhub:v1-<时间戳> \
  -n prod

# 方式 2: 编辑 deployment
kubectl edit deployment/clawhub -n prod
# 修改 spec.template.spec.containers[0].image

# 方式 3: 更新配置文件后应用
# 编辑 k8s-deployment.yaml 中的 image 字段
kubectl apply -f k8s-deployment.yaml -n prod
```

### 3. 验证部署

```bash
# 查看 Pod 状态
kubectl get pods -n prod -l app=clawhub

# 查看日志
kubectl logs -f deployment/clawhub -n prod

# 检查健康状态
kubectl rollout status deployment/clawhub -n prod

# 测试访问
kubectl port-forward svc/clawhub-service 3000:80 -n prod
# 然后访问 http://localhost:3000
```

## 文件清单

- `Dockerfile` - Docker 构建配置
- `.dockerignore` - Docker 构建排除文件
- `scripts/build-amd64.sh` - AMD64 镜像构建脚本
- `k8s-deployment.yaml` - K8s Deployment 配置
- `k8s-service.yaml` - K8s Service 配置
- `k8s-ingress.yaml` - K8s Ingress 配置

## 常见问题

### Q: 镜像推送失败 "configured as immutable"
**A**: Harbor 仓库将 `v1` 等标签配置为不可变。解决方案：
- 使用带时间戳的版本号（构建脚本已自动处理）
- 或在 Harbor 中修改项目配置允许覆盖标签

### Q: Pod 一直重启
**A**: 检查：
```bash
# 查看 Pod 事件
kubectl describe pod <pod-name> -n prod

# 查看日志
kubectl logs <pod-name> -n prod --previous
```

### Q: 404 错误 /assets/xxx.js
**A**: 确保：
1. `.dockerignore` 不排除 `.output`
2. Dockerfile 复制了完整的 `.output` 目录
3. 使用最新构建的镜像重新部署

## 环境变量管理（安全建议）

当前配置将敏感信息直接写在 Deployment 中。生产环境建议使用 Kubernetes Secrets：

```bash
# 创建 Secret
kubectl create secret generic clawhub-secrets -n prod \
  --from-literal=AUTH_GITHUB_SECRET=<secret> \
  --from-literal=JWT_PRIVATE_KEY='<key>' \
  --from-literal=OPENAI_API_KEY=<key>

# 更新 Deployment，通过 envFrom 引用
# 见：k8s-deployment-secrets.yaml
```
