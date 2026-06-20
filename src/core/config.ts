import fs from 'node:fs';
import path from 'node:path';
import type { ServiceConfig } from './types.js';

/** services 目录：项目根 services/<service>.json（dist/core/config.js → ../../services） */
function serviceConfigPath(service: string): string {
  return path.resolve(import.meta.dirname, '..', '..', 'services', `${service}.json`);
}

/** 加载某个服务的配置 JSON */
export function loadServiceConfig(service: string): ServiceConfig {
  const file = serviceConfigPath(service);
  if (!fs.existsSync(file)) {
    throw new Error(`Service config not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as ServiceConfig;
}

/** 列出所有可用服务名（services/*.json 去扩展名） */
export function listServices(): string[] {
  const dir = path.resolve(import.meta.dirname, '..', '..', 'services');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

/** 工具前缀：vant-docs → vant，element-plus-docs → element-plus */
export function toolPrefix(name: string): string {
  return name.replace(/-docs$/, '');
}
