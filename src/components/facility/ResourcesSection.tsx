import { StyleSheet, Text, View } from 'react-native';

import type { FacilityPayload } from '@/api/types';
import { urlLabel } from '@/lib/urlLabel';
import { colors } from '@/theme/colors';
import { HubListRow, SectionBlock } from '../site';
import type { SectionProps } from './model';
import { SubHead } from './parts';

type Row = { title: string; url?: string; meta?: string; head?: string; held?: string[] };

/** The words for a link, never its address. */
const words = (label: string | undefined, url: string) => (label && !/^https?:\/\//i.test(label) ? label : urlLabel(url));

/**
 * The materials the project holds as one row of small ticked boxes (not online, so no links), then the program's own
 * links, then each group of research links under its sub-head (template: the 'resources' section, .kop-fp-held).
 */
export function ResourcesSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const rows: Row[] = [];
  const held = (f.resources ?? []).map((r) => (r.label === 'Note' && r.detail ? r.detail : r.label));
  if (held.length) rows.push({ title: '', held });
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
          {r.held ? (
            <View style={styles.held} accessibilityLabel="Materials the project holds">
              {r.held.map((label, j) => (
                <View key={j} style={styles.heldItem}>
                  <Text style={styles.box} accessibilityElementsHidden importantForAccessibility="no">{'✓'}</Text>
                  <Text style={styles.heldText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <HubListRow title={r.title} meta={r.meta} url={r.url} />
          )}
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  held: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, marginBottom: 12 },
  heldItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  box: {
    width: 16, height: 16, borderWidth: 1, borderColor: colors.tealInk, borderRadius: 2, backgroundColor: colors.white,
    color: colors.tealInk, fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center',
  },
  heldText: { fontSize: 14, lineHeight: 20, color: colors.textPrimary, flexShrink: 1 },
});
