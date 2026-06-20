/**
 * git clone / pull / fetch 封装（基于 child_process，避免 execa 依赖膨胀）
 */
import { spawn } from 'node:child_process';

export interface CloneOptions {
  /** 目标目录（绝对路径） */
  dest: string;
  /** 浅克隆深度（默认 1） */
  depth?: number;
  /** 仅克隆单个分支（默认 main） */
  branch?: string;
  /** 静默（不打印 stdout） */
  silent?: boolean;
}

/** 同步 git clone（直接返回结果） */
export async function gitClone(
  url: string,
  opts: CloneOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const args = ['clone', '--depth', String(opts.depth ?? 1)];
  if (opts.branch) args.push('--branch', opts.branch);
  args.push(url, opts.dest);
  return runGit(args, opts.silent);
}

/** 检查目录是否已是 git 仓库 */
export async function isGitRepo(dir: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn('git', ['-C', dir, 'rev-parse', '--git-dir'], { stdio: 'pipe' });
    p.on('exit', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });
}

/** git pull（用于 update 命令，暂未启用） */
export async function gitPull(dir: string, silent = false): Promise<boolean> {
  const result = await runGit(['-C', dir, 'pull', '--ff-only'], silent);
  return result.ok;
}

/** 内部：运行 git 命令并返回结果 */
function runGit(
  args: string[],
  silent?: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      stdio: silent ? 'pipe' : 'inherit',
    });
    let stderr = '';
    if (silent) {
      child.stderr?.on('data', (d) => (stderr += d.toString()));
    }
    child.on('exit', (code) => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: stderr.trim() || `git exit ${code}` });
    });
    child.on('error', (err) => resolve({ ok: false, error: err.message }));
  });
}
