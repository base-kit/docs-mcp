# MCP 文档优先开发规范（消费方）

> 本文件是**消费方项目**规范：你的项目已通过 docs-mcp 注册了本地文档 MCP 服务（`.mcp.json`），用 Vue/Vite/Pinia 等框架开发时，**必须先查本地 MCP 文档再写代码**，不依赖训练知识或网络搜索。
> 由 `docs-mcp config --with-claude-md` 生成到本项目。`{prefix}` 即各服务的工具前缀（如 `vue`、`vite`）。

---

## MCP 文档优先原则

编写或修改前端代码时，**必须优先使用本地 MCP 服务**获取 API 和实现方案，不要依赖训练知识或网络搜索。

### 强制工作流：先查后写

1. **搜索** → `search_{prefix}_docs(query)` 查找相关文档
2. **阅读** → `get_{prefix}_doc(path)` 获取完整 API 签名和示例
3. **编写代码** → 基于文档内容编写，不要凭记忆写

**跳过 MCP 查询直接写代码，视为违规。**

> 路径速查：`.claude/mcp-refs/{name}.md`（由 `config --with-claude-md` 一并拷入）记录每个服务常用场景的 path，查文档前先看速查确认 path，再调 `get_{prefix}_doc`。

---

## MCP 服务总览

> 服务列表可用 `npx docs-mcp preset list` 动态查询。下表是当前快照，每行：**服务**（`.mcp.json` 注册名）/ **工具前缀** / **模式**。

| 服务 | 工具前缀 | 模式 |
|---|---|---|
| `vue-docs` | `vue` | fulltext |
| `vite-docs` | `vite` | fulltext |
| `router-docs` | `router` | fulltext |
| `pinia-docs` | `pinia` | fulltext |
| `unocss-docs` | `unocss` | fulltext |
| `element-plus-docs` | `element` | fulltext |
| `vant-docs` | `vant` | fulltext |
| `vitest-docs` | `vitest` | fulltext |
| `oxc-docs` | `oxc` | fulltext |
| `axios-docs` | `axios` | fulltext |
| `dayjs-docs` | `dayjs` | fulltext |
| `node-docs` | `node` | fulltext |
| `pnpm-docs` | `pnpm` | fulltext |
| `sass-docs` | `sass` | fulltext |
| `vue-i18n-docs` | `vue-i18n` | fulltext |
| `elysia-docs` | `elysia` | fulltext |
| `redis-docs` | `redis` | **hybrid** |
| `nginx-docs` | `nginx` | fulltext |
| `rolldown-docs` | `rolldown` | fulltext |
| `tsdown-docs` | `tsdown` | fulltext |
| `drizzle-docs` | `drizzle` | **hybrid** |
| `bun-docs` | `bun` | **hybrid** |

### 使用方式（每个服务 4 工具）

```
search_{prefix}_docs(query, category?, limit?)   — 全文 / 语义搜索
get_{prefix}_doc(path)                            — 获取完整文档页
list_{prefix}_doc_sections(category?)             — 浏览目录结构
grep_{prefix}_docs(pattern, category?, limit?)   — 正则搜索页面内容（找某 API 出现在哪些页）
```

> ⚠️ 注意第三个工具名含 `_doc`（如 `list_node_doc_sections`），不是 `list_{prefix}_sections`。

**Hybrid 模式**（redis/bun/drizzle）：BM25（0.4）+ `all-MiniLM-L6-v2` 向量（0.6）融合，对语义近似查询更强（如 `bunx` vs `bun run`）。

---

## 已验证的关键最佳实践

> 以下为从 MCP 文档中验证的核心要点，涉及具体 API 时仍需 `search_{prefix}_docs` 再 `get_{prefix}_doc`。

### Vue
- `defineProps` / `defineEmits` / `withDefaults` 是编译器宏，**无需 import**
- `app.config.errorHandler` 应在 `main.ts` 中配置
- 统一使用 **Composition API + `<script setup>`**

### Vite 8
- `build.target` 默认 `baseline-widely-available`，**不要手动覆盖**
- `resolve.tsconfigPaths: true` 可替代手动 `resolve.alias` + `fileURLToPath`
- `esbuild` 配置项已废弃，改用 oxc

### Vitest
- **Vite 8 项目必须用 vitest ≥4.1**：4.1 才支持 Vite 8，否则 `tsconfigPaths` 失效、`@/` 别名解析失败
- `vite.config.ts` 用 `test` 字段需顶部加 `/// <reference types="vitest/config" />`（`defineConfig` 来自 `vite` 时）

### Vue Router 5
- v4→v5 无 breaking changes（未使用 unplugin-vue-router 时）
- `scrollBehavior` + `router.beforeEach` 是标准模式

### Pinia 3
- 推荐 Setup Store 语法：`defineStore('id', () => {...})`
- `storeToRefs()` 解构保持响应性，actions 可直接解构
- v3 废弃了 `defineStore({ id: '...' })` 语法

