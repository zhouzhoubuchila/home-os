# Home OS Docker 部署

## 1. 准备

- Docker Engine 24+ 与 Docker Compose v2。
- 一个能从 Docker 主机访问的 Home Assistant 地址。
- 公网访问时准备域名，把 DNS 指向 Docker 主机，并在路由器转发 TCP 80/443 与 UDP 443。
- Home Assistant 的“设置 → 系统 → 网络”中配置正确的外部 URL。不要把长期访问令牌写进环境变量。

## 2. 局域网快速启动

在仓库根目录复制 `.env.home-os.example` 为 `.env`，修改 `NAVET_HASS_URL`，然后执行：

```bash
docker compose up -d --build
```

访问 `http://Docker主机IP:8082`。首次打开选择 Home Assistant，并按页面引导完成 OAuth 授权。

如果不需要源码，直接运行已发布的多架构镜像：

```bash
docker run -d --name home-os --restart unless-stopped \
  -p 8082:80 \
  -e NAVET_HASS_URL=http://你的HA地址:8123 \
  -v home-os-data:/data \
  ghcr.io/zhouzhoubuchila/home-os:main
```

## 3. 公网 HTTPS 启动

把 `.env` 中的 `HOME_OS_DOMAIN` 改成自己的域名，然后执行：

```bash
docker compose --env-file .env -f deploy/compose.yaml up -d
```

Caddy 自动申请并续期 HTTPS 证书，WebSocket 无需额外配置。随后访问 `https://你的域名` 完成首次配对。

## 4. 更新与回滚

```bash
docker compose --env-file .env -f deploy/compose.yaml pull
docker compose --env-file .env -f deploy/compose.yaml up -d
docker compose --env-file .env -f deploy/compose.yaml logs -f --tail=100 home-os
docker compose --env-file .env -f deploy/compose.yaml ps
```

健康检查也可以直接执行：

```bash
docker compose --env-file .env -f deploy/compose.yaml exec home-os \
  wget -q -O /dev/null http://127.0.0.1/
```

更新前可备份 `home-os-data` 数据卷。回滚到已知版本时指定旧镜像并保留同一数据卷：

```bash
HOME_OS_IMAGE=ghcr.io/zhouzhoubuchila/home-os:sha-<main-commit-short-sha> \
  docker compose --env-file .env -f deploy/compose.yaml pull home-os
HOME_OS_IMAGE=ghcr.io/zhouzhoubuchila/home-os:sha-<main-commit-short-sha> \
  docker compose --env-file .env -f deploy/compose.yaml up -d home-os
```

不要执行 `down -v`，否则会删除持久化数据卷。

## 5. 安全边界

- Home OS 不保存或要求长期访问令牌；认证走 Navet 原有 OAuth/会话机制。
- `.env`、安装密钥、域名后台密钥均不得提交 Git。
- 不要把 Home Assistant 的 8123 端口直接暴露公网。
- 如果不方便开放 80/443，可把 `home-os:80` 接入现有可信反向代理或 Cloudflare Tunnel，并强制 HTTPS 与访问控制。
- 生产环境不要启用 `NAVET_ALLOW_INSECURE_PROVIDER_TLS`。

## 6. 验证

```bash
docker compose --env-file .env -f deploy/compose.yaml ps
docker compose --env-file .env -f deploy/compose.yaml logs --tail=100 home-os caddy
```

页面应能安装为 PWA；设备状态应通过 WebSocket 实时更新，摄像头和控制动作仍走 Navet Provider。
