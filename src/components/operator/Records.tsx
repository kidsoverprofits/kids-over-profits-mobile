import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LawsuitRow, MemorialRow, OperatorPayload } from '@/api/types';
import { Button, EdgeRow, HubListRow, RecordNewsCard, SectionBlock, useOpenLink } from '@/components/site';
import { hitSlopFor } from '@/components/site/metrics';
import { cleanProse } from '@/lib/citations';
import { slugFromUrl } from '@/lib/links';
import { urlLabel } from '@/lib/urlLabel';
import { colors } from '@/theme/colors';
import { spacing, type } from '@/theme/typography';
import { aboutOf } from './model';

export function NewsSection({ o }: { o: OperatorPayload }) {
  return (
    <SectionBlock id="news" title="News coverage" icon="newspaper" items={o.news ?? []} limit={4} renderItem={(n) => <RecordNewsCard item={n} />} />
  );
}

const SUMMARY_SHOWN = 260;

/** A case: the summary cut at a word, "Read more" for the rest and the outcome. */
function Lawsuit({ l }: { l: LawsuitRow }) {
  const [all, setAll] = useState(false);
  const full = [l.outcome ? `Outcome: ${l.outcome}` : '', l.summary ?? ''].filter(Boolean).join('\n\n');
  const long = full.length > SUMMARY_SHOWN + 40;
  const cut = (l.summary ?? full).slice(0, SUMMARY_SHOWN);
  const short = `${cut.slice(0, cut.lastIndexOf(' ') > 120 ? cut.lastIndexOf(' ') : SUMMARY_SHOWN).replace(/[ ,.;:-]+$/, '')}…`;
  return (
    <View>
      <EdgeRow kind="lawsuit" title={l.case_name} meta={[l.year, l.status, l.court, l.case_number]} body={long && !all ? short : full} />
      {long ? (
        <Pressable
          onPress={() => setAll((a) => !a)}
          accessibilityRole="button"
          accessibilityLabel={all ? 'Show less of this case' : 'Read more of this case'}
          accessibilityState={{ expanded: all }}
          hitSlop={hitSlopFor(type.smallBold.lineHeight!)}
          style={styles.toggle}>
          <Text style={styles.toggleText}>{all ? 'Show less −' : 'Read more +'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LawsuitsSection({ o }: { o: OperatorPayload }) {
  return <SectionBlock id="lawsuits" title="Lawsuits" icon="scale" tone="warn" items={o.lawsuits ?? []} renderItem={(l) => <Lawsuit l={l} />} />;
}

function Death({ m }: { m: MemorialRow }) {
  const open = useOpenLink();
  const meta = [m.age ? `Age ${m.age}` : '', m.program, m.date_label, m.cause];
  return (
    <EdgeRow
      kind="death"
      title={m.name}
      meta={meta}
      sources={m.source_url ? [{ url: m.source_url, cite: m.source_name }] : undefined}
      onPress={m.kop_url ? () => open(m.kop_url) : undefined}
    />
  );
}

export function DeathsSection({ o }: { o: OperatorPayload }) {
  return <SectionBlock id="deaths" title="Deaths on record" icon="candle" tone="grave" items={o.memorials ?? []} renderItem={(m) => <Death m={m} />} />;
}

export function DocumentsSection({ o }: { o: OperatorPayload }) {
  const router = useRouter();
  if (!o.documents?.url) return null;
  const slug = slugFromUrl(o.url) || String(o.id);
  return (
    <SectionBlock id="documents" title="Documents" icon="file-text">
      <Button
        label="Open the document library"
        variant="secondary"
        icon="file-text"
        onPress={() => router.push({ pathname: '/documents/[slug]', params: { slug, kind: 'operator' } } as Href)}
        style={styles.button}
      />
    </SectionBlock>
  );
}

export function WebsitesSection({ o }: { o: OperatorPayload }) {
  return (
    <SectionBlock
      id="websites"
      title="Websites"
      icon="globe"
      items={o.websites ?? []}
      renderItem={(w) => (
        <HubListRow title={w.label && !/^https?:\/\//i.test(w.label) ? w.label : urlLabel(w.url)} url={w.go_url || w.url} />
      )}
    />
  );
}

/** Programs it runs or ran that are not troubled teen programs, by the category they are listed under. */
export function RelatedSection({ o }: { o: OperatorPayload }) {
  return (
    <SectionBlock
      id="related"
      title="Related programs"
      icon="building"
      items={o.related ?? []}
      limit={8}
      renderItem={(r) => (
        <HubListRow
          title={r.name}
          meta={[r.label, r.place, r.status && r.status !== 'Unknown' ? r.status : '', r.past ? 'Ran it in the past' : ''].filter(Boolean).join(' | ') || undefined}
          url={r.url || undefined}
        />
      )}>
      <Text style={styles.lead}>Programs it runs or ran that are not troubled teen programs, by the category they are listed under.</Text>
    </SectionBlock>
  );
}

/** "Materials and links": the company's links by group, the live site beside an archived one. */
export function MaterialsSection({ o }: { o: OperatorPayload }) {
  const groups = (o.resource_links ?? []).filter((g) => g.links?.length);
  if (!groups.length) return null;
  return (
    <SectionBlock id="materials" title="Materials and links" icon="link">
      {groups.map((g, i) => (
        <View key={`${g.kind}-${i}`} style={styles.group}>
          <Text style={styles.subhead}>{g.label}</Text>
          {g.links.map((l, j) => {
            const title = l.label && !/^https?:\/\//i.test(l.label) ? l.label : urlLabel(l.url || l.go_url || '');
            return (
              <View key={j}>
                <HubListRow title={title} url={l.url || l.go_url || undefined} />
                {l.live_url && l.go_url ? <HubListRow title={`${title}: the live site`} url={l.go_url} /> : null}
              </View>
            );
          })}
        </View>
      ))}
    </SectionBlock>
  );
}

/** The research notes as a list, for a company whose notes are not printed as its About. */
export function NotesSection({ o }: { o: OperatorPayload }) {
  const notes = (o.notes ?? []).map(cleanProse).filter(Boolean);
  if (!notes.length || aboutOf(o)) return null;
  return (
    <SectionBlock id="notes" title="Research notes" icon="lightbulb">
      {notes.map((n, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.dot}>{'•'}</Text>
          <Text style={styles.bulletText}>{n}</Text>
        </View>
      ))}
    </SectionBlock>
  );
}

const styles = StyleSheet.create({
  lead: { ...type.meta },
  group: { gap: spacing.xs, marginBottom: spacing.sm },
  subhead: { ...type.label },
  toggle: { alignSelf: 'flex-start', marginTop: spacing.sm, marginLeft: 17 },
  toggleText: { ...type.smallBold, color: colors.tealInk },
  button: { alignSelf: 'flex-start' },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  dot: { ...type.body, width: 12 },
  bulletText: { ...type.body, flex: 1 },
});
