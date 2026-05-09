# blogs-next

基于 Next.js 16 的个人博客项目，包含：

- 首页仪表盘布局
- 时间线 / 相册 / 读书 / 随记 / 友链
- 基于 NextAuth 的管理后台（文章增删改查）
- Markdown + Frontmatter 内容管理

## 环境要求

- Node.js 20+
- npm 10+

## 环境变量

复制并编辑：

```bash
cp .env.example .env.local
```

关键变量：

- `AUTH_SECRET` 或 `NEXTAUTH_SECRET`：NextAuth 密钥
- `ADMIN_PASSWORD_HASH`：管理员密码 bcrypt 哈希（推荐）
- `ADMIN_PASSWORD`：兼容旧配置（不推荐，仅迁移）
- `ADMIN_LOGIN_MAX_ATTEMPTS`：登录最大失败次数（默认 5）
- `ADMIN_LOGIN_WINDOW_MINUTES`：登录限流窗口分钟数（默认 15）
- `TRUST_PROXY_HEADERS`：仅在可信反向代理场景设为 `true`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`：可选，启用跨实例限流

生成 bcrypt 哈希示例：

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('your-password',12).then(console.log)"
```

## 本地开发

```bash
npm ci
npm run dev
```

## 质量检查

```bash
npm run lint
npm run typecheck
npm run test
```

完整检查（含构建与审计）：

```bash
npm run verify
```

## 构建与运行

普通构建：

```bash
npm run build
npm run start
```

Windows 非 NTFS 目录（例如某些挂载盘）：

```bash
npm run build:ntfs-copy
```

## 可视化回归检查

先启动应用，再运行：

```bash
npm run visual:check
```

可通过 `VISUAL_BASE_URL` 指向目标地址：

```bash
VISUAL_BASE_URL=http://127.0.0.1:3000 npm run visual:check
```

截图输出：

```text
output/playwright/home-layout-check.png
```

## 目录说明

- `app/`：Next App Router 页面与 API 路由
- `components/`：通用组件与后台组件
- `lib/`：文章解析、输入校验、安全/限流工具
- `posts/`：Markdown 源文与文章资源
- `public/`：静态资源
- `scripts/`：构建/验证脚本
- `.github/workflows/`：CI 与手动部署流水线

## 运维文档

- [部署说明](docs/DEPLOY.md)
- [SSH 加固建议](docs/SSH-HARDENING.md)
- [可观测性与巡检](docs/OBSERVABILITY.md)
