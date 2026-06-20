# docs-mcp 工具开发规范

> 本仓库是 **docs-mcp 工具源码**：把开源项目官方文档克隆到本地 → 用共享内核（Orama）索引 → 暴露为 MCP stdio server。
> 本规范面向 **开发 docs-mcp 本身**（CLI + 内核 + preset 维护）。用 docs-mcp 查文档写业务代码的规范见 `templates/consumer/`（消费方模板，可由 `docs-mcp config --with-claude-md` 输出到目标项目）。

---

## 项目定位与架构

```
docs-mcp/                                 ← 单 npm 工程（工具源码）
├── package.json                         ← CLI + 内核 deps 合一
├── bin/docs-mcp.mjs                     ← CLI 入口（tsx / node strip-types）
├── tsconfig.json                        ← 编译 src/ → dist/（sourceMap: false）
├── src/
│   ├── cli/                             ← CLI 层（commander，9 命令）
│   │   ├── index.ts                     ← 命令路由
│   │   ├── commands/                    ← 9 个子命令
│   │   ├── log.ts / git.ts / mcp-config.ts
│   ├── core/                            ← 共享内核
│   │   ├── indexer.ts                   ← 文件收集 + Markdown 切块 + 清理
│   │   ├── embed.ts                     ← all-MiniLM-L6-v2（hf-mirror 镜像）
│   │   ├── server.ts                    ← MCP stdio server
│   │   ├── tools.ts                     ← 4 工具实现
│   │   ├── manifest.ts / config.ts / types.ts / build-index.ts
│   └── preset/                          ← preset schema (zod) + loader
├── presets/                             ← 声明性清单（每服务一 json，提交进 git）
├── services/                            ← 指令性索引配置（install/add 自动生成）
├── templates/consumer/                  ← 消费方规范模板（CLAUDE.md + mcp-refs）
├── data/                                ← 索引产物（gitignored，可重建）
├── packages/                            ← 拉取的源码（gitignored）
├── dist/                                ← 编译产物（gitignored，无 sourceMap）
└── .mcp.json.template                   ← .mcp.json 模板（${DOCS_MCP_ROOT} 占位符）
```

**数据流**：`presets/<svc>.json` → `install` 克隆到 `packages/<pkg>/` + 写 `services/<svc>.json` → `build` 跑 `dist/core/build-index.js <svc>` → 索引落到 `data/<svc>/`。

**运行期**：Claude Code 读 `.mcp.json` → spawn `node dist/core/server.js <svc>` → loadIndex() 探测 `index.vectorIndexes` 是否非空选 hybrid/fulltext → 注册 4 工具 → stdio JSON-RPC。

---

## 开发规范

- **TypeScript ESM**（`"type": "module"`），Node ≥22
- 内置模块一律用 `node:` 前缀（`node:fs`、`node:child_process`、`node:path`），避免与同名 npm 包冲突
- 文件操作优先 `node:fs/promises`；CLI 内同步场景（构建/命令）用 `node:fs`
- **路径基准（重构后易错点，务必核对）**：
  - `src/core/*.ts`：`import.meta.dirname` 上溯 **2 级**到项目根（`dist/core/ → ../..`）
  - `src/preset/*.ts`：上溯 **2 级**
  - `src/cli/*.ts`：上溯 **2 级**
  - `src/cli/commands/*.ts`：上溯 **3 级**（`dist/cli/commands/ → ../../../`）—— 历史上多次少写一级导致 `config`/`list`/`remove`/`add` 命令找不到 packages/data，新增命令务必确认
- **service config 的 `sources[].root` 相对项目根**（如 `packages/vue-docs/src`），**不要**加 `../` 前缀（`docs-mcp-core` 单仓时期残留，已修；`add` 命令生成 config 时亦然）
- 开发模式：`npm run dev`（tsx 直接跑 `.ts`，免编译）；生产：`npm run build`（tsc）后 `node bin/docs-mcp.mjs`
- 改 `src/` 后必须 `npm run build` 重新编译 `dist/`（`verify`/`config`/`update` 运行用 `dist/core/*`）
- lint/format：`npm run lint` / `npm run format`（oxlint/oxfmt，仅查 `src/ bin/`）
- 测试：`npx docs-mcp verify`（端到端 MCP 协议测试，每服务 6 项，并发 4）。本项目暂无单元测试（hybrid 索引加载耗时，端到端 verify 为主验证手段）

---

## 索引构建与维护

### 重 build 索引

```bash
npx docs-mcp build --all                   # 全部已构建服务
npx docs-mcp build vue                     # 单服务
npx docs-mcp build --core-only             # 仅重编 src/ → dist/（不重建索引）
```

更新后**必须重启 Claude Code 会话**才能加载新索引。

### 升级某服务上游文档

