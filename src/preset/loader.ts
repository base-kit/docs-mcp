/**
 * 加载并缓存 presets/*.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { PresetSchema, type Preset } from './schema.js';
import { BUILTIN_PRESETS_DIR, USER_PRESETS_DIR } from '../core/paths.js';

/** preset 搜索目录：内置（只读，跟包发布）+ 用户（add 写入，DATA_ROOT/presets）。用户同名覆盖内置 */
const PRESET_DIRS = [BUILTIN_PRESETS_DIR, USER_PRESETS_DIR];

let cache: Map<string, Preset> | null = null;

/** 加载所有 preset（首次调用后缓存） */
export function loadAllPresets(): Map<string, Preset> {
  if (cache) return cache;
  cache = new Map();
  // 顺序：内置先加载，用户后加载覆盖同名（用户同名 preset 优先）
  for (const dir of PRESET_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      try {
        const parsed = PresetSchema.parse(JSON.parse(raw));
        cache.set(parsed.name, parsed);
      } catch (err) {
        console.error(`  ⚠ invalid preset ${f}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  return cache;
}

/** 按 name 取单个 preset */
export function getPreset(name: string): Preset | undefined {
  return loadAllPresets().get(name);
}

/** 列出所有 preset name */
export function listPresetNames(): string[] {
  return [...loadAllPresets().keys()].sort();
}

/** 强制清除缓存（用于 watch / 重新加载） */
export function clearPresetCache(): void {
  cache = null;
}
