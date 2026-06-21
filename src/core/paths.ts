/**
 * 双根路径基准（全局 npm 安装改造核心）
 *
 * - APP_ROOT：代码/只读资源根，跟随包安装位置（dist/core/paths.js → ../.. = 包根）
 *   含 dist/、presets/（内置）、templates/、package.json、.mcp.json.template
 * - DATA_ROOT：用户可写数据根，默认 ~/.docs-mcp，可被 DOCS_MCP_DATA 覆盖
 *   含 packages/（克隆的文档源）、data/（索引产物）、services/（service config）、
 *      presets/（用户 add 的 preset）、models/（hybrid 模型缓存）
 *
 * 关键约束：升级包绝不触碰 DATA_ROOT（用户数据不丢）；DATA_ROOT 可写、无需 sudo。
 * 这是全局 npm 安装可行性的地基——代码根与数据根分离后，包可装到任意位置（含全局），
 * 而所有可写状态集中在用户目录。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** 代码/只读资源根：本文件编译后在 dist/core/paths.js，上溯 2 级到包根 */
export const APP_ROOT = path.resolve(import.meta.dirname, '..', '..');

/** 用户数据根：env DOCS_MCP_DATA 覆盖，默认 ~/.docs-mcp */
export const DATA_ROOT: string = process.env.DOCS_MCP_DATA || path.join(os.homedir(), '.docs-mcp');

/** 克隆的文档源码（git 仓库，--depth 1 浅克隆） */
export const PACKAGES_DIR = path.join(DATA_ROOT, 'packages');
/** 索引产物（index.json / pages.json / manifest.json） */
export const DATA_DIR = path.join(DATA_ROOT, 'data');
/** service config（install/add 自动生成） */
export const SERVICES_DIR = path.join(DATA_ROOT, 'services');
/** 用户 preset（add 命令写入；内置 preset 在 BUILTIN_PRESETS_DIR 只读） */
export const USER_PRESETS_DIR = path.join(DATA_ROOT, 'presets');
/** hybrid 模型缓存（all-MiniLM-L6-v2） */
export const MODELS_DIR = path.join(DATA_ROOT, 'models');

/** 内置 preset（只读，跟包发布） */
export const BUILTIN_PRESETS_DIR = path.join(APP_ROOT, 'presets');
/** 消费方模板（只读，跟包发布） */
export const TEMPLATES_DIR = path.join(APP_ROOT, 'templates');
/** .mcp.json 模板（只读，跟包发布） */
export const MCP_TEMPLATE = path.join(APP_ROOT, '.mcp.json.template');
/** 预编译内核入口（运行期 server / 构建期 build-index） */
export const SERVER_JS = path.join(APP_ROOT, 'dist', 'core', 'server.js');
export const BUILD_INDEX_JS = path.join(APP_ROOT, 'dist', 'core', 'build-index.js');

/** 确保数据根目录存在（CLI 写入前调用） */
export function ensureDataRoot(): void {
  for (const dir of [PACKAGES_DIR, SERVICES_DIR, DATA_DIR, USER_PRESETS_DIR, MODELS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
