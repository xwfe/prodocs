import axios from 'axios';
import pLimit from 'p-limit';

import type { DocRecord, DocSource } from '../types/doc.js';
import { saveDocRecordToJson } from '../storage/jsonStorage.js';

export interface RunSourceOptions {
  concurrency?: number;
}

async function 拉取Html(url: string): Promise<string> {
  const res = await axios.get<string>(url, {
    timeout: 30_000,
    responseType: 'text',
    headers: {
      // 目标站点是开源文档站，仍应礼貌标识并控制并发。
      'User-Agent': 'prodocs-crawler/0.1 (+https://github.com/)',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  return res.data;
}

export async function runSource(source: DocSource, options: RunSourceOptions = {}): Promise<void> {
  const concurrency = options.concurrency ?? 5;
  const limit = pLimit(concurrency);

  console.log(`开始抓取文档源：${source.meta.name}（${source.meta.id}），并发=${concurrency}`);

  const urls = await source.fetchUrls();
  console.log(`发现待抓取页面：${urls.length} 个`);

  let success = 0;
  let failed = 0;

  await Promise.all(
    urls.map((url) =>
      limit(async () => {
        try {
          const html = await 拉取Html(url);
          const parsed = source.parsePage(html, url);

          const now = new Date().toISOString();
          const doc: DocRecord = {
            id: `${source.meta.id}/${parsed.slug}`,
            sourceId: source.meta.id,
            slug: parsed.slug,
            title: parsed.title,
            url,
            headings: parsed.headings,
            contentText: parsed.contentText,
            contentHtml: parsed.contentHtml,
            createdAt: now,
            updatedAt: now,
          };

          await saveDocRecordToJson(doc);
          success += 1;
          console.log(`成功：${parsed.slug}`);
        } catch (err) {
          failed += 1;
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`失败：${url}\n原因：${message}`);
        }
      }),
    ),
  );

  console.log(
    `抓取完成：总数=${urls.length}，成功=${success}，失败=${failed}（源：${source.meta.id}）`,
  );
}
