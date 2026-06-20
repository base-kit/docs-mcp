# docs-mcp · 开源项目的本地文档 MCP 服务集

> **为 AI 编程（Claude Code / Cursor / 其他 MCP 客户端）提供可扩展的开源项目本地文档 MCP 服务。**
> 内置 22 个常用预制（以 `npx docs-mcp preset list` 为准）；任意时刻 `docs-mcp add` 增删；任何人都能基于此 fork 出自己项目组合的版本。

---

## 这是什么

`docs-mcp` 把当前预制的所有开源项目（以及你后续 `docs-mcp add` 添加的任意项目）官方文档克隆到本地 → 用统一内核（`src/core/`，Orama BM25 + 可选向量融合）索引 → 暴露为 **MCP stdio server**。

在 Claude Code 中注册后，模型可通过 4 个标准工具（`search_/get_/list_/grep_`）按需检索文档 —— **不依赖网络检索、不受困于训练知识陈旧**。

**对 fork 用户的承诺**：clone → `npm install` → `npx docs-mcp install --build` → `npx docs-mcp config` 四步走完，22 个开源项目的官方文档就能被 Claude 实时查询。

| 维度 | 现状 |
|---|---|
| **预制开源项目** | 22（vue / vite / pinia / bun / drizzle / redis …）— 可随时 `add` / `remove` 增删 |
| **CLI 命令数** | 9：`install` / `add` / `remove` / `build` / `config` / `list` / `preset` / `verify` / `update` |
| **标准工具数（每服务）** | 4：`search_/get_/list_/grep_` |
| **共享内核** | `src/core/`（TypeScript ESM，Orama 3.1 + 可选 `all-MiniLM-L6-v2` 向量融合） |
| **预制清单** | `presets/*.json`（每服务一文件，diff 友好） |
| **索引体积** | ≈ 410 MB（含 redis hybrid 287 MB） |

---

## 30 秒上手

```bash
# 1. clone & install（一次性）
git clone <repo-url> docs-mcp-local
cd docs-mcp-local
npm install

# 2. 拉取所有预制 + 构建索引（首次 10-30 分钟；redis hybrid 较慢）
npx docs-mcp install --build

# 3. 交互式勾选服务，生成 .mcp.json
npx docs-mcp config
#    或：npx docs-mcp config --all -o .mcp.json

# 4. 在 Claude Code 中启用
#    把生成的 .mcp.json 放到需要 AI 辅助的项目根目录（或在 .claude/ 下）
#    重启 Claude Code 会话
```

---

## 9 个命令一览

| 命令 | 用途 |
|---|---|
| `install [services...]` | 拉取预制仓库 + 写 service config（`--build` 立即构建） |
| `add <url>` | 添加新开源项目（非预制），自动写入 preset + service |
| `remove <svc>` | 删除 packages/ + services/ + data/ 三件套 |
| `build [services...]` | 重建索引（`--all` 全部；`--core-only` 仅编译） |
| `config` | 交互勾选 + 生成 `.mcp.json`（`--all` / `--services a,b,c`） |
| `list` | 列出预制 / 已安装 / 已构建服务 |
| `preset <action> [name]` | 浏览预制（`list` / `show <name>`） |
| `verify [services...]` | 跑 MCP 协议测试 + 生成 HTML 验证报告 |
| `update [services...]` | 拉取最新文档源码 + 重建索引（git pull + build，`--force` 重克隆 / `--verify` 验证） |

每个命令支持 `--help` 查看完整选项。

---

## 架构

