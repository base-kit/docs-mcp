/**
 * update — 拉取最新文档源码并重建索引
 *
 * 流程（每个服务）：
 *   1. git pull packages/<pkg>（默认）或 --force 重新克隆
 *   2. node dist/core/build-index.js <svc> 重建索引（pages/index/manifest 一并更新）
 *   3.（可选 --verify）跑 MCP 协议测试
 *
 * 浅克隆注意：packages/<pkg> 是 --depth 1 浅克隆。git pull --ff-only 通常可正常更新；
 *   若失败（shallow boundary），用 --force 重新克隆。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { log, table, die } from '../log.js';
import { getPreset, listPresetNames } from '../../preset/loader.js';
import { gitClone, gitPull, isGitRepo } from '../git.js';
import { verifyCommand } from './verify.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const BUILD_INDEX_JS = path.join(ROOT, 'dist', 'core', 'build-index.js');

interface UpdateOpts {
  all?: boolean;
  force?: boolean;
  verify?: boolean;
}

export async function updateCommand(services: string[], opts: UpdateOpts): Promise<void> {
  // 0. 内核必须已编译
  if (!fs.existsSync(BUILD_INDEX_JS)) {
    die('内核未编译，请先 npm run build');
  }

  // 1. 解析目标服务
  let targets: string[];
  if (services.length > 0) {
    targets = services;
  } else if (opts.all) {
    targets = listPresetNames().filter((n) => {
      const p = getPreset(n);
      const pkg = p?.package ?? n;
      return fs.existsSync(path.join(ROOT, 'packages', pkg, '.git'));
    });
  } else {
    log.error('请指定服务名，或用 --all 更新全部已安装服务');
    log.info('示例：docs-mcp update vue  |  docs-mcp update --all  |  docs-mcp update vue --verify');
    process.exit(1);
  }

  if (targets.length === 0) {
    log.warn('未找到任何已安装服务（packages/ 下无 git 仓库）');
    return;
  }

  log.section(`update · ${targets.length} 个服务${opts.force ? '（强制重新克隆）' : ''}`);

  const results: Array<[string, string, string]> = [];
  let successCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const name = targets[i];
    const preset = getPreset(name);
    if (!preset) {
      log.warn(`未找到预制 "${name}"，跳过`);
      results.push([name, '—', '✗ preset not found']);
      continue;
    }

    const pkg = preset.package ?? name;
    const pkgDir = path.join(ROOT, 'packages', pkg);
    log.step(i + 1, targets.length, `${preset.docsName} (packages/${pkg})`);

    // 2. 拉取最新源码
    if (opts.force) {
      if (fs.existsSync(pkgDir)) fs.rmSync(pkgDir, { recursive: true, force: true });
      const r = await gitClone(preset.repo, { dest: pkgDir, depth: 1, silent: true });
      if (!r.ok) {
        log.error(`  克隆失败: ${r.error}`);
        results.push([name, pkg, '✗ clone failed']);
        continue;
      }
      log.success('  重新克隆完成');
    } else {
      if (!(await isGitRepo(pkgDir))) {
        log.error(`  packages/${pkg} 不是 git 仓库，请先 install 或用 --force`);
        results.push([name, pkg, '✗ not a git repo']);
        continue;
      }
      const ok = await gitPull(pkgDir, true);
      if (!ok) {
        log.warn('  git pull 失败（浅克隆可能需 --force 重新克隆），跳过');
        results.push([name, pkg, '✗ pull failed (try --force)']);
        continue;
      }
      log.success('  git pull 完成');
    }

    // 3. 重建索引
    try {
      execSync(`node dist/core/build-index.js ${name}`, { cwd: ROOT, stdio: 'inherit' });
    } catch {
      log.error('  索引构建失败');
      results.push([name, pkg, '✗ build failed']);
      continue;
    }

    // 4.（可选）验证
    if (opts.verify) {
      try {
        await verifyCommand([name], {});
      } catch {
        log.warn('  verify 失败（索引已更新，可稍后单独 docs-mcp verify）');
      }
    }

    results.push([name, pkg, '✓ updated']);
    successCount++;
  }

  console.log();
  table(['服务', '目录', '结果'], results);
  log.success(`完成：${successCount}/${targets.length} 成功更新`);
  if (successCount > 0) {
    log.info('重启 Claude Code 会话以加载新索引');
  }
}
