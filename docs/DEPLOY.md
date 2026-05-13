# 部署说明

## 1. 服务器准备

- 安装 Node.js 20+
- 安装 `git`
- 推荐使用 `pm2` 管理进程
- 当前生产目录建议使用：`/root/apps/blogs-next`
- 当前生产运行建议使用：`pm2 + .next/standalone/server.js`

> 重要：由于生产使用的是 `output: "standalone"`，每次构建后必须确保 `public/` 和 `.next/static/`
> 已同步到 `.next/standalone/` 下，否则页面 HTML 虽然能打开，但 CSS、图片、`manifest.json` 等静态资源会 404。
> 当前仓库已经通过 `npm run build` 自动完成这一步。

首次部署：

```bash
mkdir -p /root/apps
cd /root/apps
git clone https://github.com/xbh-ux/blogs.git blogs-next
cd blogs-next
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npm run build
PORT=8081 HOSTNAME=0.0.0.0 NODE_ENV=production pm2 start ./.next/standalone/server.js --name blogs-next --cwd /root/apps/blogs-next --update-env
pm2 save
pm2 startup
```

## 2. 日常发布（手动）

```bash
cd /root/apps/blogs-next
git fetch origin main
git checkout main
git reset --hard origin/main
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npm run build
pm2 restart blogs-next --update-env
pm2 save
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

推荐值：

```text
DEPLOY_HOST=175.178.170.206
DEPLOY_USER=root
DEPLOY_PORT=22
DEPLOY_PATH=/root/apps/blogs-next
DEPLOY_PM2_NAME=blogs-next
```

> 说明：当前工作流已支持 `push main` 自动部署，同时保留 `Run workflow` 手动触发入口。

## 4. 回滚

```bash
cd /root/apps/blogs-next
git log --oneline -n 10
git reset --hard <commit_sha>
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npm run build
pm2 restart blogs-next --update-env
pm2 save
```

## 5. 构建失败排查

- 先执行 `npm run typecheck`
- 再执行 `npm run build`
- 查看 PM2 日志：

```bash
pm2 logs blogs-next --lines 200
```

- 样式丢失、图片 404、`manifest.json` 返回 404 页面时，优先检查：

```bash
ls -lah .next/standalone/public
ls -lah .next/standalone/.next/static
curl -I http://127.0.0.1:8081/_next/static/css/*.css
curl -I http://127.0.0.1:8081/manifest.json
```

- 如遇 `package-lock.json` 与 `package.json` 短暂不同步，可先使用：

```bash
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
```
