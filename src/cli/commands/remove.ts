/**
 * remove — 移除服务（删除 packages/ + services/ + data/ 三件套）
 */
import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import { log } from '../log.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

interface RemoveOpts {
  keepData?: boolean;
  keepSource?: boolean;
}

export async function removeCommand(service: string, opts: RemoveOpts): Promise<void> {
  const targets = [
    { label: 'packages 源码', path: path.join(ROOT, 'packages', service), enabled: !opts.keepSource },
    { label: 'service config', path: path.join(ROOT, 'services', `${service}.json`), enabled: true },
    { label: 'preset 元数据', path: path.join(ROOT, 'presets', `${service}.json`), enabled: true },
    { label: '索引数据', path: path.join(ROOT, 'data', service), enabled: !opts.keepData },
  ].filter((t) => t.enabled && fs.existsSync(t.path));

  if (targets.length === 0) {
    log.warn(`未找到服务 "${service}" 的任何本地文件`);
    return;
  }

  log.section(`remove · ${service}`);
  for (const t of targets) {
    log.info(`将删除 ${t.label}: ${path.relative(ROOT, t.path)}`);
  }

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: '确认删除？',
    initial: false,
  });
  if (!confirm) {
    log.info('已取消');
    return;
  }

  for (const t of targets) {
    fs.rmSync(t.path, { recursive: true, force: true });
    log.success(`已删除 ${path.relative(ROOT, t.path)}`);
  }
}