```
docs-mcp-local/                                ← 本仓库（单 npm 工程）
├── package.json                              ← CLI + 内核 deps 合一
├── bin/docs-mcp.mjs                          ← CLI 入口（tsx / node strip-types）
├── tsconfig.json                             ← 一个 tsconfig，编译 src/ → dist/
├── src/
│   ├── cli/                                  ← CLI 层（commander）
│   │   ├── index.ts                          ← 命令路由
│   │   ├── commands/                         ← 9 个子命令
│   │   ├── log.ts / git.ts / mcp-config.ts
│   ├── core/                                 ← 共享内核
│   │   ├── indexer.ts                        ← 文件收集 + Markdown 切块 + 清理
│   │   ├── embed.ts                          ← all-MiniLM-L6-v2（hf-mirror 镜像）
│   │   ├── server.ts                         ← MCP stdio server
│   │   ├── tools.ts                          ← 4 工具实现
│   │   ├── manifest.ts / config.ts / types.ts / build-index.ts
│   └── preset/                               ← preset 类型
│       ├── schema.ts                         ← Preset 类型 + zod 校验
│       └── loader.ts                         ← 读 presets/*.json
├── presets/                                  ← 预制清单（每服务一文件，提交进 git）
├── services/                                 ← service config（install/add 自动生成）
├── templates/consumer/                       ← 消费方规范模板（CLAUDE.md + mcp-refs/，config --with-claude-md 输出）
├── data/                                     ← 索引产物（git ignored，可重建）
├── packages/                                 ← 拉取的源码（git ignored）
├── .mcp.json.template                        ← .mcp.json 模板（${DOCS_MCP_ROOT} 占位符）
├── .mcp.json                                 ← 用户本地（git ignored，docs-mcp config 生成）
└── README.md / CLAUDE.md / CONTRIBUTING.md
```

**数据流**：

```
presets/<svc>.json（用户编辑 / add 命令生成）
  → install: git clone → packages/<pkg>/
  → install: 写 services/<svc>.json（自动推导 sources[].root）
  → build:   node dist/core/build-index.js <svc>
  → Orama.index() → data/<svc>/index.json + pages.json + manifest.json
```

**运行期**：

```
Claude Code 读 .mcp.json → spawn node dist/core/server.js <svc>
  → loadIndex() 探测索引是否含 embedding 字段 → 选 hybrid / fulltext schema
  → 注册 4 工具（search_/get_/list_/grep_）
  → stdio JSON-RPC 接收 tool call → Orama.search() → 返回结果
```

**预设与运行期配置的双轨设计**：

| `presets/<svc>.json` | `services/<svc>.json` |
|---|---|
| 声明性："我要哪些仓库" | 指令性："怎么索引这些文档" |
| 人类 PR 编辑 | install/add 命令自动生成 |
| 仓库元数据 + 展示信息 | sources/root/exclude |
| 类似 `package.json` | 类似 `package-lock.json` |

不合并的理由：两者生命周期不同，相对路径基准不同（preset 相对 `packages/<pkg>/`，service 相对项目根），CLI 关注点分离。`install` 命令是单方向推导源（preset → service），重装即重置。

---

## 4 个标准工具（每个服务一致）

| 工具 | 入参 | 典型用途 |
|---|---|---|
| `search_{prefix}_docs` | `query`, `category?`, `limit?` | 「如何配置 build target」「什么是 storeToRefs」 |
| `get_{prefix}_doc` | `path` | 拿 search 结果后取完整页 |
| `list_{prefix}_doc_sections` | `category?` | 不熟悉文档结构时先浏览 |
| `grep_{prefix}_docs` | `pattern`（正则） | 找 API 名在哪些页出现 |

`{prefix}` 替换为预制服务名（如 `vite`）。完整服务清单见下表；运行 `npx docs-mcp preset list` 始终拿到最新。

---

## 当前预制服务清单

> 这只是**起点**。你可以 `npx docs-mcp add <url>` 把任意开源项目的文档拉进来变成自己的预制，
> 或 `npx docs-mcp remove <svc>` 删掉不需要的。

