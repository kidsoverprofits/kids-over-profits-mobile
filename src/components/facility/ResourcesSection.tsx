import type { FacilityPayload } from '@/api/types';
import { urlLabel } from '@/lib/urlLabel';
import { HubListRow, SectionBlock } from '../site';
import type { SectionProps } from './model';
import { SubHead } from './parts';

type Row = { title: string; url?: string; meta?: string; head?: string };

/** The words for a link, never its address. */
const words = (label: string | undefined, url: string) => (label && !/^https?:\/\//i.test(label) ? label : urlLabel(url));

/**
 * The program's own links, then each group of research links under its sub-head (template: the 'resources' section).
 * The materials the project holds are ticked under "At a glance" (Glance.tsx).
 */
export function ResourcesSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const rows: Row[] = [];
  f.profile_links
    .map((l) => ({ url: l.url || l.go_url || '', label: l.label }))
    .filter((l) => l.url)
    .forEach((l, i) => rows.push({ url: l.url, title: words(l.label, l.url), head: i === 0 ? 'External links' : undefined }));
  for (const g of f.resource_links) {
    g.links
      .filter((l) => l.url || l.go_url)
      .forEach((l, i) => rows.push({ url: l.url || l.go_url || '', title: words(l.label, l.url || l.go_url || ''), head: i === 0 ? g.label : undefined }));
  }
  return (
    <SectionBlock id="resources" title="Materials and links" icon="link" items={rows} limit={8} onLayoutY={onLayoutY}
      renderItem={(r, i) => (
        <>
          {r.head ? <SubHead first={i === 0}>{r.head}</SubHead> : null}
          <HubListRow title={r.title} meta={r.meta} url={r.url} />
        </>
      )}
    />
  );
}

