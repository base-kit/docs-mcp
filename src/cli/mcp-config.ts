/**
 * 生成 .mcp.json —— 读 .mcp.json.template（单个 server block），按服务列表复制 + 替换占位符
 */
import fs from 'node:fs';
import path from 'node:path';
import { log } from './log.js';
import { MCP_TEMPLATE, APP_ROOT } from '../core/paths.js';

export interface GenerateConfigOptions {
  /** 选中的服务名列表 */
  services: string[];
  /** docs-mcp 安装根绝对路径（absolute 模式用于定位 dist/core/server.js） */
  rootPath: string;
  /** 输出文件路径（默认 ./.mcp.json） */
  output?: string;
  /** true: 生成 `node <root>/dist/core/server.js` 绝对路径块（clone 源码且未 npm link 时用）；
   *  false（默认）: 生成 `docs-mcp serve` 可移植块（全局安装 / npm link 后用） */
  absolute?: boolean;
}

/** 生成 .mcp.json，返回写入的绝对路径 */
export function generateMcpConfig(opts: GenerateConfigOptions): string {
  if (!fs.existsSync(MCP_TEMPLATE)) {
    log.error(`模板文件不存在：${MCP_TEMPLATE}`);
    log.info('docs-mcp 安装可能损坏，请重装：npm i -g @easy-base/docs-mcp');
    process.exit(1);
  }
  const tplRaw = fs.readFileSync(MCP_TEMPLATE, 'utf-8');
  // 模板可能含注释行（// ...）和空行，剥离以保证 JSON 合法
  const tpl = tplRaw
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//') && line.trim() !== '')
    .join('\n');

  // 验证模板本身是合法 JSON object（一个 server block）
  let parsedTpl: unknown;
  try {
    parsedTpl = JSON.parse(tpl);
  } catch (e) {
    log.error(`模板 JSON 解析失败：${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  if (typeof parsedTpl !== 'object' || parsedTpl === null) {
    log.error('模板必须是一个 JSON object');
    process.exit(1);
  }

  // 为每个服务复制一份 + 替换占位符
  const servers: Record<string, unknown> = {};
  for (const svc of opts.services) {
    const block =
      opts.absolute
        ? { command: 'node', args: [path.join(opts.rootPath, 'dist', 'core', 'server.js'), svc] }
        : JSON.parse(JSON.stringify(parsedTpl).replace(/__SERVICE__/g, svc));
    servers[`${svc}-docs`] = block;
  }

  const finalJson = JSON.stringify({ mcpServers: servers }, null, 2) + '\n';
  const out = opts.output ? path.resolve(opts.output) : path.join(process.cwd(), '.mcp.json');
  fs.writeFileSync(out, finalJson);
  return out;
}

/** 推断 docs-mcp 安装根：env > APP_ROOT（server.js 在 APP_ROOT/dist/core/） */
export function detectRoot(): string {
  if (process.env.DOCS_MCP_ROOT) return process.env.DOCS_MCP_ROOT;
  return APP_ROOT;
}

/**
 * --with-claude-md：把消费方 CLAUDE.md + 选中服务 mcp-refs 输出到目标项目。
 * - mcp-refs：templates/consumer/mcp-refs/<svc>.md → 目标 .claude/mcp-refs/<svc>.md
 * - CLAUDE.md：templates/consumer/CLAUDE.md → 目标根 CLAUDE.md（已存在则输出 CLAUDE.docs-mdp.md 不覆盖）
 */
export function exportConsumerFiles(opts: {
  services: string[];
  /** 目标项目根（.mcp.json 所在目录） */
  targetDir: string;
}): { claudeMd: string; mcpRefs: string[]; claudeMdExists: boolean } {
  const templatesDir = path.resolve(import.meta.dirname, '..', '..', 'templates', 'consumer');
  if (!fs.existsSync(templatesDir)) {
    throw new Error(`消费方模板目录不存在：${templatesDir}`);
  }

  // 1. mcp-refs → 目标 .claude/mcp-refs/<svc>.md
  const refsOutDir = path.join(opts.targetDir, '.claude', 'mcp-refs');
  fs.mkdirSync(refsOutDir, { recursive: true });
  const mcpRefs: string[] = [];
  for (const svc of opts.services) {
    const src = path.join(templatesDir, 'mcp-refs', `${svc}.md`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(refsOutDir, `${svc}.md`));
      mcpRefs.push(svc);
    }
  }

  // 2. CLAUDE.md → 目标根（已存在则拷为 CLAUDE.docs-mcp.md 不覆盖用户已有）
  const tplClaude = path.join(templatesDir, 'CLAUDE.md');
  const targetClaude = path.join(opts.targetDir, 'CLAUDE.md');
  const claudeMdExists = fs.existsSync(targetClaude);
  const claudeMd = claudeMdExists
    ? path.join(opts.targetDir, 'CLAUDE.docs-mcp.md')
    : targetClaude;
  fs.copyFileSync(tplClaude, claudeMd);

  return { claudeMd, mcpRefs, claudeMdExists };
}
