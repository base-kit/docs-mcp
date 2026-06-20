/**
 * preset schema (zod) — presets/*.json 的类型契约
 */
import { z } from 'zod';

export const PresetSchema = z.object({
  /** CLI 服务名（kebab-case），如 "vite" */
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),

  /** packages/ 下实际目录名（与 name 不同时填写，如 vue → vue-docs） */
  package: z.string().optional(),

  /** git clone URL（支持 https / ssh / git 协议） */
  repo: z.string().refine(
    (s) => /^https?:\/\/.+/.test(s) || /^git@.+:.+/.test(s) || s.startsWith('git://'),
    { message: 'repo must be https/http/ssh/git URL' },
  ),

  /** 注册到 .mcp.json 的 server 名（默认 `<name>-docs`） */
  serverName: z.string().optional(),

  /** 工具前缀（默认从 serverName 去 `-docs` 后缀派生） */
  toolPrefix: z.string().optional(),

  /** 展示名（用于 serverInfo + README 表格） */
  docsName: z.string().min(1),

  /** docs 根目录（相对 packages/<package>，如 `docs`、`src/content/docs`） */
  docsRoot: z.string().min(1),

  /** 排除 glob（相对 docsRoot） */
  exclude: z.array(z.string()).optional(),

  /** 检索模式 */
  mode: z.enum(['fulltext', 'hybrid']).optional(),

  /** 文档收集类型 */
  collectType: z.enum(['tree', 'readme']).optional(),

  /** pathPrefix（罕见） */
  pathPrefix: z.string().optional(),

  /** 描述 */
  description: z.string().optional(),

  /** 元信息 */
  meta: z
    .object({
      projectVersion: z.string().optional(),
      homepage: z.string().optional(),
      addedAt: z.string().optional(),
    })
    .optional(),
});

export type Preset = z.infer<typeof PresetSchema>;

/** services/<name>.json 内部结构（与内核 ServiceConfig 兼容） */
export const ServiceConfigSchema = z.object({
  name: z.string(),
  docsName: z.string(),
  sources: z.array(
    z.object({
      type: z.enum(['tree', 'readme']).optional(),
      root: z.string(),
      pathPrefix: z.string().optional(),
      exclude: z.array(z.string()).optional(),
    }),
  ),
  mode: z.enum(['fulltext', 'hybrid']).optional(),
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

/** 从 preset 派生最终 service config（含 root 路径拼接） */
export function presetToServiceConfig(preset: Preset): ServiceConfig {
  const pkg = preset.package ?? preset.name;
  return {
    name: preset.serverName ?? `${preset.name}-docs`,
    docsName: preset.docsName,
    mode: preset.mode,
    sources: [
      {
        ...(preset.collectType ? { type: preset.collectType } : {}),
        root: `packages/${pkg}/${preset.docsRoot}`,
        ...(preset.pathPrefix ? { pathPrefix: preset.pathPrefix } : {}),
        ...(preset.exclude ? { exclude: preset.exclude } : {}),
      },
    ],
  };
}
