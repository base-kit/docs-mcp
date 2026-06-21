# docs-mcp · 开源项目的本地文档 MCP 服务集

> **为 AI 编程（Claude Code / Cursor / 其他 MCP 客户端）提供可扩展的开源项目本地文档 MCP 服务。**
> 内置 22 个常用预制（以 `docs-mcp preset list` 为准）；任意时刻 `docs-mcp add` 增删；任何人都能基于此 fork 出自己项目组合的版本。

---

## ✨ 为什么需要它

让 AI 写代码时查「Vite 8 的 `build.target` 默认值」「Pinia 3 的 `storeToRefs` 怎么保持响应性」「Redis 8.4 的 `SET ... IFEQ` 语法」——模型常依赖**过时的训练知识**或**联网搜索**：训练知识滞后于新版本（Vite 8 / Redis 8 / Vue 3.5 等特性缺失），网络搜索慢且结果良莠不齐。

`docs-mcp` 把开源项目**官方文档**克隆到本地 → 索引成可检索的知识库 → 通过 MCP 标准协议暴露给 AI。模型按需查文档，**离线、即时、权威、可验证**。

## 🎯 核心亮点

- **索引后完全离线**：文档与索引在本地 `~/.docs-mcp/`，日常检索不依赖网络，不受代理 / 防火墙限制（仅首次克隆文档与启用 hybrid 下模型需联网）
- **权威准确**：直接索引上游官方文档源码，模型拿到的是当前版本的真实 API，而非可能过时的训练记忆
- **语义检索（hybrid）**：BM25 全文 + `all-MiniLM-L6-v2` 向量融合——`bunx` 能命中 `bun run`、模糊措辞也能找对，关键词不精准照样命中
- **可验证**：`verify` 命令对每个服务跑 6 项 MCP 协议测试并生成 HTML 报告，搜索质量真校验（非恒真）
- **可扩展**：22 个内置预制 + `add <url>` 一键接入任意开源项目文档；fork 出你自己的文档组合分享给团队
- **全局安装**：`npm i -g @easy-base/docs-mcp` 即用，无需 clone 源码；数据与代码分离，`npm update -g` 升级不丢索引
- **标准 MCP**：4 个统一工具（`search_` / `get_` / `list_` / `grep_`），Claude Code / Cursor 等任何 MCP 客户端即装即用

## 👥 适合谁

- 用 **Claude Code / Cursor** 等 AI 编程，常因框架 API 记不准而查文档的开发者
- 在**内网 / 受限网络**环境，WebSearch 不可用或不稳定的团队
- 维护**多框架项目**（Vue + Vite + Pinia + Drizzle + Redis …），想给 AI 一站式本地文档库的人
- 想让团队共享**统一文档版本**（fork + 自定义预制 + 分发）的技术负责人

---

## 这是什么

`docs-mcp` 把当前预制的所有开源项目（以及你后续 `docs-mcp add` 添加的任意项目）官方文档克隆到本地 → 用统一内核（`src/core/`，Orama BM25 + 可选向量融合）索引 → 暴露为 **MCP stdio server**。

在 Claude Code 中注册后，模型可通过 4 个标准工具（`search_/get_/list_/grep_`）按需检索文档 —— **不依赖网络检索、不受困于训练知识陈旧**。

**两种安装方式**：

- **全局安装（推荐终端用户）**：`npm i -g @easy-base/docs-mcp` → `docs-mcp install --build` → `docs-mcp config`，无需 clone 源码
- **clone 源码（开发 / 贡献）**：`git clone` → `npm install` → `npm link`，同上四步

用户数据（克隆的文档源 + 索引 + service config）统一落在 `~/.docs-mcp/`，与代码安装位置分离——升级包不丢数据。

| 维度 | 现状 |
|---|---|
| **预制开源项目** | 22（vue / vite / pinia / bun / drizzle / redis …）— 可随时 `add` / `remove` 增删 |
| **CLI 命令数** | 10：`install` / `add` / `remove` / `build` / `config` / `list` / `preset` / `verify` / `update` / `serve` |
| **标准工具数（每服务）** | 4：`search_/get_/list_/grep_` |
| **共享内核** | `src/core/`（TypeScript ESM，Orama 3.1 + 可选 `all-MiniLM-L6-v2` 向量融合） |
| **预制清单** | `presets/*.json`（每服务一文件，diff 友好） |
| **索引体积** | ≈ 410 MB（含 redis hybrid 287 MB） |

---

## 30 秒上手

### 方式 A · 全局安装（推荐，无需 clone 源码）

```bash
# 1. 全局安装
npm i -g @easy-base/docs-mcp

# 2. 拉取所有预制文档 + 构建索引（首次 10-30 分钟；redis hybrid 较慢）
docs-mcp install --build

# 3. 交互式勾选服务，生成 .mcp.json（默认 docs-mcp serve 可移植块）
docs-mcp config
#    或：docs-mcp config --all -o .mcp.json

# 4. 在 Claude Code 中启用
#    把生成的 .mcp.json 放到需要 AI 辅助的项目根目录（或 .claude/ 下），重启会话
```

