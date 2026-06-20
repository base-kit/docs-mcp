/**
 * 统一日志输出（带 spinner / 表格）
 */
import ora from 'ora';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

/** ANSI 颜色码（无依赖） */
const c = {
  gray: (s: string) => useColor ? `\x1b[90m${s}\x1b[0m` : s,
  red: (s: string) => useColor ? `\x1b[31m${s}\x1b[0m` : s,
  green: (s: string) => useColor ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: (s: string) => useColor ? `\x1b[33m${s}\x1b[0m` : s,
  cyan: (s: string) => useColor ? `\x1b[36m${s}\x1b[0m` : s,
  bold: (s: string) => useColor ? `\x1b[1m${s}\x1b[0m` : s,
  dim: (s: string) => useColor ? `\x1b[2m${s}\x1b[0m` : s,
};

export const log = {
  info: (msg: string) => console.log(`${c.cyan('ℹ')} ${msg}`),
  success: (msg: string) => console.log(`${c.green('✓')} ${msg}`),
  warn: (msg: string) => console.warn(`${c.yellow('⚠')} ${msg}`),
  error: (msg: string) => console.error(`${c.red('✗')} ${msg}`),
  plain: (msg: string) => console.log(msg),
  dim: (msg: string) => console.log(c.dim(msg)),
  step: (n: number, total: number, msg: string) =>
    console.log(`${c.gray(`[${n}/${total}]`)} ${msg}`),
  section: (msg: string) => console.log(`\n${c.bold(msg)}\n${c.gray('─'.repeat(msg.length))}`),
};

/** spinner：长时间任务 */
export function spinner(text: string) {
  return ora({ text, color: 'cyan', stream: process.stdout });
}

/** 表格输出（无依赖） */
export function table(headers: string[], rows: string[][]): void {
  // 计算列宽
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)),
  );
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
  // 表头
  console.log(headers.map((h, i) => c.bold(pad(h, widths[i]))).join('  '));
  console.log(widths.map((w) => c.gray('─'.repeat(w))).join('  '));
  // 数据
  for (const row of rows) {
    console.log(row.map((cell, i) => pad(cell, widths[i])).join('  '));
  }
}

/** 用法错误（exit 1） */
export function die(msg: string): never {
  log.error(msg);
  process.exit(1);
}
