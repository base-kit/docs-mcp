/**
 * preset — 预制清单管理（list / show）
 */
import { log } from '../log.js';
import { listPresetNames, getPreset } from '../../preset/loader.js';

export function presetCommand(action: string, name?: string): void {
  if (action === 'list') {
    const names = listPresetNames();
    log.section(`preset · ${names.length} 个预制`);
    for (const n of names) {
      const p = getPreset(n);
      console.log(`  ${n.padEnd(14)} ${p?.docsName ?? '?'}  ${p?.description ?? ''}`);
    }
  } else if (action === 'show') {
    if (!name) {
      log.error('用法：docs-mcp preset show <name>');
      process.exit(1);
    }
    const p = getPreset(name);
    if (!p) {
      log.error(`未找到预制 "${name}"`);
      process.exit(1);
    }
    log.section(`preset · ${name}`);
    console.log(JSON.stringify(p, null, 2));
  } else {
    log.error(`未知 action: "${action}"（支持: list / show）`);
    process.exit(1);
  }
}
