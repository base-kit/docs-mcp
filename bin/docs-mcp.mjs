#!/usr/bin/env node
// docs-mcp CLI 入口
// 开发模式（tsx 直接跑 .ts）：本文件不被使用，由 `npm run dev` 直接调用 src/cli.ts
// 生产 / bin 模式：tsx 加载 src/cli.ts（避免预编译步骤，便于 fork 后即用）

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'src', 'cli', 'index.ts');

// 优先用 tsx（如已安装）；fallback 到 node --experimental-strip-types（Node 22.6+）
const useTsx = await checkTsx();
const cmd = useTsx ? 'npx' : 'node';
const args = useTsx
  ? ['tsx', cli, ...process.argv.slice(2)]
  : ['--experimental-strip-types', '--no-warnings', cli, ...process.argv.slice(2)];

const child = spawn(cmd, args, { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));

/** 检测 tsx 是否可用 */
async function checkTsx() {
  try {
    await import('tsx');
    return true;
  } catch {
    return false;
  }
}
