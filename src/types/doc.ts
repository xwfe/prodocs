export type DocSourceId = string; // 例如 "vue@guide-en"

export interface DocSourceMeta {
  id: DocSourceId;
  name: string;
  lang: string;
  version: string;
  baseUrl: string;
}

export interface Heading {
  level: number; // 1..6
  text: string;
  anchor: string; // HTML 中的 id
}

export interface DocRecord {
  /**
   * 系统内唯一 ID，例如："vue@guide-en/essentials/reactivity-fundamentals"
   */
  id: string;
  sourceId: DocSourceId;
  slug: string;
  title: string;
  url: string;
  headings: Heading[];
  contentText: string;
  contentHtml: string;
  createdAt: string; // ISO 时间字符串
  updatedAt: string;
}

export interface ParsedDoc {
  slug: string;
  title: string;
  headings: Heading[];
  contentText: string;
  contentHtml: string;
}

export interface DocSource {
  meta: DocSourceMeta;

  /**
   * 返回该源下所有待抓取的文档页面 URL 列表。
   * 优先使用官方导航结构，避免暴力全站爬。
   */
  fetchUrls(): Promise<string[]>;

  /**
   * 输入 HTML + URL，解析出统一结构的 ParsedDoc。
   * 调用方负责补充 DocRecord 的 id / sourceId / createdAt / updatedAt。
   */
  parsePage(html: string, url: string): ParsedDoc;
}