| 服务名 | 文档名 | 模式 | 项目版本 | 描述 |
|---|---|---|---|---|
| `vue` | Vue.js | fulltext | vue@^3.5 | Vue 3.5+ 渐进式 JavaScript 框架 |
| `vite` | Vite | fulltext | vite@^8 | Vite 8 下一代前端构建工具 |
| `router` | Vue Router | fulltext | vue-router@^5 | Vue 官方路由 v5 |
| `pinia` | Pinia | fulltext | pinia@^3 | Vue 官方状态管理 v3 |
| `unocss` | UnoCSS | fulltext | unocss@^66 | 即时按需原子化 CSS 引擎 v66 |
| `element-plus` | Element Plus | fulltext | element-plus | Element Plus Vue 3 组件库 |
| `vant` | Vant | fulltext | vant | 有赞移动端 Vue 组件库 |
| `vitest` | Vitest | fulltext | vitest@^4 | Vitest 4 测试框架（Vite 8 兼容） |
| `oxc` | OXC | fulltext | oxlint@^1, oxfmt@^0.55 | Oxidation Compiler 项目 |
| `axios` | Axios | fulltext | axios@^1 | Axios v1 HTTP 客户端 |
| `dayjs` | Day.js | fulltext | dayjs@^1 | Day.js 轻量日期库 |
| `node` | Node.js | fulltext | node@24 | Node.js v24 运行时文档 |
| `pnpm` | pnpm | fulltext | pnpm@^10 | pnpm v10 包管理器 |
| `sass` | Sass | fulltext | sass@^1.80 | Sass CSS 预处理器 |
| `vue-i18n` | Vue I18n | fulltext | vue-i18n@^11 | Vue 国际化 v11 |
| `elysia` | Elysia | fulltext | elysia@^1 | Elysia Bun 优先 TS 后端框架 |
| `redis` | Redis | **hybrid** | redis@8 | Redis 8 内存数据库 |
| `nginx` | NGINX | fulltext | nginx | NGINX 高性能 Web 服务器 |
| `rolldown` | Rolldown | fulltext | rolldown | Rolldown Rust 打包器（Vite 8 内核） |
| `tsdown` | tsdown | fulltext | tsdown | tsdown 基于 Rolldown 的 TS 库打包器 |
| `drizzle` | Drizzle ORM | **hybrid** | drizzle-orm | Drizzle ORM TypeScript Headless ORM |
| `bun` | Bun | **hybrid** | bun | Bun 全栈 JS 运行时（Zig） |

> **Hybrid 模式**：BM25（权重 0.4）+ `all-MiniLM-L6-v2` 向量（权重 0.6）融合检索，对语义近似查询更强（如 `bunx` vs `bun run`）。
> 索引体积约 3 倍，构建时间约 3 倍。模型从 `hf-mirror.com`（不是 `huggingface.co`，公司内网）离线下载。

---

## 工作流详解

### 安装 / 升级文档

```bash
# 全部预制 + 立即构建索引
npx docs-mcp install --build

# 只安装指定服务
npx docs-mcp install vue vite pinia --build

# 强制重新克隆（packages/ 内已存在也覆盖）
npx docs-mcp install --force --build

# 已安装的服务，想升级文档？
npx docs-mcp update vue          # git pull + 重建索引
npx docs-mcp update --all        # 全部已安装服务
npx docs-mcp update vue --verify # 更新后顺带验证
npx docs-mcp update vue --force  # 浅克隆 pull 失败时，强制重新克隆
```

### 添加新的开源项目（非预制）

```bash
# 全交互模式（推荐新手）
npx docs-mcp add https://github.com/withastro/docs --interactive

# 命令行模式（适合 CI/脚本）
npx docs-mcp add https://github.com/foo/bar.git \
  --name astro \
  --docs-root src/content/docs \
  --exclude "blog/**,i18n/**" \
  --mode hybrid \
  --docs-name "Astro Docs"

# 下一步：构建索引 + 生成 .mcp.json
npx docs-mcp build astro
npx docs-mcp config --services astro,vite
```

`add` 会同时写 `presets/<name>.json` + `services/<name>.json` —— 让这个仓库也成为预制，可分享给其他人。

