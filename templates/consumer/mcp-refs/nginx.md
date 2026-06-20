# NGINX 文档路径速查

> 数据源：`nginx/documentation` 仓 `content/nginx`（Hugo，137 页，聚焦开源 NGINX + NGINX Plus 核心）。
> 已排除 F5 商业产品线（nim/nic/ngf/nginx-one-console/nginxaas/waf/nap-dos/amplify/agent/solutions）、`includes/` Hugo 片段，以及 2 个重定向占位页（`directives.md`/`variables.md`，指向 nginx.org 外部索引）。

## admin-guide — 配置指南（核心）

| 场景 | path |
|------|------|
| **管理配置文件（指令/块/上下文）** | `nginx/admin-guide/basic-functionality/managing-configuration-files` |
| **运行时控制进程** | `nginx/admin-guide/basic-functionality/runtime-control` |
| **NGINX 控制 REST API** | `nginx/admin-guide/basic-functionality/control-api-reference` |
| **反向代理（proxy_pass）** | `nginx/admin-guide/web-server/reverse-proxy` |
| **Web 服务器 / location 匹配** | `nginx/admin-guide/web-server/web-server` |
| **Web 服务器总览** | `nginx/admin-guide/web-server/_index` |

### load-balancer — 负载均衡

| 场景 | path |
|------|------|
| **负载均衡总览** | `nginx/admin-guide/load-balancer/_index` |
| **TCP/UDP 负载均衡（stream）** | `nginx/admin-guide/load-balancer/tcp-udp-load-balancer` |
| **HTTP 负载均衡** | `nginx/admin-guide/load-balancer/http-load-balancing` |

### 其它模块

| 模块 | path 前缀 | 说明 |
|------|----------|------|
| **内容缓存** | `nginx/admin-guide/content-cache/*` | content-caching |
| **动态模块** | `nginx/admin-guide/dynamic-modules/*` | brotli/geoip2/headers-more/fips 等 |
| **高可用** | `nginx/admin-guide/high-availability/*` | HA/keepalive |
| **安装** | `nginx/admin-guide/installing-nginx/*` | Docker / Open Source / Plus / LTS / 云平台 |
| **邮件代理** | `nginx/admin-guide/mail-proxy/*` | mail module |
| **监控** | `nginx/admin-guide/monitoring/*` | 指标 / 日志 |
| **安全控制** | `nginx/admin-guide/security-controls/*` | securing-http/tcp-traffic-to-upstream（含 ssl/proxy_ssl） |
| **YAML 配置** | `nginx/admin-guide/yaml/*` | NGINX YAML 配置 |

## deployment-guides — 部署指南

| 场景 | path |
|------|------|
| **Docker 部署** | `nginx/admin-guide/installing-nginx/installing-nginx-docker` |
| **AWS 部署** | `nginx/deployment-guides/amazon-web-services/*` |
| **Google Cloud** | `nginx/deployment-guides/google-cloud-platform/*` |
| **Microsoft Azure** | `nginx/deployment-guides/microsoft-azure/*` |
| **全局负载均衡（GSLB）** | `nginx/deployment-guides/global-server-load-balancing/_index` |
| **第三方负载均衡** | `nginx/deployment-guides/load-balance-third-party/_index` |
| **硬件 ADC 迁移** | `nginx/deployment-guides/migrate-hardware-adc/*` |
| **单点登录（SSO）** | `nginx/deployment-guides/single-sign-on/*` |
| **搭建 Demo 环境** | `nginx/deployment-guides/setting-up-nginx-demo-environment` |

## 参考页（根级）

| 场景 | path |
|------|------|
| **发布说明（LTS/CR 模型）** | `nginx/releases` |
| **技术规格** | `nginx/technical-specs` |
| **FIPS 合规** | `nginx/fips-compliance-nginx-plus` |
| **开源组件** | `nginx/open-source-components` |
| **术语表** | `glossary/_index` |

> **提示**：指令（directives）与变量（variables）的完整索引在 [nginx.org](https://nginx.org/en/docs/) 外部站点（本仓库为重定向占位，已排除）。涉及具体指令（如 `proxy_pass`、`location`、`upstream`、`ssl_certificate`）的用法，查 admin-guide 对应 how-to 页即可获得带示例的说明。
