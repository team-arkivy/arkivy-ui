import { PageStatus } from './api.service';

/** RF-FLOW-01 badge — shared between documentation.html (page header) and doc-toc.html (TOC rows). */
export const PAGE_STATUS_LABEL: Record<PageStatus, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  published: 'Publicado',
};

export const PAGE_STATUS_CLASS: Record<PageStatus, string> = {
  draft: 'status-draft',
  in_review: 'status-in-review',
  published: 'status-published',
};
