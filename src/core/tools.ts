import { search, MODE_HYBRID_SEARCH } from '@orama/orama';
import type { AnyOrama } from '@orama/orama';
import type { DocChunk, DocPage, SearchResult } from './types.js';
import { embed, EMBED_DIM } from './embed.js';

/** 缓存「db 是否支持向量检索」，避免对 fulltext-only 索引反复探测 + 白白加载 embedding 模型 */
const vectorCapability = new WeakMap<AnyOrama, boolean>();

/** 探测 db 是否含 embedding 向量字段（hybrid 索引）；失败则记为 false，降级 fulltext */
async function supportsVector(db: AnyOrama): Promise<boolean> {
  if (vectorCapability.has(db)) return vectorCapability.get(db)!;
  let ok = false;
  try {
    await search(db, {
      mode: MODE_HYBRID_SEARCH,
      term: '__probe__',
      vector: { value: Array.from({ length: EMBED_DIM }, () => 0), property: 'embedding' },
      similarity: 0,
      limit: 1,
    });
    ok = true; // 不抛错即说明 db 支持向量
  } catch {
    ok = false; // Unknown vector property → 旧 fulltext 索引
  }
  vectorCapability.set(db, ok);
  return ok;
}

/** 把 orama hits 映射为 SearchResult */
function mapResults(hits: Array<{ score: number; document: unknown }>, query: string, limit: number): SearchResult[] {
  if (hits.length === 0) return [];
  const maxScore = hits[0].score;
  const minScore = maxScore * 0.35;
  return hits
    .filter((h) => h.score >= minScore)
    .slice(0, limit)
    .map((hit) => {
      const doc = hit.document as unknown as DocChunk;
      return {
        title: doc.title,
        path: doc.path,
        category: doc.category,
        headings: doc.headings,
        excerpt: generateExcerpt(doc.content, query, 500),
        score: hit.score,
      };
    });
}

/** 搜索文档：hybrid 索引走 BM25+向量融合（根治语义跑偏），fulltext 索引降级纯 BM25 */
export async function searchDocs(
  db: AnyOrama,
  query: string,
  category: string | undefined,
  limit: number = 5,
): Promise<SearchResult[]> {
  const where: Record<string, string> = {};
  if (category) {
    where['category'] = category;
  }
  const whereCond = Object.keys(where).length > 0 ? where : undefined;
  const fetchLimit = Math.max(limit * 3, 15);
  const boost = { title: 5, headings: 3, content: 1 };

  if (await supportsVector(db)) {
    // hybrid：BM25 全文 + 向量语义融合，偏向量权重根治词频跑偏
    const qvec = await embed(query);
    const results = await search(db, {
      mode: MODE_HYBRID_SEARCH,
      term: query,
      vector: { value: qvec, property: 'embedding' },
      similarity: 0.5,
      properties: ['title', 'headings', 'content'],
      limit: fetchLimit,
      where: whereCond,
      hybridWeights: { text: 0.4, vector: 0.6 },
      boost,
    });
    return mapResults(results.hits, query, limit);
  }

  // fallback：纯 BM25（兼容无向量的旧索引，如尚未向量化的服务）
  const results = await search(db, {
    term: query,
    properties: ['title', 'headings', 'content'],
    limit: fetchLimit,
    where: whereCond,
    boost,
  });
  return mapResults(results.hits, query, limit);
}

/** 生成带上下文的内容摘要 */
function generateExcerpt(content: string, query: string, maxLength: number): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);

  let matchIndex = -1;
  for (const word of words) {
    const idx = lowerContent.indexOf(word);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
    }
  }

  if (matchIndex === -1) {
    return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, matchIndex - 100);
  const end = Math.min(content.length, start + maxLength);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < content.length ? '...' : '';

  return prefix + content.slice(start, end).trim() + suffix;
}

/** 获取完整文档页面 */
export function getPage(pages: DocPage[], docPath: string): DocPage | null {
  const normalized = docPath.replace(/^\//, '').replace(/\.md$/, '');
  return pages.find((p) => p.path === normalized) ?? null;
}

/** 列出文档章节结构 */
export function listSections(
  pages: DocPage[],
  category?: string,
): Array<{ title: string; path: string }> {
  const filtered = category ? pages.filter((p) => p.category === category) : pages;

  return filtered
    .filter((p) => p.title)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((p) => ({ title: p.title, path: p.path }));
}

/** grep：正则搜索所有页面内容，返回命中行+path（复刻官方 rg，用于「某 API/symbol 出现在哪些页」） */
export function grepDocs(
  pages: DocPage[],
  pattern: string,
  category: string | undefined,
  limit: number = 20,
): { error?: string; matches: Array<{ path: string; line: string }> } {
  let re: RegExp;
  try {
    re = new RegExp(pattern, 'i');
  } catch {
    return { error: `Invalid regex: ${pattern}`, matches: [] };
  }

  const scoped = category ? pages.filter((p) => p.category === category) : pages;
  const matches: Array<{ path: string; line: string }> = [];

  for (const p of scoped) {
    if (!p.content) continue;
    const lines = p.content.split('\n');
    for (const line of lines) {
      if (re.test(line)) {
        const trimmed = line.trim();
        if (trimmed) {
          matches.push({ path: p.path, line: trimmed.slice(0, 200) });
          if (matches.length >= limit) return { matches };
        }
      }
    }
  }

  return { matches };
}