### UnoCSS
- **`presetUno` 已废弃**，使用 `presetWind3` 替代
- `presetAttributify`、`presetIcons` 已内置在 `unocss` 包中，无需单独安装
- `presetIcons` 在 Node/Vite 构建模式**不要配 `cdn`**（那是 Runtime 模式专用）；用图标时 `npm i -D @iconify-json/<collection>`

### Node.js
- 内置模块一律用 `node:` 前缀（如 `node:fs/promises`），避免与同名 npm 包冲突
- 文件操作优先 `node:fs/promises`（Promise API），回调式 `node:fs` 仅在特殊场景用
- Node 24 支持 `node --experimental-strip-types` 直接跑 `.ts`（无需编译）

### pnpm
- 工作区配置在 `pnpm-workspace.yaml`（v10 起 settings 也迁移至此），`.npmrc` 主要管认证
- 命令仍是 `pnpm install` / `pnpm add` / `pnpm remove`（**不要写** `pnpm i xxx` 装包，用 `pnpm add xxx`）
- `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 控制哪些包能跑 postinstall（v10 安全增强）

### Axios
- 创建实例用 `axios.create({ baseURL, timeout })`，不要每次 `axios.get` 带全配置
- 取消请求统一用 `AbortController`（`signal` 选项），`CancelToken` 已废弃
- 拦截器：`axios.interceptors.request.use(onFulfilled, onRejected)`

### Day.js
- 文档源已切换为官方文档仓库 `dayjs-website/docs`（154 页，**非** dayjs 主仓 README —— 主仓 docs 已废弃）
- dayjs 不可变：`.add()` / `.subtract()` 返回新实例，不改原对象
- 插件需先 `dayjs.extend(plugin)` 再使用（如 `duration`、`timezone`、`utc`、`customParseFormat`）
- 格式化 token 查 `parse/string-format`，时区查 `plugin/timezone`

### Sass
- 现代模块化用 `@use`（带命名空间），**`@import` 已废弃**（查 `documentation/breaking-changes/import`）；跨文件转发用 `@forward`
- 内置函数走模块：`@use "sass:color"` 后 `color.adjust($c, $lightness: 10%)`，**不要用** 全局 `lighten()`（已废弃）
- 除法用 `math.div()`（`/` 作除法已废弃，查 `documentation/breaking-changes/slash-div`）
- 复用片段用 `@mixin` + `@include`，支持 `@content` 传内容块
- 插值用 `#{}`，运算符见 `documentation/operators/numeric`

### Vue I18n
- 推荐用 **Composition API**：`useI18n()`（`t` / `locale` / `te` / `tm`），Legacy API 已不推荐
- 消息语法用 `{name}` 插值、`{count} plural` 复数；查 `guide/essentials/syntax`
- Composition API 中需 `<i18n-t>` 组件做组件插值（`t()` 只返回字符串）
- SFC 本地化用 `<i18n lang="yaml">` 块定义消息（需 `@intlify/unplugin-vue-i18n`）
- locale 切换：`useI18n().locale.value = 'en'`；语言包懒加载见 `guide/advanced/lazy`
- 消息函数（`antme`）与自定义格式见 `guide/advanced/function` / `format`

### Elysia
- Bun 优先的 TypeScript 后端框架（亦支持 Node.js）；快速上手查 `quick-start`，核心概念查 `essential/*`
- 路由用 HTTP 方法链式定义：`new Elysia().get('/path', handler)`；路径参数 `:id`，请求体校验用 `body: t.Object({...})`（TypeBox）
- 生命周期 hooks：`.onRequest` / `.on('beforeHandle')` / `.afterHandle` / `.onError`，查 `essential/life-cycle`
- 端到端类型客户端 Eden Treaty：`import { treaty } from '@elysia/eden'`，查 `eden/treaty/overview`
- 插件用 `.use(plugin)` 装配；官方插件（jwt / cors / swagger / cron 等）查 `plugins/*`
- 进阶模式（WebSocket / OpenAPI / OpenTelemetry / Macro 等）查 `patterns/*`

### Redis
- 命令参考统一路径 `commands/{命令名小写连字符}`（如 `commands/set`、`commands/xadd`、`commands/xreadgroup`），frontmatter 含结构化 `arguments` / `since`（引入版本）/ `complexity` / `acl_categories`
- **版本敏感**：Redis 迭代快，涉及新命令/新参数时**务必 `get_redis_doc` 查 `since` 字段确认**（如 `SET ... IFEQ/IFNE since: 8.4.0`、`XADD ... KEEPREF/DELREF/ACKED since: 8.x`、`AR*` 族为 Redis 8 Active-Active 数组），不要依赖训练知识
- Stream 命令 `X*`（xadd/xread/xreadgroup/xrange/xack/xpending/xclaim/xlen/xinfo）；数据类型说明查 `develop/data-types/streams/_index`
- 向量数据库 / AI 查 `develop/ai/search-and-query/query/vector-search`（FT.SEARCH KNN，HNSW/FLAT 索引）
- Pub/Sub：`commands/publish` / `commands/subscribe` / `commands/pubsub`

