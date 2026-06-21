/**
 * verify — 对每个已构建服务跑一组 MCP 协议测试，生成 HTML 报告
 *
 * 设计要点：
 * - MCP stdio 传输：每行一个 JSON 对象（JSON-RPC 2.0），无 Content-Length 头
 * - 并发限制 4（避免一次性 spawn 22 个 server 压爆机器）
 * - 每服务跑 5 个测试：initialize / tools/list / search / list_sections / get_doc + 1 个错误处理
 * - 输出：report/<svc>-docs-mcp-report.html + report/mcp-overview-report.html
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { log } from '../log.js';
import { getPreset } from '../../preset/loader.js';
import { DATA_DIR, SERVER_JS } from '../../core/paths.js';

const DEFAULT_OUTPUT = path.join(process.cwd(), 'report');
const CONCURRENCY = 4;

interface VerifyOpts {
  all?: boolean;
  output?: string;
}

interface TestCase {
  name: string;
  /** 描述（输出在 HTML 中） */
  desc: string;
  /** 工具调用（JSON-RPC params） */
  method: string;
  params?: Record<string, unknown>;
  /** 断言函数：返回 { pass, detail } */
  assert: (response: any) => { pass: boolean; detail: string };
}

interface TestResult {
  name: string;
  desc: string;
  pass: boolean;
  detail: string;
  raw?: unknown;
}

interface ServiceReport {
  service: string;
  docsName: string;
  mode: string;
  pass: number;
  fail: number;
  total: number;
  results: TestResult[];
  pagesIndexed: number;
  indexSizeKB: number;
  durationMs: number;
}

/** 入口 */
export async function verifyCommand(services: string[], opts: VerifyOpts): Promise<void> {
  // 1. 解析目标服务
  let targets: string[];
  if (services.length > 0) {
    targets = services;
  } else {
    // 默认：所有已构建索引的服务
    targets = fs
      .readdirSync(DATA_DIR)
      .filter((n) => fs.existsSync(path.join(DATA_DIR, n, 'index.json')));
  }
  if (targets.length === 0) {
    log.error('未找到已构建的服务。先跑 docs-mcp install --build。');
    process.exit(1);
  }

  const outputDir = opts.output ? path.resolve(opts.output) : DEFAULT_OUTPUT;
  fs.mkdirSync(outputDir, { recursive: true });

  log.section(`verify · ${targets.length} 个服务`);
  const reports: ServiceReport[] = [];

  // 2. 并发跑（限 CONCURRENCY）
  await runWithConcurrency(targets, CONCURRENCY, async (svc) => {
    const start = Date.now();
    const preset = getPreset(svc);
    const docsName = preset?.docsName ?? svc;
    const mode = preset?.mode ?? 'fulltext';
    log.info(`▶ ${svc} (${docsName})`);
    try {
      const results = await runTests(svc);
      const pass = results.filter((r) => r.pass).length;
      const fail = results.length - pass;
      const idxPath = path.join(DATA_DIR, svc, 'index.json');
      const pagesPath = path.join(DATA_DIR, svc, 'pages.json');
      const indexSizeKB = Math.round(fs.statSync(idxPath).size / 1024);
      let pagesIndexed = 0;
      try {
        pagesIndexed = JSON.parse(fs.readFileSync(pagesPath, 'utf-8')).length;
      } catch {}
      const report: ServiceReport = {
        service: svc,
        docsName,
        mode,
        pass,
        fail,
        total: results.length,
        results,
        pagesIndexed,
        indexSizeKB,
        durationMs: Date.now() - start,
      };
      reports.push(report);
      writeServiceReport(report, outputDir);
      log.success(`  ${svc}: ${pass}/${results.length} 通过 · ${pagesIndexed} 页 · ${indexSizeKB} KB · ${report.durationMs}ms`);
    } catch (e) {
      log.error(`  ${svc} 失败：${e instanceof Error ? e.message : e}`);
      reports.push({
        service: svc,
        docsName,
        mode,
        pass: 0,
        fail: 1,
        total: 1,
        results: [{
          name: 'MCP server 启动',
          desc: 'spawn + initialize',
          pass: false,
          detail: e instanceof Error ? e.message : String(e),
        }],
        pagesIndexed: 0,
        indexSizeKB: 0,
        durationMs: Date.now() - start,
      });
    }
  });

  // 3. 总览报告
  writeOverviewReport(reports, outputDir);
  log.success(`完成 · ${reports.filter((r) => r.fail === 0).length}/${reports.length} 服务全通过`);
  log.info(`报告：${outputDir}/`);
}

