# Elysia 文档路径速查

> 数据源：`elysiajs/documentation` 仓 `docs/`（VitePress，87 页，11 分类）。
> 已排除版本公告 `blog/**`、在线工具 `playground/**` 及纯导航/插画着陆页（`blog.md`/`illust.md`/`table-of-content.md`）。

| 场景 | path |
|------|------|
| **首页 / 介绍** | `index` |
| **快速开始** | `quick-start` |
| **一览概览** | `at-glance` |
| **核心概念** | `key-concept` |
| **JIT 编译器原理** | `internal/jit-compiler` |

### essential — 核心概念（6）

| 场景 | path |
|------|------|
| **路由** | `essential/route` |
| **Handler / Context** | `essential/handler` |
| **生命周期（hooks）** | `essential/life-cycle` |
| **参数校验** | `essential/validation` |
| **插件系统** | `essential/plugin` |
| **最佳实践** | `essential/best-practice` |

### patterns — 进阶模式（15）

| 场景 | path |
|------|------|
| **配置** | `patterns/configuration` |
| **Cookie** | `patterns/cookie` |
| **错误处理** | `patterns/error-handling` |
| **生命周期 trace** | `patterns/trace` |
| **OpenAPI** | `patterns/openapi` |
| **OpenTelemetry** | `patterns/opentelemetry` |
| **WebSocket** | `patterns/websocket` |
| **Macro** | `patterns/macro` |
| **挂载 / 子应用** | `patterns/mount` |
| **部署** | `patterns/deploy` |
| **TypeBox** | `patterns/typebox` |
| **TypeScript 推断** | `patterns/typescript` |
| **单元测试** | `patterns/unit-test` |
| **扩展 Context** | `patterns/extends-context` |
| **全栈 Dev Server** | `patterns/fullstack-dev-server` |

### plugins — 官方插件（13）

| 场景 | path |
|------|------|
| **插件总览** | `plugins/overview` |
| **JWT 认证** | `plugins/jwt` |
| **Bearer Token** | `plugins/bearer` |
| **CORS** | `plugins/cors` |
| **Swagger** | `plugins/swagger` |
| **OpenAPI** | `plugins/openapi` |
| **HTML** | `plugins/html` |
| **Static 静态文件** | `plugins/static` |
| **Cron 定时任务** | `plugins/cron` |
| **Server Timing** | `plugins/server-timing` |
| **OpenTelemetry** | `plugins/opentelemetry` |
| **GraphQL Apollo** | `plugins/graphql-apollo` |
| **GraphQL Yoga** | `plugins/graphql-yoga` |

### eden — 端到端类型安全客户端（11）

| 场景 | path |
|------|------|
| **Eden 总览** | `eden/overview` |
| **Eden 安装** | `eden/installation` |
| **Treaty 客户端（推荐）** | `eden/treaty/overview` |
| Treaty 参数 | `eden/treaty/parameters` |
| Treaty 响应 | `eden/treaty/response` |
| Treaty 配置 | `eden/treaty/config` |
| Treaty 单元测试 | `eden/treaty/unit-test` |
| Treaty WebSocket | `eden/treaty/websocket` |
| Treaty Legacy（旧版） | `eden/treaty/legacy` |
| **Eden Fetch** | `eden/fetch` |
| **Eden 测试** | `eden/test` |

### integrations — 运行时 / 框架集成（17）

| 场景 | path |
|------|------|
| **速查表（Cheat Sheet）** | `integrations/cheat-sheet` |
| **Node.js 运行时** | `integrations/node` |
| **Deno 运行时** | `integrations/deno` |
| **Cloudflare Workers** | `integrations/cloudflare-worker` |
| **Vercel** | `integrations/vercel` |
| **Netlify** | `integrations/netlify` |
| **Next.js** | `integrations/nextjs` |
| **Nuxt** | `integrations/nuxt` |
| **Astro** | `integrations/astro` |
| **SvelteKit** | `integrations/sveltekit` |
| **TanStack Start** | `integrations/tanstack-start` |
| **Expo** | `integrations/expo` |
| **Drizzle ORM** | `integrations/drizzle` |
| **Prisma** | `integrations/prisma` |
| **Better Auth** | `integrations/better-auth` |
| **AI SDK** | `integrations/ai-sdk` |
| **React Email** | `integrations/react-email` |

### tutorial — 交互式教程（20）

入门系列路径前缀 `tutorial/getting-started/{name}/index`：`your-first-route` / `handler-and-context` / `life-cycle` / `plugin` / `validation` / `status-and-headers` / `guard` / `encapsulation`。

模式系列 `tutorial/patterns/{name}/index`：`cookie` / `error-handling` / `extends-context` / `macro` / `standalone-schema` / `validation-error`。

特性系列 `tutorial/features/{name}/index`：`end-to-end-type-safety` / `mount` / `openapi` / `unit-test`。

> **示例**：`get_elysia_doc({ path: "tutorial/getting-started/life-cycle/index" })`
