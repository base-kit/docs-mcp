/**
 * list — 列出预制 / 已安装 / 已构建的服务
 */
import fs from 'node:fs';
import path from 'node:path';
import { log, table } from '../log.js';
import { listPresetNames, getPreset } from '../../preset/loader.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

interface ListOpts {
  installed?: boolean;
  built?: boolean;
  available?: boolean;
  json?: boolean;
}

export async function listCommand(opts: ListOpts): Promise<void> {
  const all = listPresetNames();
  const packagesDir = path.join(ROOT, 'packages');
  const dataDir = path.join(ROOT, 'data');

  const rows: Array<{ service: string; installed: boolean; built: boolean; mode: string; docs: string }> = all.map(
    (name) => {
      const p = getPreset(name)!;
      const pkgName = p.package ?? name;
      const installed = fs.existsSync(path.join(packagesDir, pkgName, '.git'));
      const built = fs.existsSync(path.join(dataDir, name, 'index.json'));
      return {
        service: name,
        installed,
        built,
        mode: p.mode ?? 'fulltext',
        docs: p.docsName,
      };
    },
  );

  let filtered = rows;
  if (opts.installed) filtered = rows.filter((r) => r.installed);
  else if (opts.built) filtered = rows.filter((r) => r.built);
  else if (opts.available) filtered = rows.filter((r) => !r.installed);

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  log.section(`list · ${filtered.length} 个服务`);
  table(
    ['服务', '文档名', '模式', '已安装', '已构建'],
    filtered.map((r) => [
      r.service,
      r.docs,
      r.mode,
      r.installed ? '✓' : '—',
      r.built ? '✓' : '—',
    ]),
  );
  log.info(`总计 ${all.length} 个预制，${rows.filter((r) => r.installed).length} 已安装，${rows.filter((r) => r.built).length} 已构建`);
}
