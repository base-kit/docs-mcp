import fs from 'node:fs';
import path from 'node:path';
import { create, insert, MODE_HYBRID_SEARCH, type AnyOrama } from '@orama/orama';
import { embedBatch, EMBED_DIM } from './embed.js';
import type { DocChunk, DocPage, ServiceConfig, DocSource } from './types.js';

/** 项目根目录（dist/core/ → 上一级 dist/ → 再上一级项目根） */
const CORE_ROOT = path.resolve(import.meta.dirname, '..', '..');

// ---------------------------------------------------------------------------
// 文本处理工具（与原各服务实现逐字一致，已验证）
// ---------------------------------------------------------------------------

/** 清理 VitePress / Mintlify / Astro 特殊语法 */
function cleanContent(text: string): string {
  return text
    // 移除 :::info, :::warning, :::tip, :::danger 容器标记
    .replace(/^:::(info|warning|tip|danger|details)[^\n]*\n/gm, '')
    .replace(/^:::\s*$/gm, '')
    // 移除 heading anchor {#xxx}
    .replace(/\s*\{#[^}]+\}\s*$/gm, '')
    // 移除 Vue 特殊指令标记但保留内容
    .replace(/<VueSchoolLink[^>]*\/>/g, '')
    .replace(/<VideoLink[^>]*\/>/g, '')
    // 移除 MDX/Mintlify import 语句（import X from "..."）
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    // 移除自闭合 Mintlify/Astro 组件标签（保留内容型组件的正文）
    // <Note>...</Note> / <Warning>...</Warning> / <Callout>...</Callout>（保留内部文本）
    .replace(/<\/?(Note|Warning|Tip|Danger|Callout|Aside|Expandable|Steps|Step|Tabs|Tab|Cards|Card|ParamField|ParamFieldGroup|Columns|Icon|Frame)[^>]*\/?>/g, '')
    // 移除代码块元信息残留（如 ```ts db.ts icon="..." highlight={2}）→ 保留 ```ts 语言标记
    .replace(/```([a-z]+)\s+[^\n`]*/g, '```$1')
    .trim();
}

/** 从 markdown 提取 h1 标题，回退到 frontmatter title */
function extractTitle(content: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].replace(/\s*\{#[^}]+\}/, '').trim();
  // 回退：从 frontmatter 提取 title
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    const title = fm[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (title) return title[1].trim();
  }
  return '';
}

/** 从 heading 文本提取 anchor */
function extractAnchor(text: string): string {
  const match = text.match(/\{#([^}]+)\}/);
  return match ? match[1] : text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * 按 ## 拆分 markdown 为 chunk（与原实现一致）。
 * relativePath 与 category 由调用方计算后传入（不再依赖全局 DOCS_ROOT）。
 */
function splitIntoChunks(
  content: string,
  relativePath: string,
  category: string,
): DocChunk[] {
  const pageTitle = extractTitle(content);

  const lines = content.split('\n');
  const chunks: DocChunk[] = [];
  let currentHeading = '';
  let currentAnchor = '';
  let currentContent: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // 跟踪代码块状态
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    // 检测 ## 标题（不在代码块内）
    const headingMatch = !inCodeBlock && line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      // 保存前一个 chunk
      if (currentHeading || currentContent.length > 0) {
        const chunkText = currentContent.join('\n').trim();
        if (chunkText) {
          chunks.push({
            id: `${relativePath}#${currentAnchor || 'intro'}`,
            title: currentHeading || pageTitle,
            path: relativePath,
            category,
            pageTitle,
            headings: pageTitle + (currentHeading ? ` > ${currentHeading}` : ''),
            content: cleanContent(chunkText),
          });
        }
      }

      currentHeading = headingMatch[1].replace(/\s*\{#[^}]+\}/, '').trim();
      currentAnchor = extractAnchor(headingMatch[1]);
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // 保存最后一个 chunk
  const finalText = currentContent.join('\n').trim();
  if (finalText) {
    chunks.push({
      id: `${relativePath}#${currentAnchor || 'intro'}`,
      title: currentHeading || pageTitle,
      path: relativePath,
      category,
      pageTitle,
      headings: pageTitle + (currentHeading ? ` > ${currentHeading}` : ''),
      content: cleanContent(finalText),
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// 轻量 glob 匹配（支持 * 与 **，不引入新依赖）
// ---------------------------------------------------------------------------

const globCache = new Map<string, RegExp>();

/** 将 glob 模式转为正则：** → .*（含斜杠），* → [^/]* */
function globToRegex(glob: string): RegExp {
  const cached = globCache.get(glob);
  if (cached) return cached;

  let regex = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        // **/ → 匹配零或多个目录段（允许根级文件命中，如 x.zh-CN.md）
        regex += '(?:.*/)?';
        i += 2; // 跳过 ** 和 /
      } else {
        // ** → 匹配任意字符（含斜杠）
        regex += '.*';
        i += 1; // 跳过第二个 *
      }
    } else if (c === '*') {
      regex += '[^/]*';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      regex += '\\' + c;
    } else {
      regex += c;
    }
  }
  const re = new RegExp('^' + regex + '$');
  globCache.set(glob, re);
  return re;
}

/** 判断相对路径是否命中任意 exclude 规则 */
function isExcluded(relPath: string, patterns: string[]): boolean {
  for (const p of patterns) {
    if (globToRegex(p).test(relPath)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 文件收集：tree / readme 两种策略
// ---------------------------------------------------------------------------

/** tree：递归收集所有 .md/.mdx（过滤 node_modules、隐藏目录、exclude 命中） */
export function collectTreeFiles(root: string, exclude: string[]): Array<{ abs: string; rel: string }> {
  const out: Array<{ abs: string; rel: string }> = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // 跳过 node_modules 和隐藏目录
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        const fullRel = path.relative(root, path.join(currentDir, entry.name)).replace(/\\/g, '/');
        if (isExcluded(fullRel, exclude)) continue; // 排除检查用含扩展名的完整路径
        const rel = fullRel.replace(/\.(md|mdx)$/, ''); // path 去扩展名（.md / .mdx）
        out.push({ abs: path.join(currentDir, entry.name), rel });
      }
    }
  }

  walk(root);
  return out;
}

/** readme：遍历直接子目录，每目录取 README.md */
export function collectReadmeFiles(root: string, exclude: string[]): Array<{ abs: string; rel: string }> {
  const out: Array<{ abs: string; rel: string }> = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });

  for (const dir of entries) {
    if (!dir.isDirectory() || dir.name.startsWith('.')) continue;
    const rel = `${dir.name}/README.md`;
    if (isExcluded(rel, exclude)) continue;

    const abs = path.join(root, dir.name, 'README.md');
    if (fs.existsSync(abs)) {
      out.push({ abs, rel: dir.name });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// 构建索引
// ---------------------------------------------------------------------------

/** 解析配置中的相对路径为绝对路径（基准项目根） */
export function resolveRoot(rel: string): string {
  return path.resolve(CORE_ROOT, rel);
}

/** 处理单个文档源，返回其产生的 chunks 与 pages */
function indexSource(source: DocSource): { chunks: DocChunk[]; pages: DocPage[] } {
  const root = resolveRoot(source.root);
  const prefix = source.pathPrefix ?? '';
  const exclude = source.exclude ?? [];
  const type = source.type ?? 'tree';

  if (!fs.existsSync(root)) {
    console.warn(`  ⚠️  source root not found: ${root}`);
    return { chunks: [], pages: [] };
  }

  const files =
    type === 'readme' ? collectReadmeFiles(root, exclude) : collectTreeFiles(root, exclude);

  const chunks: DocChunk[] = [];
  const pages: DocPage[] = [];

  for (const { abs, rel } of files) {
    const raw = fs.readFileSync(abs, 'utf-8');
    const docPath = prefix + rel;
    const category = docPath.split('/')[0];

    chunks.push(...splitIntoChunks(raw, docPath, category));
    pages.push({
      path: docPath,
      title: extractTitle(raw),
      category,
      content: cleanContent(raw),
    });
  }

  console.log(`  [${type}] ${source.root} → ${files.length} files`);
  return { chunks, pages };
}

/** 构建完整索引 */
export async function buildIndex(
  config: ServiceConfig,
): Promise<{ chunks: DocChunk[]; pages: DocPage[] }> {
  console.log(`Building index for ${config.name}...`);
  const allChunks: DocChunk[] = [];
  const pages: DocPage[] = [];

  for (const source of config.sources) {
    const { chunks, pages: srcPages } = indexSource(source);
    allChunks.push(...chunks);
    pages.push(...srcPages);
  }

  console.log(`Total: ${allChunks.length} chunks, ${pages.length} pages`);

  // 去重 chunk id：同文件或跨文件归一化后 anchor 相同时，追加 -2/-3 后缀
  // 例如 node 文档 `## The module object` 与 `## The Module object` 归一化后同为 the-module-object
  const seen = new Map<string, number>();
  for (const chunk of allChunks) {
    const base = chunk.id;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count > 0) {
      chunk.id = `${base}-${count + 1}`;
    }
  }

  return { chunks: allChunks, pages };
}

const FULLTEXT_SCHEMA = {
  id: 'string',
  title: 'string',
  path: 'string',
  category: 'string',
  pageTitle: 'string',
  headings: 'string',
  content: 'string',
} as const;

/** 构建 orama 数据库：useHybrid=true 走 BM25+向量融合，否则纯 fulltext（默认，兼容小服务） */
export async function buildOramaDB(chunks: DocChunk[], useHybrid: boolean = false): Promise<AnyOrama> {
  if (!useHybrid) {
    const db = await create({ schema: FULLTEXT_SCHEMA });
    for (const chunk of chunks) {
      await insert(db, chunk);
    }
    console.log(`Indexed ${chunks.length} chunks into orama DB (fulltext)`);
    return db;
  }

  const db = await create({
    schema: { ...FULLTEXT_SCHEMA, embedding: `vector[${EMBED_DIM}]` } as const,
    mode: MODE_HYBRID_SEARCH,
  } as any);

  // 为每个 chunk 生成 embedding（用 title + 内容前缀，截断避免超 token 上限）
  const embedTexts = chunks.map((c) =>
    `${c.title}. ${c.headings}. ${c.content.slice(0, 500)}`.slice(0, 800),
  );
  console.log(`Generating ${chunks.length} embeddings (all-MiniLM-L6-v2)...`);
  const vectors = await embedBatch(embedTexts);

  for (let i = 0; i < chunks.length; i++) {
    await insert(db, { ...chunks[i], embedding: vectors[i] });
  }

  console.log(`Indexed ${chunks.length} chunks into orama DB (hybrid: BM25 + vector)`);
  return db;
}