### 方式 B · clone 源码（开发 / 贡献）

```bash
git clone https://github.com/base-kit/docs-mcp.git docs-mcp-local
cd docs-mcp-local
npm install
npm link              # 让 docs-mcp 命令指向本地（config 默认 docs-mcp serve 块需要它在 PATH）
docs-mcp install --build
docs-mcp config      # 或用 npm run dev ... 直接 tsx 跑源码开发
```

---

## 10 个命令一览

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
| `serve <service>` | 运行 MCP stdio server（`.mcp.json` 注册入口，内部 spawn `dist/core/server.js`） |

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
Claude Code 读 .mcp.json → spawn `docs-mcp serve <svc>`（或 `node <root>/dist/core/server.js`）
  → loadIndex() 探测索引是否含 embedding 字段 → 选 hybrid / fulltext schema
  → 注册 4 工具（search_/get_/list_/grep_）
  → stdio JSON-RPC 接收 tool call → Orama.search() → 返回结果
```

**双根路径（全局安装改造核心）**：

| 根 | 内容 | 位置 |
|---|---|---|
| **代码根 `APP_ROOT`** | `dist/` `presets/`（内置）`templates/` `package.json` | 跟随包安装位置（全局 npm 目录或 clone 目录） |
| **数据根 `DATA_ROOT`** | `packages/` `data/` `services/` `presets/`（用户 add）`models/` | `~/.docs-mcp/`（可被 `DOCS_MCP_DATA` 环境变量覆盖） |

升级包（`npm update -g @easy-base/docs-mcp`）只更新 `APP_ROOT`，**绝不触碰 `DATA_ROOT`**——文档源、索引、service config、模型缓存不丢。

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

`{prefix}` 替换为预制服务名（如 `vite`）。完整服务清单见下表；运行 `docs-mcp preset list` 始终拿到最新。

---

## 当前预制服务清单

> 这只是**起点**。你可以 `docs-mcp add <url>` 把任意开源项目的文档拉进来变成自己的预制，
> 或 `docs-mcp remove <svc>` 删掉不需要的。

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
# 全部预制 + 立即构建索引（首次推荐）
docs-mcp install --build

# 只安装指定服务
docs-mcp install vue vite pinia --build

# 强制重新克隆（packages/ 内已存在也覆盖）
docs-mcp install --force --build

# 调整 git clone 深度（默认 --depth 1 浅克隆，省磁盘）
docs-mcp install redis --depth 5 --build

# 跳过内核依赖检查（已确认环境完备时加速）
docs-mcp install --no-deps --build

# 已安装的服务，想升级文档？
docs-mcp update vue          # git pull + 重建索引（默认）
docs-mcp update --all        # 全部已安装服务
docs-mcp update vue --verify # 更新后顺带验证
docs-mcp update vue --force  # 浅克隆 pull 失败时，强制重新克隆
```

### 添加 / 移除服务

```bash
# 全交互模式（推荐新手，逐项填写元数据）
docs-mcp add https://github.com/withastro/docs --interactive

# 命令行模式（适合 CI/脚本）
docs-mcp add https://github.com/foo/bar.git \
  --name astro \
  --docs-root src/content/docs \
  --exclude "blog/**,i18n/**" \
  --mode hybrid \
  --docs-name "Astro Docs" \
  --server-name astro-docs      # .mcp.json 注册名（默认 <name>-docs）

# 添加后构建索引 + 生成 .mcp.json
docs-mcp build astro
docs-mcp config --services astro,vite

# 移除服务（默认删 packages/ + services/ + data/ + preset 四件套）
docs-mcp remove foo

# 移除但保留部分（调试 / 节省重下时间）
docs-mcp remove foo --keep-data     # 保留索引（下次 build 跳过）
docs-mcp remove foo --keep-source   # 保留 packages/ 源码
```

`add` 会同时写 `presets/<name>.json`（用户区，可分享）+ `services/<name>.json`（索引配置）。内置 preset 只读，用户 `add` 的落在 `~/.docs-mcp/presets/`，同名可覆盖内置。

### 生成 .mcp.json（接入 Claude Code）

```bash
# 交互模式（推荐，空格勾选、回车确认）
docs-mcp config

# 指定服务 + 输出路径
docs-mcp config --services vue,vite,pinia -o .mcp.json

# 全选已构建服务
docs-mcp config --all

# 输出到目标项目（不在本仓库执行）
docs-mcp config --all -o /path/to/your-project/.mcp.json

# 生成绝对路径块（clone 源码且未 npm link 时用；否则默认 docs-mcp serve 可移植块）
docs-mcp config --all --absolute -o .mcp.json

# 一并输出消费方规范（CLAUDE.md + 选中服务 mcp-refs 速查）到目标项目
docs-mcp config --all --with-claude-md -o /path/to/your-project/.mcp.json

# 组合：指定服务 + 消费方规范 + 绝对路径
docs-mcp config --services vue,vite --with-claude-md --absolute -o .mcp.json
```

