# 部署说明

## 1. 服务器准备

- 安装 Node.js 20+
- 安装 `git`
- 推荐使用 `pm2` 管理进程

首次部署：

```bash
git clone https://github.com/xbh-ux/blogs.git
cd blogs
npm ci
npm run build
pm2 start npm --name blogs-next -- start
pm2 save
```

## 2. 日常发布（手动）

```bash
cd /path/to/blogs
git pull --ff-only origin main
npm ci
npm run build
pm2 restart blogs-next
```

## 3. GitHub Actions 手动部署

仓库已提供 `.github/workflows/deploy.yml`，触发方式：

1. 打开 GitHub Actions -> `Deploy`
2. 点击 `Run workflow`

需要在仓库 Secrets 配置：

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`（可选，默认 22）
- `DEPLOY_PATH`
- `DEPLOY_PM2_NAME`（可选，默认 `blogs-next`）
- `DEPLOY_SERVICE_NAME`（可选，未使用 pm2 时用于 systemd）

## 4. 回滚

```bash
cd /path/to/blogs
git log --oneline -n 10
git reset --hard <commit_sha>
npm ci
npm run build
pm2 restart blogs-next
```

## 5. 构建失败排查

- 先执行 `npm run typecheck`
- 再执行 `npm run build`
- 查看 PM2 日志：

```bash
pm2 logs blogs-next --lines 200
```
