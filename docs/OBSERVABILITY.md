# 可观测性与巡检

## 健康检查

项目提供：

```text
GET /api/health
```

响应示例：

```json
{
  "status": "ok",
  "timestamp": "2026-05-09T08:00:00.000Z",
  "uptimeSec": 12345,
  "node": "v20.x",
  "env": "production"
}
```

## 最小监控建议

1. HTTP 可用性监控  
   - 监控 `/api/health`，间隔 1 分钟
2. 进程监控  
   - PM2 `online` 状态
3. 构建与部署监控  
   - GitHub Actions 失败告警

## 日志检查

```bash
pm2 logs blogs-next --lines 200
pm2 status
```

若未用 PM2，改用 systemd：

```bash
journalctl -u blogs-next -n 200 --no-pager
systemctl status blogs-next
```

## 常见告警规则

- `/api/health` 非 200 持续 3 分钟
- 进程重启次数异常增加
- CI 连续构建失败
- 鉴权接口异常峰值（登录暴力尝试）
