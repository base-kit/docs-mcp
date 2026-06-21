/**
 * build — 重建索引（调用 src/core/build-index.ts 编译后产物）
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { log } from '../log.js';
import { APP_ROOT, BUILD_INDEX_JS, SERVICES_DIR } from '../../core/paths.js';

const SRC_DIR = path.join(APP_ROOT, 'src');
const DIST_DIR = path.join(APP_ROOT, 'dist');

interface BuildOpts {
  all?: boolean;
  coreOnly?: boolean;
}

export async function buildCommand(services: string[], opts: BuildOpts): Promise<void> {
  // 1. 编译（仅源码安装有效：全局安装无 src/，直接用预编译 dist）
  const distServer = path.join(DIST_DIR, 'core', 'server.js');
  if (fs.existsSync(SRC_DIR) && (!fs.existsSync(distServer) || sourceNewerThanDist())) {
    log.section('build · tsc');
    log.info('编译 src/ → dist/ ...');
    execSync('npm run build', { cwd: APP_ROOT, stdio: 'inherit' });
  } else if (!fs.existsSync(distServer)) {
    log.error(`内核未编译且无源码可编译：${distServer}`);
    log.info('全局安装用户请重装：npm i -g @easy-base/docs-mcp');
    process.exit(1);
  } else {
    log.info('dist/ 已存在，跳过编译（全局安装或源码未变）');
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
      execSync(`node "${BUILD_INDEX_JS}" ${svc}`, {
        cwd: APP_ROOT,
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
