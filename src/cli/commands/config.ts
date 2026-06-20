/**
 * config — 交互式勾选服务并生成 .mcp.json
 */
import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import { log } from '../log.js';
import { generateMcpConfig, detectRoot, exportConsumerFiles } from '../mcp-config.js';
import { listPresetNames } from '../../preset/loader.js';
import { getPreset } from '../../preset/loader.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

interface ConfigOpts {
  all?: boolean;
  output?: string;
  root?: string;
  services?: string;
  withClaudeMd?: boolean;
}

export async function configCommand(opts: ConfigOpts): Promise<void> {
  const allNames = listPresetNames();
  const built = allNames.filter((n) => fs.existsSync(path.join(DATA_DIR, n, 'index.json')));
  if (built.length === 0) {
    log.error('尚无已构建索引的服务。请先 docs-mcp build（建议先 docs-mcp install）。');
    process.exit(1);
  }

  let selected: string[];
  if (opts.services) {
    selected = opts.services.split(',').map((s) => s.trim()).filter(Boolean);
    // 校验
    const invalid = selected.filter((s) => !built.includes(s));
    if (invalid.length) {
      log.error(`以下服务未构建索引：${invalid.join(', ')}`);
      log.info(`已构建：${built.join(', ')}`);
      process.exit(1);
    }
  } else if (opts.all) {
    selected = built;
  } else {
    // 交互模式
    log.info(`已构建 ${built.length} 个服务，用空格切换选择，回车确认。`);
    const response = await prompts({
      type: 'multiselect',
      name: 'services',
      message: '选择要包含在 .mcp.json 中的服务',
      choices: built.map((n) => {
        const p = getPreset(n);
        return { title: `${n.padEnd(14)} ${p?.docsName ?? ''}`, value: n };
      }),
      hint: '— 空格切换，回车确认 —',
    });
    if (!response.services || response.services.length === 0) {
      log.warn('未选择任何服务，退出');
      return;
    }
    selected = response.services as string[];
  }

  const rootPath = opts.root || detectRoot();
  if (!fs.existsSync(path.join(rootPath, 'dist', 'core', 'server.js'))) {
    log.error(`指定的根目录缺少 dist/core/server.js：${rootPath}`);
    log.info('使用 --root <path> 显式指定，或在 docs-mcp-local 根目录下执行');
    process.exit(1);
  }

  const out = generateMcpConfig({
    services: selected,
    rootPath,
    output: opts.output,
  });
  log.success(`已生成 ${out}`);
  log.info(`包含 ${selected.length} 个服务：${selected.join(', ')}`);

  // 可选：一并输出消费方 CLAUDE.md + 选中服务 mcp-refs 到目标项目
  if (opts.withClaudeMd) {
    const { claudeMd, mcpRefs, claudeMdExists } = exportConsumerFiles({
      services: selected,
      targetDir: path.dirname(out),
    });
    log.success(`已输出消费方规范：${claudeMd}`);
    if (claudeMdExists) {
      log.warn('目标已存在 CLAUDE.md，消费方规范输出为 CLAUDE.docs-mcp.md（可手动合并或 @import）');
    }
    log.info(`mcp-refs 速查（${mcpRefs.length}）→ .claude/mcp-refs/：${mcpRefs.join(', ')}`);
  }

  log.info('在 Claude Code 中：将此文件软链或复制到项目根目录后重启会话');
}
