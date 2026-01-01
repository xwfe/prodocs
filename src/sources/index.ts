import type { DocSource, DocSourceId } from '../types/doc.js';

import { vueGuideSource } from './vueGuide/index.js';

const sources: Record<DocSourceId, DocSource> = {
  [vueGuideSource.meta.id]: vueGuideSource,
};

export function getSourceById(id: DocSourceId): DocSource | null {
  return sources[id] ?? null;
}

export function listSources(): DocSource[] {
  return Object.values(sources);
}
