/**
 * build — 重建索引（调用 src/core/build-index.ts 编译后产物）
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { log } from '../log.js';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const DIST_DIR = path.join(ROOT, 'dist');
const SERVICES_DIR = path.join(ROOT, 'services');

interface BuildOpts {
  all?: boolean;
  coreOnly?: boolean;
}

export async function buildCommand(services: string[], opts: BuildOpts): Promise<void> {
  // 1. 编译（如果 dist 不存在或源码变更）
  const distServer = path.join(DIST_DIR, 'core', 'server.js');
  if (!fs.existsSync(distServer) || sourceNewerThanDist()) {
    log.section('build · tsc');
    log.info('编译 src/ → dist/ ...');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  } else {
    log.info('dist/ 已存在且 src/ 未变，跳过编译');
  }

  if (opts.coreOnly) {
    log.success('仅编译完成');
    return;
  }

  // 2. 解析目标服务
  let targets = services;
  if (opts.all || targets.length === 0) {
    targets = fs
      .readdirSync(SERVICES_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  }
  if (targets.length === 0) {
    log.error('没有可构建的服务（services/ 为空）');
    process.exit(1);
  }

  log.section(`build · ${targets.length} 个服务的索引`);
  let success = 0;
  let failed = 0;
  for (const svc of targets) {
    log.step(success + failed + 1, targets.length, `构建 ${svc}`);
    try {
      execSync(`node dist/core/build-index.js ${svc}`, {
        cwd: ROOT,
        stdio: 'inherit',
      });
      success++;
    } catch {
      log.error(`  ✗ ${svc} 构建失败`);
      failed++;
    }
  }
  log.success(`完成：${success} 成功, ${failed} 失败`);
  if (success > 0) {
    log.warn('需要重启 Claude Code 会话才能加载新索引');
  }
}

function sourceNewerThanDist(): boolean {
  return latestMtime(SRC_DIR) > latestMtime(DIST_DIR);
}

function latestMtime(dir: string): number {
  let max = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) max = Math.max(max, latestMtime(p));
    else max = Math.max(max, stat.mtimeMs);
  }
  return max;
}
