// 命令行入口：通过 tsx 直接运行 TypeScript CLI（避免引入额外的构建步骤）。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..');
const entry = resolve(projectRoot, 'src/cli/crawl-source.ts');

const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(pnpmCmd, ['exec', 'tsx', entry, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
