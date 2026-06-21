#!/usr/bin/env node
// docs-mcp CLI 入口
// 生产 / 全局安装：跑预编译 dist/cli/index.js（无 tsx 运行期依赖、启动快）
// 开发模式：直接 `npm run dev`（tsx 跑 src/cli/index.ts），不走本文件

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'dist', 'cli', 'index.js');

if (!fs.existsSync(entry)) {
  console.error(`docs-mcp 入口不存在：${entry}`);
  console.error('源码安装请先 npm run build；全局安装请重装：npm i -g @easy-base/docs-mcp');
  process.exit(1);
}

const child = spawn('node', [entry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 0));
