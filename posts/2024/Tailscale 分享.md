---
title: Tailscale 分享
date: 2026-03-15 18:00:00
tags:
  - 网络
  - VPN
  - Docker
categories:
  - 技术分享
cover: /images/background1.png
---

Tailscale 是一种基于 [WireGuard](https://www.wireguard.com/) 的虚拟组网工具，**最大的区别在于 Tailscale 是在用户态实现了 WireGuard 协议，而 Netmaker 直接使用了内核态的 WireGuard**

# 安装
## Debian/Ubuntu安装
```bash
1.添加tailscale仓库和gpg密钥
# 下载并导入 GPG 密钥（保存到系统密钥环）
curl -fsSL https://pkgs.tailscale.com/stable/debian/bullseye.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg > /dev/null
# 添加 Tailscale APT 仓库（适用于 Debian 11+ / Ubuntu 20.04+，旧版本需替换为对应 codename，如 buster、focal）
echo "deb [signed-by=/usr/share/keyrings/tailscale-archive-keyring.gpg] https://pkgs.tailscale.com/stable/debian bullseye main" | sudo tee /etc/apt/sources.list.d/tailscale.list > /dev/null


2.安装tailscale
sudo apt update && sudo apt install tailscale -y
```

## RHEL/CentOS/Fedora 系列
```bash
# 创建 Tailscale YUM 仓库配置文件
sudo tee /etc/yum.repos.d/tailscale.repo << EOF
[tailscale]
name=Tailscalebaseurl=https://pkgs.tailscale.com/stable/centos/\$releasever/\$basear
chenabled=1
gpgcheck=1
gpgkey=https://pkgs.tailscale.com/stable/centos/\$releasever/\$basearch/repo.gpg
EOF

# 安装 Tailscale（CentOS 7 使用 yum，Rocky/Fedora 使用 dnf）
sudo dnf install tailscale -y # 或 sudo yum install tailscale -y
```

# 初始化与登录
```bash
1.启动服务
# 启动服务并设置开机自启（systemd 系统）
sudo systemctl enable --now tailscaled

2.登录并加入网络
tailscale up

此时会输出一个登录链接（如 `https://login.tailscale.com/a/xxxxxx`），需在浏览器中打开并完成身份验证（支持 Google、GitHub、Microsoft 等账号）
```

{% asset_img 'Tailscale 分享-20260315184630.png' %}
{% asset_img 'Tailscale 分享-20260315184701.png' %}

# headscale搭建
```bash
官网：
https://headscale.net/stable/

参考文档：
https://blog.csdn.net/weixin_47540149/article/details/157373807

准备工作：
云服务器(带公网ip,安装docker)
域名

Headscale 是 Tailscale 控制服务器的开源实现，允许你搭建私有的节点服务器
- ✅ 完全自托管 - 数据完全掌控在自己手中
- ✅ 无设备限制 - 不受官方免费版 20 台设备限制
- ✅ 无流量限制 - 所有流量走自己的服务器
- ✅ 开源免费   - MIT 协议，完全免费

技术栈：
- Headscale - 控制平面服务器
- DERP - 中继服务器（用于 NAT 穿透失败时）
- Caddy - 反向代理和 SSL 证书自动管理
- Headscale-UI - Web 管理界面
- Docker Compose - 容器编排
```

{% asset_img 'Tailscale 分享-20260316221310.png' %}
{% asset_img 'Tailscale 分享-20260316204321.png' %}
{% asset_img 'Tailscale 分享-20260316204655.png' %}

```bash
headscale-docker/
├── docker-compose.yml          # Docker Compose 配置
├── config/                     # 配置文件目录
│   ├── headscale/
│   │   ├── config.yaml        # Headscale 主配置
│   │   └── derp.yaml          # DERP 服务器配置
│   └── caddy/
│       └── Caddyfile          # Caddy 反向代理配置
├── data/                       # 数据目录
│   ├── headscale/             # Headscale 数据
│   ├── caddy/                 # Caddy 数据和证书
│   └── headscale-ui/          # UI 数据
├── scripts/                    # 运维脚本
└── backups/                    # 备份文件目录

root@derp:~# mkdir -p headscale-docker
root@derp:~/headscale-docker# mkdir -p {config,data,scripts,backups}
root@derp:~/headscale-docker# cat docker-compose.yml
services:
  # Headscale 主服务
  headscale:
    image: headscale/headscale:latest
    container_name: headscale
    hostname: headscale
    restart: unless-stopped
    ports:
      - "9091:9091"        # Metrics 端口
      - "50443:50443"      # GRPC 端口
    volumes:
      - ./config/headscale:/etc/headscale
      - ./data/headscale:/var/lib/headscale
    command: serve
    networks:
      - headscale-net
    healthcheck:
      test: ["CMD", "headscale", "version"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # DERP 中继服务器
  derper:
    image: fredliang/derper:latest
    container_name: derper
    restart: unless-stopped
    ports:
      - "3478:3478/tcp"
      - "3478:3478/udp"
    environment:
      - DERP_ADDR=:3478
      - DERP_CERT_MODE=letsencrypt
      - DERP_DOMAIN=derp.example.com
      - DERP_VERIFY_CLIENTS=false
    networks:
      - headscale-net
    healthcheck:
      test: ["CMD-SHELL", "grep -q ':0D96' /proc/net/tcp6 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Headscale UI
  headscale-ui:
    image: ghcr.io/gurucomputing/headscale-ui:latest
    container_name: headscale-ui
    restart: unless-stopped
    environment:
      - HEADSCALE_URL=http://headscale:8080
    networks:
      - headscale-net
    depends_on:
      headscale:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "nc -z localhost 8080 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Caddy 反向代理
  caddy:
    image: caddy:2
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"    # HTTP/3
    volumes:
      - ./config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./data/caddy/data:/data
      - ./data/caddy/config:/config
      - ./data/caddy/logs:/var/log/caddy
    networks:
      - headscale-net
    environment:
      - ACME_AGREE=true
    depends_on:
      headscale:
        condition: service_healthy
```

# Headscale 配置文件
```yaml
# 监听地址
listen_addr: 0.0.0.0:8080

# 公开访问地址（必须是 HTTPS）
server_url: https://headscale.xiangbohan.top

# 数据库配置
database:
  type: sqlite3
  sqlite:
    path: /var/lib/headscale/db.sqlite

# 私钥路径
private_key_path: /var/lib/headscale/private.key
noise:
  private_key_path: /var/lib/headscale/noise_private.key

# IP 地址段
prefixes:
  v4: 100.64.0.0/10
  v6: fd7a:115c:a1e0::/48
  allocation: sequential

derp:
  server:
    enabled: false
  urls:
    - https://controlplane.tailscale.com/derpmap/default
  paths:
    - /etc/headscale/derp.yaml
  auto_update_enabled: true
  update_frequency: 24h

disable_check_updates: false
ephemeralnodeinactivitytimeout: 30m
log:
  level: info

logtail:
  enabled: false

ACLs: {}

oidc:
  only_start_if_oidc_is_available: true

# DNS 配置
dns:
  nameservers:
    global:
      - 8.8.8.8           # 公共 DNS
      - 8.8.4.4
      - 1.1.1.1
  magic_dns: true
  base_domain: hs.xiangbohan.top
  search_domains:
    - xiangbohan.top

# Ephemeral nodes（临时节点）
ephemeral_node_inactivity_timeout: 30m

# 节点过期时间（0 表示永不过期）
node_expiry: 0s

# 随机化客户端端口
randomize_client_port: false

# 时区
timezone: "Asia/Shanghai"

# GRPC 配置
grpc_listen_addr: 0.0.0.0:50443
grpc_allow_insecure: false

# Unix socket 配置（用于本地管理）
unix_socket: /var/run/headscale/headscale.sock
unix_socket_permission: "0770"
```

# DERP中继服务器配置
```bash
作用：当两个节点无法直接连接时，通过derp转发流量
root@derp:~/headscale-docker/config/headscale# cat derp.yaml
# DERP 服务器配置
regions:
  900:
    regionid: 900
    regioncode: "myserver"
    regionname: "中继节点"
    nodes:
      - name: "txyun"
        regionid: 900
        hostname: "derp.xiangbohan.top"
        ipv4: "175.178.170.206"
```

# 反向代理配置-caddy
```bash
root@derp:~/headscale-docker/config/caddy# cat Caddyfile
# Caddy 反向代理配置
# 全局选项
{
    # 邮箱地址，用于 Let's Encrypt 证书申请
    email 2663437917@qq.com

    # 日志配置
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format json
        level INFO
    }
}

# DERP 中继服务器（通过 HTTPS 443 端口）
derp.xiangbohan.top {
    reverse_proxy derper:3478 {
        transport http {
            keepalive 90s
            keepalive_idle_conns 10
        }
    }
    log {
        output file /var/log/caddy/derp.log {
            roll_size 50mb
            roll_keep 3
        }
    }
}

# Headscale API
headscale.xiangbohan.top {
    encode gzip zstd
    header {
        Access-Control-Allow-Origin "https://headscale-ui.example.com"
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        Access-Control-Allow-Headers "Authorization, Content-Type"
    }
    @options {
        method OPTIONS
    }
    respond @options 204
    reverse_proxy headscale:8080 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}

# Headscale UI
headscale-ui.xiangbohan.top {
    encode gzip zstd
    handle /admin {
        redir https://{host}/web permanent
    }
    reverse_proxy headscale-ui:80
}
```

# 启动与管理
```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps
```

{% asset_img 'Tailscale 分享-20260316205651.png' %}

# 密钥管理
```bash
1.api key（用于web ui）
root@derp:~/headscale-docker# docker exec headscale headscale apikeys create --expiration 87600h
hskey-api-ZYBXcF9tQ-Z_-LDc4GxnfVFXgGRC3CPZIoHmX8Wi3nicv-1OX8kjnvWZl9bcZ37DJMfD8_LJGsSXU

2.Preauth key（用于设备注册）
root@derp:~/headscale-docker# docker exec headscale headscale users create xbh
User created
root@derp:~/headscale-docker# docker exec headscale headscale preauthkeys create \
  --user 1 \
  --expiration 87600h \
  --reusable
hskey-auth-TQd_QQi-TQ05-7m906vSxe5mThpq2Gt338ldXR-XtIc3jyEiAX9RYfPeh19STbfq8tEFe0-6oMGlH
```

{% asset_img 'Tailscale 分享-20260316215745.png' %}
{% asset_img 'Tailscale 分享-20260316220416.png' %}
{% asset_img 'Tailscale 分享-20260316220434.png' %}
{% asset_img 'Tailscale 分享-20260318195009.png' %}
{% asset_img 'Tailscale 分享-20260318195200.png' %}