// ---------------------------------------------------------------------------
// 测试执行：spawn server + JSON-RPC over stdio
// ---------------------------------------------------------------------------

/** 5+1 个核心测试用例 */
function buildTests(svc: string): TestCase[] {
  const preset = getPreset(svc);
  const toolPrefix = (preset?.serverName ?? `${svc}-docs`).replace(/-docs$/, '');
  const docsName = preset?.docsName ?? svc;
  // 从 pages.json 取第一个真实存在的 path
  const firstPage = firstPagePath(svc);

  return [
    {
      name: 'MCP 协议握手',
      desc: 'initialize → serverInfo',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'docs-mcp-verify', version: '1.0.0' },
      },
      assert: (r) => {
        const info = r?.result?.serverInfo;
        const ok = info?.name === `${toolPrefix}-docs`;
        return { pass: ok, detail: ok ? `name: ${info.name}, version: ${info.version}` : `got: ${JSON.stringify(info)}` };
      },
    },
    {
      name: '工具列表',
      desc: `tools/list → 4 个工具（search_/get_/list_/grep_${toolPrefix}）`,
      method: 'tools/list',
      assert: (r) => {
        const tools = r?.result?.tools ?? [];
        const names = tools.map((t: any) => t.name).sort();
        const expected = [`get_${toolPrefix}_doc`, `grep_${toolPrefix}_docs`, `list_${toolPrefix}_doc_sections`, `search_${toolPrefix}_docs`];
        const ok = expected.every((n) => names.includes(n));
        return { pass: ok, detail: `tools: ${names.join(', ')}` };
      },
    },
    {
      name: '搜索测试',
      desc: `search_${toolPrefix}_docs("${docsName}", limit=3)`,
      method: 'tools/call',
      params: {
        name: `search_${toolPrefix}_docs`,
        arguments: { query: docsName, limit: 3 },
      },
      assert: (r) => {
        const text = r?.result?.content?.[0]?.text ?? '';
        // server 返回 markdown：`Found N results for "..."` 或 `No results found for "..."`
        const m = text.match(/Found (\d+) results/);
        const pass = m ? +m[1] > 0 : false;
        return { pass, detail: pass ? `返回 ${m![1]} 条结果` : `未命中或格式异常: ${text.slice(0, 80)}` };
      },
    },
    {
      name: '取完整页',
      desc: `get_${toolPrefix}_doc("${firstPage}")`,
      method: 'tools/call',
      params: {
        name: `get_${toolPrefix}_doc`,
        arguments: { path: firstPage },
      },
      assert: (r) => {
        const text = r?.result?.content?.[0]?.text ?? '';
        return { pass: text.length > 100, detail: `页面长度 ${text.length} 字符` };
      },
    },
    {
      name: '目录浏览',
      desc: `list_${toolPrefix}_doc_sections()`,
      method: 'tools/call',
      params: {
        name: `list_${toolPrefix}_doc_sections`,
        arguments: {},
      },
      assert: (r) => {
        // listSections 返回 markdown 文本：`## category\n  - title → \`path\``
        const text = r?.result?.content?.[0]?.text ?? '';
        const sections = (text.match(/→ /g) || []).length;
        const categories = (text.match(/^## /gm) || []).length;
        const ok = sections > 0 && categories > 0;
        return { pass: ok, detail: ok ? `${categories} 个分类 / ${sections} 个页面` : `sections=${sections}, categories=${categories}` };
      },
    },
    {
      name: '错误处理',
      desc: `get_${toolPrefix}_doc("nonexistent-page-xyz") → isError: true`,
      method: 'tools/call',
      params: {
        name: `get_${toolPrefix}_doc`,
        arguments: { path: 'nonexistent-page-xyz' },
      },
      assert: (r) => {
        const isError = r?.result?.isError === true;
        return { pass: isError, detail: isError ? 'isError: true ✓' : `got isError: ${r?.result?.isError}` };
      },
    },
  ];
}

/** 跑一组测试：spawn server，依次发请求 */
async function runTests(svc: string): Promise<TestResult[]> {
  const tests = buildTests(svc);
  const client = new McpClient(svc);
  await client.start();
  try {
    const results: TestResult[] = [];
    for (const t of tests) {
      try {
        const resp = await client.request(t.method, t.params);
        const { pass, detail } = t.assert(resp);
        results.push({ name: t.name, desc: t.desc, pass, detail, raw: resp });
      } catch (e) {
        results.push({ name: t.name, desc: t.desc, pass: false, detail: `请求失败: ${e instanceof Error ? e.message : e}` });
      }
    }
    return results;
  } finally {
    await client.stop();
  }
}

