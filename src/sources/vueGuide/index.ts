import axios from 'axios';
import * as cheerio from 'cheerio';

import type { Element } from 'domhandler';

import type { DocSource, DocSourceMeta, Heading, ParsedDoc } from '../../types/doc.js';

const meta: DocSourceMeta = {
  id: 'vue@guide-en',
  name: 'Vue 3 Guide (en)',
  lang: 'en',
  version: '3',
  baseUrl: 'https://vuejs.org/guide/',
};

function 去掉多余空白(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function 规范化GuideUrl(rawHref: string, baseForRelative: string): string | null {
  if (!rawHref) return null;
  if (rawHref.startsWith('#')) return null;
  if (rawHref.startsWith('mailto:')) return null;

  let u: URL;
  try {
    u = new URL(rawHref, baseForRelative);
  } catch {
    return null;
  }

  if (u.hostname !== 'vuejs.org') return null;

  u.hash = '';
  u.search = '';

  // Vue Guide 的主体页面都在 /guide/ 下。
  if (!u.pathname.startsWith('/guide/')) return null;

  // 统一到「无 .html」的干净 URL（Vue 站点同时兼容两种形式）。
  u.pathname = u.pathname.replace(/\.html$/, '').replace(/\/+$/, '');

  // 过滤掉 /guide 根目录本身（没有明确内容页面）。
  if (u.pathname === '/guide') return null;

  return u.toString();
}

function 从Url提取Slug(url: string): string {
  const u = new URL(url);
  const p = u.pathname
    .replace(/\.html$/, '')
    .replace(/\/+$/, '')
    .replace(/^\/guide\//, '');

  return p || 'index';
}

function 生成Anchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

function 提取标题文本($: cheerio.CheerioAPI, el: Element): string {
  const $el = $(el).clone();
  // Vue 文档标题中会包含「header-anchor」作为可点击的锚点图标，纯文本索引时应移除。
  $el.find('a.header-anchor').remove();
  return 去掉多余空白($el.text());
}

export const vueGuideSource: DocSource = {
  meta,

  async fetchUrls(): Promise<string[]> {
    // 设计说明：
    // Vue 站点基于 VitePress，侧边栏在 HTML 中以 .VPSidebar 渲染。
    // 为了避免全站爬取，这里只解析侧边栏的链接作为「待抓取 URL 列表」。

    const startUrl = new URL('introduction', meta.baseUrl).toString();

    const res = await axios.get<string>(startUrl, {
      timeout: 30_000,
      responseType: 'text',
      headers: {
        'User-Agent': 'prodocs-crawler/0.1 (+https://github.com/)',
        'Accept-Language': 'en',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const $ = cheerio.load(res.data);

    const urls = new Set<string>();

    // 核心依赖点：侧边栏 DOM
    const hrefs = $('.VPSidebar a[href]')
      .map((_, el) => $(el).attr('href') || '')
      .get();

    for (const href of hrefs) {
      const normalized = 规范化GuideUrl(href, startUrl);
      if (normalized) urls.add(normalized);
    }

    // 确保包含起始页（防止未来侧边栏结构变化导致遗漏）
    urls.add(startUrl);

    const list = Array.from(urls);

    // 若侧边栏解析失败，则用少量硬编码 URL 兜底（MVP 可接受）。
    if (list.length < 5) {
      return [
        new URL('introduction', meta.baseUrl).toString(),
        new URL('quick-start', meta.baseUrl).toString(),
        new URL('essentials/application', meta.baseUrl).toString(),
        new URL('essentials/reactivity-fundamentals', meta.baseUrl).toString(),
        new URL('components/registration', meta.baseUrl).toString(),
      ];
    }

    return list.sort();
  },

  parsePage(html: string, url: string): ParsedDoc {
    const slug = 从Url提取Slug(url);
    const $ = cheerio.load(html);

    // 核心依赖点：正文容器
    // 当前 Vue Guide 页面中正文位于：.content main .vt-doc
    // 若未来站点结构调整，这里是最可能需要维护的地方。
    const $content = $('.content main .vt-doc').first();

    if (!$content.length) {
      throw new Error('未找到正文容器（.content main .vt-doc）');
    }

    // 克隆一份用于清洗，避免影响后续选择器。
    const $root = $content.clone();

    // 清洗：移除纯 UI 元素，避免污染 contentText 与 contentHtml。
    $root.find('a.header-anchor').remove();
    $root.find('button.copy, button[title="Copy Code"], span.lang').remove();
    $root.find('.vue-mastery-link').remove();

    const headings: Heading[] = [];
    const anchorCount = new Map<string, number>();

    $root.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tag = (el.tagName || '').toLowerCase();
      const level = Number(tag.replace('h', ''));
      if (!level || level < 1 || level > 6) return;

      const text = 提取标题文本($, el);
      if (!text) return;

      const $h = $(el);
      const existingId = $h.attr('id') || '';

      const baseAnchor = existingId || 生成Anchor(text) || `section-${headings.length + 1}`;

      const prev = anchorCount.get(baseAnchor) ?? 0;
      anchorCount.set(baseAnchor, prev + 1);

      const anchor = prev > 0 ? `${baseAnchor}-${prev + 1}` : baseAnchor;

      // 保证 contentHtml 中的标题具备可定位的 id。
      $h.attr('id', anchor);

      headings.push({ level, text, anchor });
    });

    const h1 = headings.find((h) => h.level === 1)?.text;
    const title = h1 || 去掉多余空白($('title').text()) || slug;

    // 这里取「正文容器的内部 HTML」，不包含外层 .vt-doc 包裹。
    const contentHtml = ($root.html() || '').trim();

    // 纯文本索引用：移除 copy 按钮/锚点后再取 text。
    const contentText = 去掉多余空白($root.text());

    return {
      slug,
      title,
      headings,
      contentText,
      contentHtml,
    };
  },
};