### NGINX
- 配置核心在 `nginx/admin-guide/*`（10 模块）：basic-functionality / load-balancer / web-server / content-cache / security-controls / dynamic-modules / high-availability / installing-nginx / monitoring / mail-proxy
- 反向代理查 `nginx/admin-guide/web-server/reverse-proxy`（`proxy_pass`）；TCP/UDP 负载均衡查 `nginx/admin-guide/load-balancer/tcp-udp-load-balancer`（`stream {}` 块）
- 指令/块语法、location 匹配查 `nginx/admin-guide/basic-functionality/managing-configuration-files` 与 `nginx/admin-guide/web-server/web-server`
- 部署查 `nginx/deployment-guides/*`（Docker / AWS / GCP / Azure / GSLB）；发布模型（LTS/CR）查 `nginx/releases`
- **指令完整索引在外部** [nginx.org](https://nginx.org/en/docs/)（本仓 `directives.md`/`variables.md` 为重定向占位，已排除）；具体指令用法查对应 admin-guide how-to 页

### Rolldown
- Vite 8 底层的 Rust 打包器（基于 Oxc，兼容 Rollup 插件 API）；入门查 `guide/*`，API 查 `apis/*`（bundler-api / cli / plugin-api）
- 代码分割（自动/手动）查 `in-depth/automatic-code-splitting` 与 `in-depth/manual-code-splitting`；tree shaking 查 `in-depth/dead-code-elimination`
- 插件 Hook Filters（Rust 侧跳过调用优化）查 `apis/plugin-api/hook-filters`；源码转换（sourcemap）查 `apis/plugin-api/transformations`
- 内置插件（bundle-analyzer / replace）查 `builtin-plugins/*`

### tsdown
- 基于 Rolldown 的 TypeScript 库打包工具（tsup 继任者）；入门查 `guide/*`（含 `guide/migrate-from-tsup` 从 tsup 迁移）
- 配置选项集中在 `options/*`（22 个）：`options/config-file`（配置文件查找）/ `options/entry` / `options/output-format`（esm/cjs/iife/umd）/ `options/platform` / `options/target` / `options/dts`（声明文件生成）/ `options/tree-shaking` / `options/unbundle` / `options/shims`
- 进阶（hooks / plugins / 编程式调用 / 自定义 Rolldown 选项）查 `advanced/*`；框架支持查 `recipes/*`（react/solid/svelte/vue/wasm）

### Drizzle ORM
- TypeScript Headless ORM（支持 PostgreSQL/MySQL/SQLite/MSSQL/SingleStore/CockroachDB/Gel）；文档在 `src/content/docs/`（**.mdx 格式**，Astro Starlight）
- 核心 API 多为扁平 path：`select` / `insert` / `update` / `delete` / `transactions` / `rqb`（关系查询）/ `operators` / `sql-schema-declaration`
- Drizzle Kit CLI：`drizzle-kit-generate`（生成迁移）/ `drizzle-kit-migrate`（执行）/ `drizzle-kit-push`（推送 schema）/ `drizzle-kit-pull`（反向拉取）；配置查 `drizzle-config-file`；总览查 `kit-overview`
- 数据库连接查 `connect-*` 系列（neon/supabase/vercel-postgres/turso/planetscale/cloudflare-d1 等 20+）；各方言入门查 `get-started/{dialect}-{existing|new}`
- 校验库集成：`zod` / `valibot` / `arktype` / `effect-schema` / `typebox`；实用指南查 `guides/*`（分页/条件过滤/自增等）

### Bun
- 全栈 JS 运行时（Zig 实现，集成 runtime + bundler + package manager + test runner）；文档在 `docs/`（**Mintlify MDX**，复用内核 .mdx 支持）
- **runtime API 查 `runtime/*`**：`runtime/sql`（统一 PostgreSQL/MySQL/SQLite，tagged template）/ `runtime/sqlite`（bun:sqlite）/ `runtime/shell`（bun:shell）/ `runtime/ffi` / `runtime/http/server` / `runtime/http/websockets` / `runtime/s3` / `runtime/streams` / `runtime/html-rewriter` / `runtime/workers` / `runtime/cron`
- **包管理查 `pm/*`**：`pm/cli/install` / `pm/cli/add` / `pm/cli/update` / `pm/cli/remove` / `pm/bunx` / `pm/lockfile` / `pm/workspaces`；[install] 配置查 `runtime/bunfig`
- **打包查 `bundler/*`**：`bundler/esbuild`（esbuild 迁移 + 兼容插件 API）/ `bundler/plugins` / `bundler/macros` / `bundler/executables`（编译可执行）
- **测试查 `test/*`**：`test/writing-tests` / `test/mocks` / `test/snapshots` / `test/configuration` / `test/code-coverage`

---

## 通用规则

1. **先查后写**：涉及框架 API 前，先通过 MCP 确认最新用法
2. **错误兜底**：MCP 无结果时，注释标注 `// ⚠️ 未经文档验证，请人工确认`
3. **避免 Web 搜索**：有本地 MCP 能解决的不许用 `WebSearch` 查框架文档
4. **不要覆盖默认值**：MCP 文档给出的默认值通常是最优选择
5. **服务增删后重启会话**：改 `.mcp.json` 后**必须重启 Claude Code 会话**才能加载新 MCP 服务
