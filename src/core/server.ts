import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { create, load, MODE_HYBRID_SEARCH } from '@orama/orama';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { DocPage, ServiceConfig } from './types.js';
import { searchDocs, getPage, listSections, grepDocs } from './tools.js';
import { loadServiceConfig, toolPrefix, listServices } from './config.js';
import { checkFreshness } from './manifest.js';
import { EMBED_DIM } from './embed.js';

/** 运行期版本：从项目根 package.json 读取（dist/core/ → ../../package.json） */
const PKG_VERSION = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf-8'),
).version as string;

const DOC_SCHEMA = {
  id: 'string',
  title: 'string',
  path: 'string',
  category: 'string',
  pageTitle: 'string',
  headings: 'string',
  content: 'string',
  embedding: `vector[${EMBED_DIM}]`,
} as const;

/** 旧 fulltext 索引 schema（无向量字段，兼容尚未向量化的服务） */
const DOC_SCHEMA_FULLTEXT = {
  id: 'string',
  title: 'string',
  path: 'string',
  category: 'string',
  pageTitle: 'string',
  headings: 'string',
  content: 'string',
} as const;

/** 加载某服务的预构建索引 */
async function loadIndex(
  service: string,
  config: ServiceConfig,
): Promise<{ db: any; pages: DocPage[] }> {
  const dir = path.resolve(import.meta.dirname, '..', '..', 'data', service);
  const indexPath = path.join(dir, 'index.json');
  const pagesPath = path.join(dir, 'pages.json');

  if (!fs.existsSync(indexPath) || !fs.existsSync(pagesPath)) {
    console.error(`Index not built for "${service}". Run: npx docs-mcp build ${service}`);
    process.exit(1);
  }

  const rawDB = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  // 探测索引是否含向量（hybrid 索引）：决定 schema 与 mode，兼容旧 fulltext 索引
  // O(1) 判定：hybrid 索引的 index.vectorIndexes 含 embedding 键，fulltext 为空对象 {}
  const hasVector = Object.keys(rawDB.index?.vectorIndexes ?? {}).length > 0;
  const schema = hasVector ? DOC_SCHEMA : DOC_SCHEMA_FULLTEXT;
  const createArgs: any = hasVector
    ? { schema, mode: MODE_HYBRID_SEARCH }
    : { schema };
  const db = await create(createArgs);
  await load(db, rawDB);
  const pages: DocPage[] = JSON.parse(fs.readFileSync(pagesPath, 'utf-8'));

  // 检查文档是否已更新（签名比对，过期仅警告不中断）
  checkFreshness(service, config, dir);

  console.error(`[${service}] Loaded ${pages.length} pages`);
  return { db, pages };
}

