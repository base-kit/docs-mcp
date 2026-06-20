/**
 * docs-mcp CLI 入口
 * 子命令：install / config / add / remove / build / list / preset
 */
import { Command } from 'commander';
import { installCommand } from './commands/install.js';
import { configCommand } from './commands/config.js';
import { addCommand } from './commands/add.js';
import { removeCommand } from './commands/remove.js';
import { buildCommand } from './commands/build.js';
import { listCommand } from './commands/list.js';
import { presetCommand } from './commands/preset.js';
import { verifyCommand } from './commands/verify.js';
import { updateCommand } from './commands/update.js';
import { log } from './log.js';

const VERSION = '1.0.0';

const program = new Command();
program
  .name('docs-mcp')
  .description('为 AI 编程提供开源项目的本地 MCP 文档服务')
  .version(VERSION);

program
  .command('install [services...]')
  .description('从 preset 拉取开源仓库到 packages/，并写入 service config')
  .option('--build', '拉取完成后立即构建索引')
  .option('--force', '强制重新克隆（删除已有目录）')
  .option('--depth <n>', 'git clone 深度', '1')
  .option('--no-deps', '跳过内核依赖检查')
  .action(installCommand);

program
  .command('add <url>')
  .description('添加一个新的开源仓库（非预制）到本地 MCP 化体系')
  .option('-n, --name <name>', '服务名（默认从 URL 推算）')
  .option('--docs-root <path>', 'docs 根目录（相对 packages/）')
  .option('--exclude <globs>', '排除 glob，逗号分隔')
  .option('--mode <mode>', '检索模式：fulltext | hybrid', 'fulltext')
  .option('--docs-name <name>', '展示名')
  .option('--server-name <name>', '.mcp.json 注册名')
  .option('-i, --interactive', '全交互模式填元数据')
  .option('--no-build', '不立即构建索引')
  .action(addCommand);

program
  .command('remove <service>')
  .alias('rm')
  .description('移除已添加的服务（删除 packages/ + services/ + data/）')
  .option('--keep-data', '保留索引数据')
  .option('--keep-source', '保留 packages/ 源码')
  .action(removeCommand);

program
  .command('build [services...]')
  .description('构建索引（dist/core/build-index.js）')
  .option('--all', '构建全部已安装服务')
  .option('--core-only', '仅重新编译 src/ → dist/')
  .action(buildCommand);

program
  .command('config')
  .description('交互式勾选服务并生成 .mcp.json')
  .option('--all', '全选全部已构建服务')
  .option('-o, --output <path>', '输出路径（默认 ./.mcp.json）')
  .option('--root <path>', 'docs-mcp-local 根绝对路径')
  .option('--services <list>', '逗号分隔的服务列表')
  .option('--with-claude-md', '一并输出消费方 CLAUDE.md + 选中服务 mcp-refs 到目标项目 .claude/')
  .action(configCommand);

program
  .command('list')
  .alias('ls')
  .description('列出预制 / 已安装 / 已构建的服务')
  .option('--installed', '仅列出已安装到 packages/ 的')
  .option('--built', '仅列出已构建索引的')
  .option('--available', '仅列出预制但未安装的')
  .option('--json', '以 JSON 输出')
  .action(listCommand);

program
  .command('preset <action> [name]')
  .description('预制清单管理（list | show <name>）')
  .action((action: string, name?: string) => presetCommand(action, name));

program
  .command('verify [services...]')
  .description('对每个已构建服务跑 MCP 协议测试，生成 HTML 验证报告')
  .option('--all', '验证全部已构建服务（默认行为）')
  .option('-o, --output <dir>', '报告输出目录', './report')
  .action(verifyCommand);

program
  .command('update [services...]')
  .description('拉取最新文档源码并重建索引（git pull + build）')
  .option('--all', '更新全部已安装服务')
  .option('--force', '强制重新克隆（而非 git pull）')
  .option('--verify', '更新后自动验证')
  .action(updateCommand);

// 默认无子命令时显示 help
program.action(() => {
  program.help();
});

program.parseAsync(process.argv).catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
