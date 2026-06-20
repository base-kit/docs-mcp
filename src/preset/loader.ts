/**
 * 加载并缓存 presets/*.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { PresetSchema, type Preset } from './schema.js';

const PRESETS_DIR = path.resolve(import.meta.dirname, '..', '..', 'presets');

let cache: Map<string, Preset> | null = null;

/** 加载所有 preset（首次调用后缓存） */
export function loadAllPresets(): Map<string, Preset> {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(PRESETS_DIR)) return cache;
  for (const f of fs.readdirSync(PRESETS_DIR)) {
    if (!f.endsWith('.json')) continue;
    const raw = fs.readFileSync(path.join(PRESETS_DIR, f), 'utf-8');
    try {
      const parsed = PresetSchema.parse(JSON.parse(raw));
      cache.set(parsed.name, parsed);
    } catch (err) {
      console.error(`  ⚠ invalid preset ${f}:`, err instanceof Error ? err.message : err);
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
