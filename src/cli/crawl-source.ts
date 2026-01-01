import 'dotenv/config';

import { runSource } from '../crawler/runSource.js';
import { getSourceById, listSources } from '../sources/index.js';

function 读取参数(name: string): string | null {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    if (arg === `--${name}`) {
      const idx = process.argv.indexOf(arg);
      const next = process.argv[idx + 1];
      if (next && !next.startsWith('--')) return next;
    }
  }
  return null;
}

function 打印用法(): void {
  const sources = listSources().map((s) => `- ${s.meta.id}：${s.meta.name}`).join('\n');
  console.log(`用法：node scripts/crawl-source.mjs --source=<sourceId>\n\n可用源：\n${sources}\n`);
}

const sourceId = 读取参数('source');
if (!sourceId) {
  打印用法();
  process.exit(1);
}

const source = getSourceById(sourceId);
if (!source) {
  console.error(`未找到文档源：${sourceId}`);
  打印用法();
  process.exit(1);
}

await runSource(source);
