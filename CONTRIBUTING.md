# 贡献指南

感谢你愿意让 `docs-mcp` 服务更多开源项目 🎉

## 我能贡献什么

| 类型 | 难度 | 步骤 |
|---|---|---|
| 新增预制（让别人也能 `install`） | ⭐ | 见下文 |
| 修复某个服务的索引异常 | ⭐⭐ | 调整 `presets/<svc>.json` 的 `exclude` 或 `docsRoot` |
| 内核 bug 修复 / 性能优化 | ⭐⭐⭐ | `src/core/*` |
| CLI 新功能 | ⭐⭐ | `src/cli/commands/*` |

---

## 新增预制（最常见）

把新的开源仓库变成可 `docs-mcp install` 的预制，只需加一个 JSON。

### 1. 创建 `presets/<name>.json`

```json
{
  "name": "astro",
  "repo": "https://github.com/withastro/docs.git",
  "serverName": "astro-docs",
  "docsName": "Astro",
  "docsRoot": "src/content/docs",
  "exclude": ["blog/**"],
  "mode": "fulltext",
  "description": "Astro Web 框架文档",
  "meta": {
    "projectVersion": "astro@^5",
    "addedAt": "2026-06-20T00:00:00.000Z"
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✓ | CLI 服务名，kebab-case，唯一 |
| `repo` | ✓ | git clone URL（支持 https / ssh） |
| `serverName` | | `.mcp.json` 注册名（默认 `<name>-docs`） |
| `docsName` | ✓ | 展示名（出现在 serverInfo 与 README 表格） |
| `docsRoot` | ✓ | docs 根目录（相对 packages/<package>/） |
| `exclude` | | glob 排除规则（相对 docsRoot），如 `["blog/**", "**/zh-CN/**"]` |
| `mode` | | `fulltext`（默认）或 `hybrid` |
| `collectType` | | `tree`（递归 .md，默认）或 `readme`（每子目录取 README.md） |
| `pathPrefix` | | 极少用：path 前缀（影响最终 category） |
| `package` | | packages/ 下实际目录名（与 name 不同时填） |
| `description` | | 简短描述（README 表格用） |
| `meta.projectVersion` | | 项目版本范围，如 `astro@^5`（仅展示用） |

### 2. 在 README 的服务清单加一行

参考现有表格格式，保持对齐即可。如果你 `add` 的是临时试用不想污染清单，跳过这步。

### 3. 本地验证

```bash
npx docs-mcp install astro --build   # 拉取 + 构建
npx docs-mcp list --installed         # 确认出现在已安装列表
npx docs-mcp config --services astro  # 生成 .mcp.json 验证字段
```

### 4. 提 PR

- 一个 PR = 一个新预制（或一组同主题的）
- 在 PR 描述里贴：
  - 仓库 URL
  - 文档页数（`npx docs-mcp install astro --build` 输出）
  - 索引大小
  - 任何 exclude / mode 选择的理由

---

## 修复索引异常

症状：`docs-mcp build <svc>` 报 0 页 或 包含垃圾内容。

1. 看 `presets/<svc>.json` 的 `docsRoot` 与 `exclude` 是否对：
   ```bash
   ls packages/<svc>/<docsRoot>/   # 应该能看到 .md / .mdx
   ```
2. 调整 `docsRoot` 或加 `exclude`（如 `["blog/**"]`）
3. 重新构建：
   ```bash
   npx docs-mcp build <svc>
   ```
4. 验证结果：`cat data/<svc>/pages.json | jq 'length'`

---

## 内核开发

`src/core/` 是内核模块，含：
- `indexer.ts`：文件收集 + markdown 切块 + 清理
- `embed.ts`：`all-MiniLM-L6-v2` 嵌入（hf-mirror 镜像）
- `server.ts`：MCP stdio server（探测 hybrid 自动兼容）
- `tools.ts`：4 工具实现
- `manifest.ts`：索引签名 + git commit 记录

修改后：
```bash
npx docs-mcp build <svc>   # 自动重编内核 + 重建索引
```

---

## CLI 开发

- `src/cli/index.ts`：命令路由（commander）
- `src/cli/commands/<cmd>.ts`：每个子命令一个文件
- 新增子命令流程：
  1. 在 `src/cli/commands/` 加 `<name>.ts` 导出 `xxxCommand(args, opts)`
  2. 在 `src/cli/index.ts` 加 `program.command('xxx').action(xxxCommand)`
  3. 在 README 的「8 个命令一览」加一行

---

## 风格约定

- **TypeScript strict**：所有新增文件必须通过 `tsc --noEmit`
- **依赖最小化**：能用 Node 内置（`node:fs` / `node:child_process`）就不引第三方
- **错误信息友好**：用户能直接从报错看出下一步（参考 `src/cli/log.ts` 的 `die()` / `log.error()`）

---

## 测试

`docs-mcp` 有两层测试：

### 1. 自动验证（`docs-mcp verify`）

```bash
npx docs-mcp verify
```

对每个已构建服务跑 6 个 MCP 协议测试（initialize / tools/list / search / get / list / 错误处理），
输出 `report/<svc>-docs-mcp-report.html` + `report/mcp-overview-report.html`。

CI 友好：每个服务返回 `{ pass, fail, total, results[] }`，单服务失败不影响其他服务。

### 2. 手动 smoke test

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}' \
  | node dist/core/server.js <svc>
```
应返回 `serverInfo: { name: "<svc>-docs" }`。

---

## 不在范围

- ❌ npm publish（暂不发布，按需 fork 使用）
- ❌ 远程 preset registry（暂用本地 presets/）
- ❌ GUI / Web 界面
- ❌ 自动检测 upstream 文档更新（建议手动 `git pull` 后 rebuild）

---

## 提交 PR 前自检

- [ ] `npx docs-mcp install <new-svc> --build` 成功
- [ ] `npx docs-mcp list --installed` 包含新服务
- [ ] `npx docs-mcp verify <new-svc>` 6/6 PASS
- [ ] `npx docs-mcp config --services <new-svc>` 输出 .mcp.json 字段正确
- [ ] README 服务清单加了对应行
- [ ] `presets/<svc>.json` 通过 zod schema 校验（install 失败即未通过）