/** 简易 MCP stdio 客户端 */
class McpClient {
  private child: ChildProcess | null = null;
  private buffer = '';
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private initialized = false;

  constructor(private svc: string) {}

  async start(): Promise<void> {
    const serverPath = SERVER_JS;
    if (!fs.existsSync(serverPath)) {
      throw new Error(`内核未编译：${serverPath}（全局安装请重装 npm i -g @easy-base/docs-mcp；源码安装跑 npm run build）`);
    }
    this.child = spawn('node', [serverPath, this.svc], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stdout!.on('data', (chunk) => this.onData(chunk));
    this.child.stderr!.on('data', () => {}); // 忽略 stderr（噪声）
    this.child.on('exit', (code) => {
      // 未处理完的请求全部 reject
      for (const { reject } of this.pending.values()) {
        reject(new Error(`server exited with code ${code}`));
      }
      this.pending.clear();
    });
  }

  async stop(): Promise<void> {
    if (!this.child) return;
    this.child.kill();
    await new Promise((r) => setTimeout(r, 100));
    this.child = null;
  }

  async request(method: string, params?: Record<string, unknown>): Promise<any> {
    if (!this.child) throw new Error('client not started');
    const id = this.nextId++;
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child!.stdin!.write(msg);
      // 超时保护：hybrid 大索引（redis ~310MB）首次 search 需加载 embed 模型 + 向量检索，cold-start 可能 >10s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`request timeout: ${method}`));
        }
      }, 30_000);
    });
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString('utf-8');
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        const id = msg.id;
        if (this.pending.has(id)) {
          const { resolve } = this.pending.get(id)!;
          this.pending.delete(id);
          resolve(msg);
        }
      } catch {
        // 忽略非 JSON 行（server 可能打日志）
      }
    }
  }
}

/** 从 pages.json 取第一个 path（用于 get_doc 测试） */
function firstPagePath(svc: string): string {
  try {
    const pages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, svc, 'pages.json'), 'utf-8'));
    return pages[0]?.path ?? 'index';
  } catch {
    return 'index';
  }
}

/** 简易并发控制 */
async function runWithConcurrency<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// HTML 报告生成（暗色 + 渐变 + 表格，沿用现有风格）
// ---------------------------------------------------------------------------

