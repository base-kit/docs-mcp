/**
 * serve — 运行 MCP stdio server（.mcp.json 注册的入口）
 *
 * 全局安装后 .mcp.json 用 `docs-mcp serve <svc>` 而非绝对路径，
 * 可移植、可进 git。内部 spawn APP_ROOT/dist/core/server.js，继承 stdio。
 *
 * 兼容 npm link 的源码安装：APP_ROOT 解析到 clone 目录，server.js 同样可达。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { SERVER_JS } from '../../core/paths.js';
import { die } from '../log.js';

export function serveCommand(service: string): void {
  if (!service) {
    die('用法：docs-mcp serve <service>');
  }
  if (!fs.existsSync(SERVER_JS)) {
    die(
      `内核未编译：${SERVER_JS}\n` +
        '全局安装请重装：npm i -g @easy-base/docs-mcp；源码安装请 npm run build',
    );
  }
  const child = spawn('node', [SERVER_JS, service], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}
