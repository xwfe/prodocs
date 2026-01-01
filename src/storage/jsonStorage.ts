import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { DocRecord } from '../types/doc.js';

function 规范化文件名片段(input: string): string {
  // slug 来源于 URL：理论上不应包含目录穿越等危险片段，但这里仍做一层保护。
  const parts = input
    .replace(/\0/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && p !== '.' && p !== '..');

  return parts.join('/');
}

export async function saveDocRecordToJson(doc: DocRecord): Promise<void> {
  const safeSlug = 规范化文件名片段(doc.slug);
  const outPath = join(process.cwd(), 'data', doc.sourceId, `${safeSlug}.json`);

  await mkdir(dirname(outPath), { recursive: true });

  const content = JSON.stringify(doc, null, 2);
  await writeFile(outPath, `${content}\n`, 'utf8');
}
