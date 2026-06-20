# Bun 文档路径速查

> 数据源：`oven-sh/bun` 仓 `docs/`（Mintlify + MDX，318 页，13 分类）。
> 已排除 `snippets/**`（被 include 的可复用片段，无独立 title）。复用上一轮扩展的内核 `.mdx` 支持。

## runtime — 运行时 API（63，核心）

| 场景 | path |
|------|------|
| **统一 SQL（PostgreSQL/MySQL/SQLite）** | `runtime/sql` |
| **bun:sqlite** | `runtime/sqlite` |
| **bun:shell（$`cmd`）** | `runtime/shell` |
| **bun:ffi（外部函数）** | `runtime/ffi` |
| **HTTP 服务 / 路由** | `runtime/http/server`、`runtime/http/routing`、`runtime/http/tls` |
| **WebSockets** | `runtime/http/websockets` |
| **S3** | `runtime/s3` |
| **Streams** | `runtime/streams` |
| **HTMLRewriter** | `runtime/html-rewriter` |
| **glob** | `runtime/glob` |
| **Workers** | `runtime/workers` |
| **定时任务 cron** | `runtime/cron` |
| **bunfig.toml 配置** | `runtime/bunfig` |
| **模块解析** | `runtime/module-resolution` |
| **自动安装** | `runtime/auto-install` |
| **文件系统路由** | `runtime/file-system-router` |
| **环境变量** | `runtime/environment-variables` |
| **调试器** | `runtime/debugger` |
| **插件** | `runtime/plugins` |
| **Node.js 兼容性** | `runtime/nodejs-compat` |
| **REPL / Transpiler / JSON5 / TOML / YAML** | `runtime/repl`、`runtime/transpiler`、`runtime/json5`、`runtime/toml`、`runtime/yaml` |

## pm — 包管理器（25）

| 场景 | path |
|------|------|
| **bun install** | `runtime/bunfig`（[install] 配置）/ `pm/cli/install` |
| **bun add / remove / update** | `pm/cli/add`、`pm/cli/remove`、`pm/cli/update` |
| **bunx（运行 npm 包）** | `pm/bunx` |
| **lockfile** | `pm/lockfile` |
| **workspaces** | `pm/workspaces` |
| **global cache / store** | `pm/global-cache`、`pm/global-store` |
| **publish / audit / outdated** | `pm/cli/publish`、`pm/cli/audit`、`pm/cli/outdated` |
| **patch / link / info / why** | `pm/cli/patch`、`pm/cli/link`、`pm/cli/info`、`pm/cli/why` |
| **catalogs / overrides / scopes** | `pm/catalogs`、`pm/overrides`、`pm/scopes-registries` |

## bundler — 打包器（13）

| 场景 | path |
|------|------|
| **总览** | `bundler/index` |
| **从 esbuild 迁移（Plugin API 兼容）** | `bundler/esbuild` |
| **插件** | `bundler/plugins` |
| **macros / minifier / loaders** | `bundler/macros`、`bundler/minifier`、`bundler/loaders` |
| **CSS / 热重载** | `bundler/css`、`bundler/hot-reloading` |
| **编译可执行 / bytecode / 全栈** | `bundler/executables`、`bundler/bytecode`、`bundler/fullstack` |
| **standalone HTML / html-static** | `bundler/standalone-html`、`bundler/html-static` |

## test — 测试（12）

| 场景 | path |
|------|------|
| **编写测试** | `test/writing-tests` |
| **mocks / snapshots** | `test/mocks`、`test/snapshots` |
| **配置 / 覆盖率 / 发现** | `test/configuration`、`test/code-coverage`、`test/discovery` |
| **日期时间 / DOM / reporters** | `test/dates-times`、`test/dom`、`test/reporters` |

## guides — 指南（191，最大块）

二级子目录（`guides/{topic}/{name}`）：`ecosystem`、`deployment`、`install`、`http`、`runtime`、`streams`、`test`、`util`、`websocket`、`process`、`read-file`、`write-file`、`binary`、`html-rewriter`

## 根级

| 场景 | path |
|------|------|
| **首页** | `index` |
| **快速开始** | `quickstart` |
| **安装** | `installation` |
| **TypeScript 支持** | `typescript` / `typescript-6` |

> **提示**：Bun 文档为 Mintlify + MDX，含 `<Note>`/`<ParamField>` 等组件标签与 `import` 语句会残留在 `get_bun_doc` 返回文本开头（同 drizzle/elysia 性质），不影响检索，代码示例完整可读。
