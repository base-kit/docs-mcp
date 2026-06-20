/**
 * add — 添加新的开源仓库（非预制）到本地 MCP 化体系
 *
 * 流程：git clone <url> → 写 presets/<name>.json（成为预制）→ 写 services/<name>.json
 */
import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import { log } from '../log.js';
import { gitClone } from '../git.js';
import { PresetSchema } from '../../preset/schema.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const PRESETS_DIR = path.join(ROOT, 'presets');
const SERVICES_DIR = path.join(ROOT, 'services');

interface AddOpts {
  name?: string;
  docsRoot?: string;
  exclude?: string;
  mode?: string;
  docsName?: string;
  serverName?: string;
  interactive?: boolean;
  build?: boolean;
}

export async function addCommand(url: string, opts: AddOpts): Promise<void> {
  if (!/^https?:\/\//.test(url) && !url.startsWith('git@')) {
    log.error(`无效的 URL：${url}`);
    process.exit(1);
  }

  // 1. 推算默认 name
  const defaultName = inferName(url);
  let name = opts.name ?? defaultName;

  // 2. 交互模式（除非显式给了所有需要的字段）
  let docsRoot = opts.docsRoot ?? '';
  let docsName = opts.docsName ?? name;
  let exclude: string[] = opts.exclude ? opts.exclude.split(',').map((s) => s.trim()) : [];
  let mode: 'fulltext' | 'hybrid' = (opts.mode as 'fulltext' | 'hybrid') ?? 'fulltext';
  let serverName = opts.serverName ?? `${name}-docs`;

  if (opts.interactive || !opts.docsRoot) {
    const answers = await prompts([
      {
        type: 'text',
        name: 'name',
        message: '服务名（kebab-case，用于 CLI 命令）',
        initial: name,
        validate: (v: string) => /^[a-z0-9][a-z0-9-]*$/.test(v) ? true : '只允许小写字母、数字、连字符',
      },
      {
        type: 'text',
        name: 'docsRoot',
        message: 'docs 根目录（相对 packages/ 下的仓库目录）',
        initial: docsRoot || 'docs',
      },
      {
        type: 'text',
        name: 'docsName',
        message: '展示名（出现在 serverInfo 中）',
        initial: docsName,
      },
      {
        type: 'text',
        name: 'exclude',
        message: '排除 glob（逗号分隔，可留空）',
        initial: exclude.join(','),
      },
      {
        type: 'select',
        name: 'mode',
        message: '检索模式',
        choices: [
          { title: 'fulltext — 纯 BM25（默认，索引小、构建快）', value: 'fulltext' },
          { title: 'hybrid — BM25 + 向量（语义近似查询更强，索引约 3 倍）', value: 'hybrid' },
        ],
        initial: mode === 'hybrid' ? 1 : 0,
      },
    ]);
    name = answers.name;
    docsRoot = answers.docsRoot;
    docsName = answers.docsName;
    exclude = answers.exclude ? answers.exclude.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    mode = answers.mode;
  }

  // 3. 校验 name 不与现有预制冲突
  if (fs.existsSync(path.join(PRESETS_DIR, `${name}.json`))) {
    log.error(`已存在名为 "${name}" 的预制，请用不同 name 或先 remove`);
    process.exit(1);
  }

  // 4. 克隆
  fs.mkdirSync(PACKAGES_DIR, { recursive: true });
  const dest = path.join(PACKAGES_DIR, name);
  log.section(`add · ${name}`);
  log.info(`克隆 ${url} → packages/${name}`);
  const r = await gitClone(url, { dest, depth: 1, silent: true });
  if (!r.ok) {
    log.error(`克隆失败：${r.error}`);
    process.exit(1);
  }
  log.success(`克隆完成`);

  // 5. 写 preset
  const preset = {
    name,
    repo: url,
    serverName,
    docsName,
    docsRoot,
    ...(exclude.length ? { exclude } : {}),
    mode,
    description: `Added via docs-mcp add on ${new Date().toISOString().slice(0, 10)}`,
    meta: { addedAt: new Date().toISOString() },
  };
  const parsed = PresetSchema.parse(preset); // 校验
  fs.mkdirSync(PRESETS_DIR, { recursive: true });
  fs.writeFileSync(path.join(PRESETS_DIR, `${name}.json`), JSON.stringify(parsed, null, 2) + '\n');
  log.success(`已写入 presets/${name}.json`);

  // 6. 写 service config
  const cfg = {
    name: serverName,
    docsName,
    mode,
    sources: [
      {
        root: `packages/${name}/${docsRoot}`,
        ...(exclude.length ? { exclude } : {}),
      },
    ],
  };
  fs.mkdirSync(SERVICES_DIR, { recursive: true });
  fs.writeFileSync(path.join(SERVICES_DIR, `${name}.json`), JSON.stringify(cfg, null, 2) + '\n');
  log.success(`已写入 services/${name}.json`);

  log.info(`下一步：docs-mcp build ${name}（构建索引）`);
}

/** 从 URL 推算默认 name */
function inferName(url: string): string {
  // https://github.com/owner/repo(.git) → "repo"；特殊情形可手动覆盖
  const m = url.match(/[:/]([^/:]+?)(?:\.git)?$/);
  if (!m) return 'new-service';
  let name = m[1].toLowerCase();
  // 已知映射：docs → 文档仓名
  const alias: Record<string, string> = {
    docs: 'docs',
    documentation: 'docs',
    website: 'docs',
  };
  if (alias[name]) name = alias[name];
  return name.replace(/[^a-z0-9-]/g, '-');
}
