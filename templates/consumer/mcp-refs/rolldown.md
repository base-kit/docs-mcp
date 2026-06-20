# Rolldown 文档路径速查

> 数据源：`rolldown/rolldown` 仓 `docs/`（VitePress，49 页，11 分类）。
> 已排除 `.vitepress/**`（VitePress 配置）。Rolldown 是 Vite 8 底层的 Rust 打包器（基于 Oxc）。

## guide — 入门

| 场景 | path |
|------|------|
| **介绍** | `guide/introduction` |
| **快速开始** | `guide/getting-started` |
| **核心特性** | `guide/notable-features` |
| **故障排除** | `guide/troubleshooting` |

## apis — API 参考

| 场景 | path |
|------|------|
| **Bundler API** | `apis/bundler-api` |
| **CLI** | `apis/cli` |
| **Plugin API** | `apis/plugin-api` |
| Plugin Hook Filters | `apis/plugin-api/hook-filters` |
| 插件间通信 | `apis/plugin-api/inter-plugin-communication` |
| 源码转换（transform + sourcemap） | `apis/plugin-api/transformations` |
| File URLs | `apis/plugin-api/file-urls` |
| Rust Crates | `apis/rust-crates` |

## in-depth — 深度原理

| 场景 | path |
|------|------|
| **自动代码分割** | `in-depth/automatic-code-splitting` |
| **手动代码分割** | `in-depth/manual-code-splitting` |
| **死代码消除（tree shaking）** | `in-depth/dead-code-elimination` |
| 外部模块 | `in-depth/external-modules` |
| 捆绑 CJS | `in-depth/bundling-cjs` |
| 指令 | `in-depth/directives` |
| 懒加载 barrel 优化 | `in-depth/lazy-barrel-optimization` |

## builtin-plugins — 内置插件

| 场景 | path |
|------|------|
| 插件总览 | `builtin-plugins/index` |
| Bundle Analyzer | `builtin-plugins/bundle-analyzer` |
| Replace | `builtin-plugins/replace` |
| ESM External Require | `builtin-plugins/esm-external-require` |

## glossary — 术语表

barrel-module / entry / entry-chunk / entry-name / user-defined-entry（`glossary/{name}`）

## 其它

- 贡献指南：`contribution-guide/index`
- 开发指南（架构/repo 结构/测试/profiling）：`development-guide/{name}`
- 数据加载：`data-loading/*`