### 生成 .mcp.json

```bash
# 交互模式（推荐）
npx docs-mcp config

# 命令行
npx docs-mcp config --services vue,vite,pinia -o .mcp.json

# 全选已构建服务
npx docs-mcp config --all

# 显式指定 docs-mcp-local 根路径（用于非默认 clone 位置）
npx docs-mcp config --root /Users/me/work/docs-mcp-local

# 一并输出消费方规范（CLAUDE.md + 选中服务 mcp-refs 速查）到目标项目
npx docs-mcp config --all --with-claude-md -o /path/to/your-project/.mcp.json
```

生成的 `.mcp.json` 形如：

```json
{
  "mcpServers": {
    "vite-docs": {
      "command": "node",
      "args": ["/Users/me/work/docs-mcp-local/dist/core/server.js", "vite"]
    },
    "vue-docs": { "...": "..." }
  }
}
```

把这个文件**放到需要 AI 辅助的项目根目录**（或 `~/.claude/`），重启 Claude Code 即可。

**`--with-claude-md`（消费方规范交付）**：docs-mcp 仓库自身的 `CLAUDE.md` 是**工具开发规范**；消费方项目（用这些 MCP 服务查文档写 Vue/Vite 代码）需要的规范在 `templates/consumer/`。加 `--with-claude-md` 后，`config` 会把消费方 `CLAUDE.md` + 选中服务的 `mcp-refs/*.md`（路径速查）一并输出到目标项目的根目录与 `.claude/mcp-refs/`，让消费方项目开箱即得「先查 MCP 文档再写代码」的强约束规范。若目标已有 `CLAUDE.md`，消费方规范输出为 `CLAUDE.docs-mcp.md`（不覆盖，可手动合并或 `@import`）。

---

## 验证报告

```bash
npx docs-mcp verify                            # 全部已构建服务
npx docs-mcp verify vite vue pinia             # 指定服务
npx docs-mcp verify --output /tmp/reports      # 输出到自定义目录
```

每服务跑 6 个 MCP 协议测试（initialize / tools/list / search / get / list / 错误处理），
输出 `report/<svc>-docs-mcp-report.html` + `report/mcp-overview-report.html`。
并发限制 4，单服务总耗时约 1-2 秒。

---

## 已知限制

| 项 | 说明 |
|---|---|
| **首次磁盘需求** | ≈ 5 GB（22 个浅克隆仓库 + ≈ 410 MB 索引 + node_modules；每 `add` 一个服务会额外占用） |
| **Hybrid 模型下载** | 首次启用 hybrid 需联网从 `hf-mirror.com`（不是 `huggingface.co`，公司内网）拉 `all-MiniLM-L6-v2`（约 23 MB） |
| **redis hybrid 内存** | 运行期约 1.5 GB |
| **Claude Code 启动** | 所有 stdio server 同时 spawn 约需 8-12 秒（与服务数成正比） |
| **平台** | macOS / Linux 验证；Windows 需 Git Bash 或 WSL |
| **文档陈旧检测** | `data/<svc>/manifest.json` 含 `gitCommit` 但本仓库不自动 rebuild。订阅 release：每月 `cd packages/<svc> && git pull && cd ../.. && npx docs-mcp build <svc>` |
| **`.mcp.json` 不进 git** | 含绝对路径，已 gitignored；clone 后需 `npx docs-mcp config` 重新生成 |

---

## 开发与贡献

新增预制 / 内核开发 / CLI 开发：见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

CLAUDE.md 强约束（"先 MCP 文档再写代码"）：见 [CLAUDE.md](./CLAUDE.md)。

---

## 致谢

- 索引引擎 [Orama](https://github.com/orama/orama)
- Embedding 模型 [`all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- 当前预制的所有数据源项目（见上表）

## 许可

本仓库（CLI、presets、scripts、报告、文档）按 MIT 发布。`packages/` 下的上游仓库保留各自 LICENSE。
