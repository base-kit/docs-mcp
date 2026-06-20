import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { collectTreeFiles, collectReadmeFiles, resolveRoot } from './indexer.js';
import type { ServiceConfig, Manifest } from './types.js';

/** 内核根目录 = 项目根（dist/core/manifest.js → ../../），与 indexer 保持一致 */
const CORE_ROOT = path.resolve(import.meta.dirname, '..', '..');

/** 收集某服务的所有源文件绝对路径（复用 tree/readme 收集逻辑，不读内容） */
export function collectSourceFiles(config: ServiceConfig): string[] {
  const files: string[] = [];
  for (const source of config.sources) {
    const root = resolveRoot(source.root);
    const exclude = source.exclude ?? [];
    const type = source.type ?? 'tree';
    if (!fs.existsSync(root)) continue;
    const collected =
      type === 'readme' ? collectReadmeFiles(root, exclude) : collectTreeFiles(root, exclude);
    for (const f of collected) files.push(f.abs);
  }
  return files;
}

/**
 * 计算文档源签名：相对路径 + mtime 的 sha1。
 * 不调 git，快速；供构建与运行期比对共用。
 */
export function computeSignature(config: ServiceConfig): { signature: string; fileCount: number } {
  const files = collectSourceFiles(config);
  const items = files
    .map((abs) => `${path.relative(CORE_ROOT, abs)}|${fs.statSync(abs).mtimeMs}`)
    .sort();
  const signature = crypto.createHash('sha1').update(items.join('\n')).digest('hex').slice(0, 12);
  return { signature, fileCount: files.length };
}

/** best-effort 获取文档源 git commit（构建时记录，失败返回 undefined） */
export function tryGitCommit(config: ServiceConfig): string | undefined {
  for (const source of config.sources) {
    try {
      const root = resolveRoot(source.root);
      return execSync('git rev-parse --short HEAD', {
        cwd: root,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
    } catch {
      // 非 git 仓库或 git 不可用，尝试下一个 source
    }
  }
  return undefined;
}

/** 构建完整 manifest（构建期调用） */
export function buildManifest(config: ServiceConfig): Manifest {
  const { signature, fileCount } = computeSignature(config);
  const gitCommit = tryGitCommit(config);
  return {
    builtAt: new Date().toISOString(),
    service: config.name,
    signature,
    fileCount,
    ...(gitCommit ? { gitCommit } : {}),
  };
}

/**
 * server 启动时检查文档是否过期：重算签名与已存 manifest 比对。
 * 过期则 stderr 警告（不中断启动，仅提示）。无 manifest 时跳过（向后兼容）。
 */
export function checkFreshness(service: string, config: ServiceConfig, dataDir: string): void {
  const manifestPath = path.join(dataDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  let stored: Manifest;
  try {
    stored = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return; // manifest 损坏，跳过
  }

  try {
    const current = computeSignature(config);
    if (current.signature !== stored.signature) {
      console.error(`⚠️  [${service}] 文档可能已更新：索引签名不匹配`);
      console.error(
        `   索引构建于 ${stored.builtAt}（${stored.fileCount} 文件）→ 当前 ${current.fileCount} 文件`,
      );
      console.error(`   建议重建：npx docs-mcp build ${service}`);
    }
  } catch {
    // 计算签名失败（如源文件被删/移动），视为过期
    console.error(`⚠️  [${service}] 无法校验文档签名，文档源可能已变动，建议重建索引`);
  }
}