生成的 `.mcp.json` 形如（默认可移植块）：

```json
{
  "mcpServers": {
    "vite-docs": {
      "command": "docs-mcp",
      "args": ["serve", "vite"]
    },
    "vue-docs": { "...": "..." }
  }
}
```

**可移植性**：默认 `docs-mcp serve <svc>`（无绝对路径、可进 git、跨机器通用），需 `docs-mcp` 在 PATH（全局安装或 `npm link`）。`--absolute` 则生成 `node <安装根>/dist/core/server.js <svc>` 绝对路径块——适合 clone 源码且未 link 的场景，但含机器特定路径、跨机器需重新生成。

把这个文件**放到需要 AI 辅助的项目根目录**（或 `~/.claude/`），重启 Claude Code 即可。

**`--with-claude-md`（消费方规范交付）**：

docs-mcp 仓库自身的 `CLAUDE.md` 是**工具开发规范**；消费方项目（用这些 MCP 服务查文档写 Vue/Vite 代码）需要的规范在 `templates/consumer/`。加 `--with-claude-md` 后，`config` 会把消费方 `CLAUDE.md` + 选中服务的 `mcp-refs/*.md`（路径速查表）一并输出到目标项目，开箱即得「先查 MCP 文档再写代码」的强约束规范。若目标已有 `CLAUDE.md`，消费方规范输出为 `CLAUDE.docs-mcp.md`（不覆盖，可手动合并或 `@import`）。

```
your-project/
├── .mcp.json                  ← docs-mcp config 生成
├── CLAUDE.md                  ← 消费方规范（已有则输出为 CLAUDE.docs-mcp.md）
└── .claude/mcp-refs/
    ├── vue.md                 ← 各服务文档路径速查
    └── vite.md
```

---

## 查看、验证与运行

```bash
# 列出服务（默认全部预制 + 安装/构建状态）
docs-mcp list
docs-mcp list --installed      # 仅已安装到 packages/ 的
docs-mcp list --built          # 仅已构建索引的
docs-mcp list --available      # 仅预制但未安装的
docs-mcp list --json           # JSON 输出（便于脚本解析）

# 浏览预制元数据
docs-mcp preset list           # 所有预制
docs-mcp preset show vue       # 某预制的完整配置

# 构建 / 重建索引
docs-mcp build vue              # 单服务
docs-mcp build --all           # 全部已安装服务
docs-mcp build --core-only     # 仅重新编译 src/ → dist/（源码开发用）

# 验证（端到端 MCP 协议测试 + HTML 报告）
docs-mcp verify                # 全部已构建服务
docs-mcp verify vite vue pinia # 指定服务
docs-mcp verify -o /tmp/reports

# 手动运行某服务（调试用，通常由 .mcp.json 自动 spawn）
docs-mcp serve vue
```

`verify` 每服务跑 6 个 MCP 协议测试（initialize / tools/list / search / get / list / 错误处理），输出 `report/<svc>-docs-mcp-report.html` + `report/mcp-overview-report.html`，并发限制 4，单服务约 1-2 秒。

---

## 已知限制

| 项 | 说明 |
|---|---|
| **首次磁盘需求** | ≈ 5 GB（22 个浅克隆仓库 + ≈ 410 MB 索引，落在 `~/.docs-mcp/`；每 `add` 一个服务额外占用） |
| **数据位置** | 所有用户数据在 `~/.docs-mcp/`（`DOCS_MCP_DATA` 可覆盖），与包安装位置分离，升级不丢 |
| **Hybrid 模型下载** | 首次启用 hybrid 需联网从 `hf-mirror.com`（不是 `huggingface.co`，公司内网）拉 `all-MiniLM-L6-v2`（约 23 MB，缓存在 `~/.docs-mcp/models/`） |
| **redis hybrid 内存** | 运行期约 1.5 GB |
| **Claude Code 启动** | 所有 stdio server 同时 spawn 约需 8-12 秒（与服务数成正比） |
| **平台** | macOS / Linux 验证；Windows 需 Git Bash 或 WSL |
| **文档陈旧检测** | `data/<svc>/manifest.json` 含 `gitCommit` + 文件签名，启动时自动比对并提示过期。订阅 release：`docs-mcp update <svc>`（git pull + 重建索引） |
| **升级工具** | `npm update -g @easy-base/docs-mcp`（只更新代码，不碰 `~/.docs-mcp/`） |
| **`.mcp.json` 可移植性** | 默认 `docs-mcp serve` 块无绝对路径、可进 git；`--absolute` 块含路径，跨机器需重新生成 |

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