function writeServiceReport(r: ServiceReport, outDir: string): void {
  const rowsHtml = r.results.map((t) => `
    <div class="detail-block">
      <h3>${escapeHtml(t.name)} <span class="badge ${t.pass ? 'badge-pass' : 'badge-fail'}">${t.pass ? 'PASS' : 'FAIL'}</span></h3>
      <div class="meta">${escapeHtml(t.desc)}</div>
      <pre>${escapeHtml(t.detail)}</pre>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>${escapeHtml(r.docsName)} Docs MCP 验证报告</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e0e0e0;line-height:1.6;padding:2rem}
  .container{max-width:960px;margin:0 auto}
  h1{font-size:2rem;background:linear-gradient(135deg,#646CFF,#BD34FE);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;border-bottom:2px solid #646CFF;padding-bottom:.5rem;margin-bottom:1.5rem}
  h2{font-size:1.3rem;color:#ccc;margin:2rem 0 1rem;padding-left:.5rem;border-left:3px solid #646CFF}
  .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem}
  .stat-card{background:#1a1a2e;border-radius:8px;padding:1.2rem;text-align:center}
  .stat-card .value{font-size:1.8rem;font-weight:700;background:linear-gradient(135deg,#646CFF,#BD34FE);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .stat-card .label{font-size:.85rem;color:#888;margin-top:.3rem}
  .detail-block{background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:1rem 1.2rem;margin-bottom:1rem;font-size:.9rem}
  .detail-block h3{color:#ccc;font-size:1rem;margin-bottom:.5rem;display:flex;justify-content:space-between;align-items:center}
  .detail-block .meta{color:#888;font-size:.8rem;margin-bottom:.5rem}
  pre{background:#0a0a0a;border:1px solid #2a2a2a;border-radius:6px;padding:.8rem;overflow-x:auto;font-size:.82rem;color:#42b883;margin:.5rem 0}
  .badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600}
  .badge-pass{background:#0d3320;color:#42b883}
  .badge-fail{background:#3d0d0d;color:#ff4242}
  .footer{text-align:center;color:#555;font-size:.8rem;margin-top:3rem;padding-top:1rem;border-top:1px solid #1a1a1a}
</style></head><body><div class="container">
<h1>⚡ ${escapeHtml(r.docsName)} Docs MCP Server — 验证报告</h1>
<div class="summary-grid">
  <div class="stat-card"><div class="value">${r.pass}/${r.total}</div><div class="label">测试通过</div></div>
  <div class="stat-card"><div class="value">${r.pagesIndexed}</div><div class="label">索引页面</div></div>
  <div class="stat-card"><div class="value">${r.indexSizeKB} KB</div><div class="label">索引大小</div></div>
  <div class="stat-card"><div class="value">${r.durationMs}<span style="font-size:.8em">ms</span></div><div class="label">测试耗时</div></div>
  <div class="stat-card"><div class="value">${r.mode}</div><div class="label">检索模式</div></div>
</div>
<h2>测试详情</h2>${rowsHtml}
<div class="footer">${escapeHtml(r.docsName)} Docs MCP Server · 由 docs-mcp verify 生成 · ${new Date().toISOString()}</div>
</div></body></html>`;
  const file = path.join(outDir, `${r.service}-docs-mcp-report.html`);
  fs.writeFileSync(file, html);
}

function writeOverviewReport(reports: ServiceReport[], outDir: string): void {
  const passAll = reports.filter((r) => r.fail === 0);
  const rowsHtml = reports.map((r) => `
    <tr>
      <td><code>${escapeHtml(r.service)}</code></td>
      <td>${escapeHtml(r.docsName)}</td>
      <td>${r.mode}</td>
      <td>${r.pass}/${r.total}</td>
      <td>${r.pagesIndexed}</td>
      <td>${r.indexSizeKB} KB</td>
      <td><span class="badge ${r.fail === 0 ? 'badge-pass' : 'badge-fail'}">${r.fail === 0 ? 'PASS' : 'FAIL'}</span></td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>docs-mcp 验证总览</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e0e0e0;line-height:1.6;padding:2rem}
  .container{max-width:1100px;margin:0 auto}
  h1{font-size:2rem;background:linear-gradient(135deg,#646CFF,#BD34FE);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;border-bottom:2px solid #646CFF;padding-bottom:.5rem;margin-bottom:1.5rem}
  .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem}
  .stat-card{background:#1a1a2e;border-radius:8px;padding:1.2rem;text-align:center}
  .stat-card .value{font-size:2rem;font-weight:700;background:linear-gradient(135deg,#646CFF,#BD34FE);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .stat-card .label{font-size:.85rem;color:#888;margin-top:.3rem}
  table{width:100%;border-collapse:collapse;margin:1rem 0}
  th,td{padding:.7rem 1rem;text-align:left;border-bottom:1px solid #2a2a2a}
  th{background:#1a1a2e;color:#aaa;font-weight:600;font-size:.85rem;text-transform:uppercase;letter-spacing:.5px}
  tr:hover td{background:#111}
  code{background:#1a1a2e;padding:1px 6px;border-radius:3px;font-size:.85em;color:#BD34FE}
  .badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.8rem;font-weight:600}
  .badge-pass{background:#0d3320;color:#42b883}
  .badge-fail{background:#3d0d0d;color:#ff4242}
  .footer{text-align:center;color:#555;font-size:.8rem;margin-top:3rem;padding-top:1rem;border-top:1px solid #1a1a1a}
</style></head><body><div class="container">
<h1>📊 docs-mcp 验证总览</h1>
<div class="summary-grid">
  <div class="stat-card"><div class="value">${reports.length}</div><div class="label">已验证服务</div></div>
  <div class="stat-card"><div class="value">${passAll.length}/${reports.length}</div><div class="label">全通过</div></div>
  <div class="stat-card"><div class="value">${reports.reduce((s, r) => s + r.pass, 0)}/${reports.reduce((s, r) => s + r.total, 0)}</div><div class="label">总测试</div></div>
  <div class="stat-card"><div class="value">${reports.reduce((s, r) => s + r.pagesIndexed, 0)}</div><div class="label">总页面</div></div>
</div>
<table>
  <thead><tr><th>服务</th><th>文档名</th><th>模式</th><th>通过</th><th>页数</th><th>索引</th><th>结果</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer">由 docs-mcp verify 生成 · ${new Date().toISOString()}</div>
</div></body></html>`;
  fs.writeFileSync(path.join(outDir, 'mcp-overview-report.html'), html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