async function main() {
  const service = process.argv[2];
  if (!service) {
    console.error('Usage: node server.js <service>');
    console.error(`Available: ${listServices().join(', ')}`);
    process.exit(1);
  }

  const config = loadServiceConfig(service);
  const prefix = toolPrefix(config.name);
  const { db, pages } = await loadIndex(service, config);

  // 从 pages 派生合法 category（search/list 共用同一份，消除枚举不一致）
  const categories = [...new Set(pages.map((p) => p.category))].filter(Boolean).sort();
  const categorySchema = categories.length
    ? z.enum(categories as [string, ...string[]]).optional()
    : z.string().optional();

  const server = new McpServer({
    name: config.name,
    version: PKG_VERSION,
  });

  // ── search ────────────────────────────────────────────────────────────────
  server.tool(
    `search_${prefix}_docs`,
    `Search ${config.docsName} official documentation by keyword. Returns matching sections with scores.`,
    {
      query: z.string().describe(`Search query, e.g. "computed", "v-model", "store"`),
      category: categorySchema.describe('Filter by documentation category (optional)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum number of results (default: 5)'),
    },
    async ({ query, category, limit }) => {
      const results = await searchDocs(db, query, category, limit ?? 5);

      if (results.length === 0) {
        return { content: [{ type: 'text', text: `No results found for "${query}".` }] };
      }

      const output = results
        .map(
          (r, i) =>
            `### ${i + 1}. ${r.title}\n` +
            `- **Path**: \`${r.path}\`\n` +
            `- **Category**: ${r.category}\n` +
            `- **Section**: ${r.headings}\n` +
            `- **Score**: ${r.score.toFixed(2)}\n\n` +
            `${r.excerpt}\n`,
        )
        .join('\n---\n\n');

      return {
        content: [{ type: 'text', text: `Found ${results.length} results for "${query}":\n\n${output}` }],
      };
    },
  );

  // ── get ───────────────────────────────────────────────────────────────────
  server.tool(
    `get_${prefix}_doc`,
    `Get the full content of a specific ${config.docsName} documentation page. Provide the path without leading slash (use list_${prefix}_doc_sections to see available paths).`,
    {
      path: z.string().describe('Documentation page path, without leading slash or .md extension'),
    },
    async ({ path: docPath }) => {
      const page = getPage(pages, docPath);

      if (!page) {
        const normalized = docPath.replace(/^\//, '').replace(/\.md$/, '').toLowerCase();
        const suggestions = pages
          .filter(
            (p) => p.path.toLowerCase().includes(normalized) || p.title.toLowerCase().includes(normalized),
          )
          .slice(0, 5)
          .map((p) => `  - \`${p.path}\` — ${p.title}`);

        const suggestionText =
          suggestions.length > 0 ? `\n\nDid you mean one of these?\n${suggestions.join('\n')}` : '';

        return {
          content: [{ type: 'text', text: `Page not found: "${docPath}"${suggestionText}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `# ${page.title}\n\n**Path**: \`${page.path}\` | **Category**: ${page.category}\n\n${page.content}`,
          },
        ],
      };
    },
  );

  // ── list ──────────────────────────────────────────────────────────────────
  server.tool(
    `list_${prefix}_doc_sections`,
    `List the table of contents / section structure of ${config.docsName} documentation. Optionally filter by category.`,
    {
      category: categorySchema.describe('Filter by documentation category (optional, lists all if omitted)'),
    },
    async ({ category }) => {
      const sections = listSections(pages, category);

      if (sections.length === 0) {
        return {
          content: [{ type: 'text', text: `No sections found${category ? ` for category "${category}"` : ''}.` }],
        };
      }

      // 按 category 分组
      const grouped: Record<string, Array<{ title: string; path: string }>> = {};
      for (const s of sections) {
        const cat = s.path.split('/')[0];
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
      }

      const output = Object.entries(grouped)
        .map(([cat, items]) => {
          const header = `## ${cat}`;
          const list = items.map((item) => `  - ${item.title} → \`${item.path}\``).join('\n');
          return `${header}\n${list}`;
        })
        .join('\n\n');

      return {
        content: [
          { type: 'text', text: `${config.docsName} Documentation Sections (${sections.length} pages):\n\n${output}` },
        ],
      };
    },
  );

  // ── grep ──────────────────────────────────────────────────────────────────
  server.tool(
    `grep_${prefix}_docs`,
    `Grep (regex) across all ${config.docsName} documentation page content. Returns matching lines with paths — use to find where an API, symbol, or option name appears across the docs (like rg).`,
    {
      pattern: z
        .string()
        .describe('Regex pattern to search across documentation content (e.g. "proxy_pass", "since: 8", "t.Object")'),
      category: categorySchema.describe('Filter by documentation category (optional)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of matches (default: 20)'),
    },
    async ({ pattern, category, limit }) => {
      const { error, matches } = grepDocs(pages, pattern, category, limit ?? 20);
      if (error) {
        return { content: [{ type: 'text', text: error }], isError: true };
      }
      if (matches.length === 0) {
        return { content: [{ type: 'text', text: `No matches found for /${pattern}/.` }] };
      }
      const grepOutput = matches
        .map((m, i) => `${i + 1}. \`${m.path}\`: ${m.line}`)
        .join('\n');
      return {
        content: [
          { type: 'text', text: `${matches.length} matches for /${pattern}/:\n\n${grepOutput}` },
        ],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${config.docsName} Docs MCP Server started on stdio`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
