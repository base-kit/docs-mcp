/**
 * install — 从 preset 拉取开源仓库到 packages/，并写入 service config
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getPreset, listPresetNames } from '../../preset/loader.js';
import { presetToServiceConfig } from '../../preset/schema.js';
import { gitClone, isGitRepo } from '../git.js';
import { log, table } from '../log.js';
import { PACKAGES_DIR, SERVICES_DIR, BUILD_INDEX_JS, APP_ROOT, ensureDataRoot } from '../../core/paths.js';

interface InstallOpts {
  build?: boolean;
  force?: boolean;
  depth?: string;
  deps?: boolean;
}

export async function installCommand(services: string[], opts: InstallOpts): Promise<void> {
  const targets = services.length > 0 ? services : listPresetNames();
  if (targets.length === 0) {
    log.error('未找到任何预制。请确认 presets/ 目录存在且含 JSON 文件。');
    process.exit(1);
  }

  ensureDataRoot();

  log.section(`install · ${targets.length} 个服务`);
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
    log.step(i + 1, targets.length, `克隆 ${preset.docsName} (${preset.repo})`);
    const pkgDir = preset.package ?? preset.name;
    const dest = path.join(PACKAGES_DIR, pkgDir);

    // 已存在处理
    if (fs.existsSync(dest)) {
      if (opts.force) {
        log.warn(`  强制删除已有目录: ${pkgDir}`);
        fs.rmSync(dest, { recursive: true, force: true });
      } else if (await isGitRepo(dest)) {
        log.info(`  已存在（git 仓库），跳过`);
        results.push([name, pkgDir, '✓ exists']);
        // 仍写一次 service config 以保证最新
        writeServiceConfig(preset);
        successCount++;
        continue;
      } else {
        log.warn(`  目录已存在但不是 git 仓库，使用 --force 覆盖`);
        results.push([name, pkgDir, '✗ exists, not git']);
        continue;
      }
    }

    // 克隆
    const cloneResult = await gitClone(preset.repo, {
      dest,
      depth: opts.depth ? parseInt(opts.depth, 10) : 1,
      silent: true,
    });
    if (!cloneResult.ok) {
      log.error(`  克隆失败: ${cloneResult.error}`);
      results.push([name, pkgDir, '✗ clone failed']);
      continue;
    }
    log.success(`  克隆完成: packages/${pkgDir}`);

    // 写 service config
    writeServiceConfig(preset);
    log.success(`  service config 已写入: services/${preset.serverName ?? preset.name}.json`);
    results.push([name, pkgDir, '✓ cloned']);
    successCount++;
  }

  console.log();
  table(['服务', '目录', '结果'], results);

  if (opts.build) {
    log.section('build · 重建索引');
    try {
      execSync(`node "${BUILD_INDEX_JS}" ${targets.join(' ')}`, {
        cwd: APP_ROOT,
        stdio: 'inherit',
      });
    } catch {
      log.error('索引构建失败');
      process.exit(1);
    }
  }

  log.success(`完成：${successCount}/${targets.length} 成功`);
  if (!opts.build) {
    log.info('下一步：docs-mcp build（构建索引）或 docs-mcp config（生成 .mcp.json）');
  }
}

function writeServiceConfig(preset: ReturnType<typeof getPreset> & object): void {
  if (!preset) return;
  const cfg = presetToServiceConfig(preset);
  const out = path.join(SERVICES_DIR, `${preset.name}.json`);
  fs.writeFileSync(out, JSON.stringify(cfg, null, 2) + '\n');
}