```bash
npx docs-mcp update vue          # git pull + 重建索引（默认）
npx docs-mcp update --all        # 全部已安装服务
npx docs-mcp update vue --force  # 浅克隆 pull 失败时，强制重新克隆
```

### 切到 hybrid 模式（向量融合）

编辑 `services/<svc>.json` 加 `"mode": "hybrid"`，再 `npx docs-mcp build <svc>`。
首次会从 `hf-mirror.com` 离线下载 `all-MiniLM-L6-v2`（约 23 MB）。

---

## 共享内核与检索模式

**位置**：`src/core/`（单 npm 工程的一部分，不是独立 npm 包）。

**文件**：
- `indexer.ts`：文件收集（`tree` / `readme` 两种策略）+ Markdown 切块（按 `## `）+ 内容清理
- `embed.ts`：`all-MiniLM-L6-v2` 嵌入（`hf-mirror.com` 镜像离线下载），导出 `EMBED_DIM`
- `server.ts`：MCP stdio server（运行期入口，被 `.mcp.json` spawn）
- `tools.ts`：4 工具实现（searchDocs / getPage / listSections / grepDocs）
- `manifest.ts`：索引签名（sha1 of path+mtime）+ git commit 记录 + 运行期 freshness 检查
- `config.ts`：services/*.json 加载 + `listServices` + `toolPrefix`
- `build-index.ts`：构建入口（被 `docs-mcp build` 命令 spawn）
- `types.ts`：DocChunk / DocPage / ServiceConfig / Manifest 类型

**关键能力**：
- title 提取（H1 → frontmatter.title 回退）
- chunk id 去重（anchor 冲突追加 `-2/-3/-N`）
- 内容清理（VitePress `:::`、heading anchor `{#xxx}`、Vue/Mintlify/Astro 组件标签、MDX `import`）
- `.md` 与 `.mdx` 双格式支持
- **hybrid 混合检索**：BM25 全文 + `all-MiniLM-L6-v2` 向量语义融合，`hybridWeights: text 0.4 / vector 0.6`（偏向量根治词频跑偏）
- **向量探测 O(1)**：`loadIndex` 用 `Object.keys(rawDB.index?.vectorIndexes ?? {}).length > 0` 判定 hybrid（不要用 `JSON.stringify` 全量搜索——对 redis 310MB 索引是性能灾难）

**检索模式**（由 `services/<name>.json` 的 `mode` 字段显式控制）：

| mode | 引擎 | 当前服务 |
|---|---|---|
| `fulltext`（默认，省略） | BM25 全文 | 19 个 |
| `hybrid` | BM25 + 向量（text 0.4 / vector 0.6） | `bun` / `drizzle` / `redis` |

**兼容性**：运行期 server 探测 `index.vectorIndexes` 自动选 hybrid / fulltext schema —— 两种索引可共存。

**验证报告**：`npx docs-mcp verify` 生成 `report/<svc>-docs-mcp-report.html` + `report/mcp-overview-report.html`。搜索测试基于 markdown `Found N results` 断言（真校验搜索质量，非恒真）。

---

## preset / service 双轨设计

| `presets/<svc>.json` | `services/<svc>.json` |
|---|---|
| 声明性："我要哪些仓库" | 指令性："怎么索引这些文档" |
| 人类 PR 编辑 | install/add 命令自动生成 |
| 仓库元数据 + 展示信息 | sources/root/exclude/mode |
| 类似 `package.json` | 类似 `package-lock.json` |

不合并的理由：两者生命周期不同，相对路径基准不同（preset 相对 `packages/<pkg>/`，service 相对项目根），CLI 关注点分离。`install` 命令是单向推导源（preset → service），重装即重置。

### 新增预制

写 `presets/<name>.json`（参考 `src/preset/schema.ts` 的 zod schema：name/repo/serverName/docsName/docsRoot/exclude/mode/package），再 `npx docs-mcp install <name> --build`。

### 添加非预制

`npx docs-mcp add <url>`（自动写 preset + service，`docsRoot` 相对 packages 下仓库）。

---

## 通用规则

1. **改 src/ 后必须 build**：`verify`/`config`/`update` 运行用 `dist/core/*`，改源码不重编则跑旧逻辑
2. **新增命令核对路径基准**：`src/cli/commands/*.ts` 需上溯 3 级 `..`（历史多次踩坑）
3. **root 不加 `../`**：service config root 相对项目根
4. **不覆盖 Orama/ MCP 默认值**除非有据
5. **索引/配置更新后重启会话**：Claude Code 会话启动时加载 MCP 服务与索引
6. **消费方规范不进本文件**：用 docs-mcp 查文档写业务代码的规范放 `templates/consumer/CLAUDE.md`，由 `config --with-claude-md` 交付
