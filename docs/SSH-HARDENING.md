# SSH 加固建议

## 目标

- 减少暴力破解面
- 降低误封和运维中断风险
- 保持可恢复性（控制台/VNC 兜底）

## 推荐基线

1. 新建部署用户，不用 `root` 直登
2. 禁用密码登录，仅允许密钥
3. 安全组仅放行可信来源的 `TCP 22`
4. 保留云控制台登录能力，避免“把自己锁在门外”

## `sshd_config` 建议

示例（按实际环境调整）：

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
```

修改后：

```bash
sshd -t
systemctl restart sshd
```

## 防火墙建议

- 云安全组：允许 `22` 来自办公出口 IP（或堡垒机）
- 系统防火墙：与安全组保持一致，不要双向冲突
- 若使用 NACL（无状态），要同时放行入站和回包端口

## 故障排查（SSH 连不上）

在服务器控制台检查：

```bash
ss -lntp | grep :22
systemctl status sshd
iptables -L INPUT -n -v
nft list ruleset
tcpdump -n -i any 'tcp port 22'
```

若 `tcpdump` 抓不到客户端源 IP 连接包，优先排查云侧安全组/NACL/云防火墙。
