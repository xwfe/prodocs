# prodocs

一个类似 devdocs.io 的文档聚合系统雏形实现。

## Milestone 1（当前）

- 仅实现后端爬虫与数据落盘（不做 HTTP API / 前端）。
- 第一个文档源：Vue 官方文档（Guide，英文）：https://vuejs.org/guide/
- 输出：本地 JSON 文件（`data/<sourceId>/<slug>.json`）。

## 使用方式

```bash
pnpm install

# 抓取 Vue Guide（en）
node scripts/crawl-source.mjs --source=vue@guide-en
```

抓取结果会输出到：

- `data/vue@guide-en/introduction.json`
- `data/vue@guide-en/essentials/reactivity-fundamentals.json`
- ...

> 说明：`data/` 目录属于爬虫输出，不纳入 Git 版本管理。
