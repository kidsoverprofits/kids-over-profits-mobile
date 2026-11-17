import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Era, FacilityPayload, LawsuitRow, MemorialRow } from '@/api/types';
import { cleanProse } from '@/lib/citations';
import { colors } from '@/theme/colors';
import { radius, spacing, type } from '@/theme/typography';
import {
  DirectoryFacilityRow,
  EdgeRow,
  FindingCard,
  HubListRow,
  InlineSources,
  NewsFolds,
  RecordNewsCard,
  SectionBlock,
  splitNews,
  useOpenLink,
  type TimelineItem,
} from '../site';
import { ERA_KINDS, eraCount, erasOf, homeRows, staffRows, violationsOf, type SectionProps, type Violation } from './model';
import { Lead, Limited, LimitedTimeline, SubHead, card } from './parts';
import { StaffRowView } from './PeopleSections';

/** One death, as the memorial list and a name's section draw it. */
function MemorialItem({ m, f }: { m: MemorialRow; f: FacilityPayload }) {
  const open = useOpenLink();
  return (
    <EdgeRow
      kind="death"
      title={m.name}
      meta={[m.age ? `age ${m.age}` : '', m.date_label || m.date, m.cause]}
      body={m.program && m.program !== f.name ? m.program : undefined}
      sources={[{ url: m.source_url, cite: m.source_name }]}
      onPress={m.kop_url || f.memorial_url ? () => open(m.kop_url || f.memorial_url) : undefined}
    />
  );
}

function ViolationItem({ v }: { v: Violation }) {
  return (
    <FindingCard
      severity={v.category === 'death' || v.category === 'sexual_abuse' ? 'grave' : v.severe ? 'severe' : 'other'}
      tag={v.label}
      date={v.date_label ? `Inspected ${v.date_label}` : undefined}
      quote={v.short || v.excerpt || ''}
      url={v.source_url}
    />
  );
}

function LawsuitItem({ l }: { l: LawsuitRow }) {
  return (
    <EdgeRow
      kind="lawsuit"
      title={l.case_name}
      meta={[l.case_number, l.court, l.year, l.status]}
      body={[l.outcome ? `Outcome: ${l.outcome}` : '', l.summary].filter(Boolean).join('\n\n') || undefined}
    />
  );
}

const timeline = (items: FacilityPayload['incidents']): TimelineItem[] =>
  items.map((i) => ({ when: i.when, kind: i.kind, text: i.text, sources: [i, ...(i.also ?? [])] }));

/**
 * A renamed program's page: one section per name, earliest first ("As Copper Canyon Academy"), each holding
 * what is dated to its years, the other name's record included, as the website cuts the page.
 */
export function ErasSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const eras = erasOf(f);
  if (!eras.length) return null;
  return (
    <>
      {eras.map((era) => (
        <EraSection key={era.id} era={era} f={f} onLayoutY={onLayoutY} />
      ))}
    </>
  );
}

function EraSection({ era, f, onLayoutY }: SectionProps & { era: Era; f: FacilityPayload }) {
  const open = useOpenLink();
  const meta = [era.years, (era.operators ?? []).join(', ')].filter(Boolean).join(' | ');
  const kinds = ERA_KINDS.filter((k) => eraCount(era, k.kind) > 0);
  return (
    <SectionBlock id={era.id} title={`As ${era.name}`} icon="book" onLayoutY={onLayoutY}>
      {meta ? <Lead>{meta}</Lead> : null}
      {era.url ? <HubListRow title="The record kept under this name" onPress={() => open(era.url)} /> : null}
      {kinds.length ? (
        kinds.map(({ kind, label }, i) => (
          <View key={kind} style={styles.eraPart}>
            <SubHead first={i === 0}>{label}</SubHead>
            {kind === 'memorials' ? (
              <Limited items={era.memorials} render={(m) => <MemorialItem m={m} f={f} />} />
            ) : kind === 'violations' ? (
              <Limited items={era.violations as Violation[]} render={(v) => <ViolationItem v={v} />} />
            ) : kind === 'lawsuits' ? (
              <Limited items={era.lawsuits} render={(l) => <LawsuitItem l={l} />} />
            ) : kind === 'incidents' ? (
              <LimitedTimeline items={timeline(era.incidents)} />
            ) : kind === 'news' ? (
              <EraNews items={era.news} />
            ) : (
              <Limited items={staffRows(era.staff)} limit={6} render={(row, j) => <StaffRowView row={row} index={j} />} />
            )}
          </View>
        ))
      ) : (
        <Lead>Nothing on record is dated to these years yet.</Lead>
      )}
    </SectionBlock>
  );
}

export function HomesSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const { isProgram, homes } = homeRows(f);
  const program = f.home_of?.program;
  const open = useOpenLink();
  if (!homes.length) return null;
  return (
    <SectionBlock
      id="homes"
      title={isProgram ? 'Homes' : `Other homes of ${program?.name ?? 'this program'}`}
      icon="home"
      items={homes}
      onLayoutY={onLayoutY}
      renderItem={(h) => <HubListRow title={h.title} meta={h.meta} url={h.url} />}>
      {!isProgram && program?.url ? (
        <HubListRow title="The whole program, with every home's news, lawsuits and serious findings" onPress={() => open(program.url)} />
      ) : null}
    </SectionBlock>
  );
}

/** Separate programs on the same campus, or a program and its academic program (school), as the website words it. */
export function CampusSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const c = f.campus;
  const others = c?.others ?? [];
  if (!c || !others.length) return null;
  const schoolOf = c.school_of?.length ?? 0;
  const schoolOnly = schoolOf + (c.schools?.length ?? 0) === others.length;
  const campus = (c.name ?? '').replace(/^the\s+/i, '');
  const title = schoolOnly
    ? schoolOf ? 'The program it is the school of' : 'Its academic program'
    : `Other programs on ${campus ? `the ${campus}` : 'the same campus'}`;
  const lead = schoolOnly
    ? schoolOf
      ? 'This is the academic program (the school) of the program below. Each has its own page and its own records.'
      : "The program's school, its academic program. Each has its own page and its own records."
    : 'Separate programs run side by side on one site, each with its own page and its own records.';
  return (
    <SectionBlock id="campus" title={title} icon="building" items={others} onLayoutY={onLayoutY}
      renderItem={(o) => (
        <HubListRow
          title={o.name}
          meta={[!schoolOnly && o.role === 'school' ? 'Academic program' : '', o.place, o.years, o.status && o.status !== 'Unknown' ? o.status : '']
            .filter(Boolean)
            .join(' | ')}
          url={o.url || undefined}
        />
      )}>
      <Lead>{lead}</Lead>
    </SectionBlock>
  );
}

/** A program made from a company record keeps the company's published history, at the top of its page. */
export function ProgramHistorySection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const h = f.history;
  if (!h?.paragraphs?.length) return null;
  return (
    <SectionBlock id="history" title="History" icon="book" onLayoutY={onLayoutY}>
      {h.paragraphs.map((p, i) => (
        <Text key={i} style={styles.paragraph}>
          {cleanProse(p)}
        </Text>
      ))}
      {h.sources?.length ? (
        <Text style={styles.meta}>
          {'Sources'}
          <InlineSources items={h.sources.map((s) => ({ url: s.url, cite: s.label }))} />
        </Text>
      ) : null}
    </SectionBlock>
  );
}

/** Federal money the program is on record as taking (Medicaid, child welfare funds, ...), by stream. */
export function FundingSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const streams = f.federal_funding ?? [];
  if (!streams.length) return null;
  return (
    <SectionBlock id="funding" title="Federal funding" icon="landmark" onLayoutY={onLayoutY}>
      <Lead>Federal money this program received, as government records, congressional reports and news coverage show it.</Lead>
      {streams.map((g, i) => (
        <View key={g.stream || i} style={styles.eraPart}>
          <SubHead>{g.label}</SubHead>
          {g.entries.map((e, j) => (
            <Text key={j} style={styles.body}>
              {e.years ? <Text style={styles.bold}>{`${e.years}: `}</Text> : null}
              {cleanProse(e.detail)}
              <InlineSources items={e.sources.map((s) => ({ url: s.url, cite: s.label }))} />
            </Text>
          ))}
        </View>
      ))}
    </SectionBlock>
  );
}

export function MemorialsSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  return (
    <SectionBlock id="memorials" title="Deaths on record" icon="candle" tone="grave" items={f.memorials} onLayoutY={onLayoutY}
      renderItem={(m) => <MemorialItem m={m} f={f} />} />
  );
}

export function ViolationsSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  return (
    <SectionBlock id="violations" title="Serious violations" icon="alert-triangle" tone="grave" items={violationsOf(f)} onLayoutY={onLayoutY}
      renderItem={(v) => <ViolationItem v={v} />} />
  );
}

export function LawsuitsSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  return (
    <SectionBlock id="lawsuits" title="Lawsuits" icon="scale" items={f.lawsuits} onLayoutY={onLayoutY}
      renderItem={(l) => <LawsuitItem l={l} />} />
  );
}

export function IncidentsSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const items = timeline(f.incidents);
  if (!items.length) return null;
  return (
    <SectionBlock id="incidents" title="Incidents on record" icon="siren" count={items.length} onLayoutY={onLayoutY}>
      <LimitedTimeline items={items} />
    </SectionBlock>
  );
}

/** A name's articles: the main list, then passing mentions and celebrity stories folded apart, as on the website. */
function EraNews({ items }: { items: Era['news'] }) {
  const { main, passing, aside } = splitNews(items);
  return (
    <View style={styles.eraNews}>
      <Limited items={main} limit={4} render={(n) => <RecordNewsCard item={n} />} />
      <NewsFolds passing={passing} aside={aside} />
    </View>
  );
}

export function NewsSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const { main, passing, aside } = splitNews(f.news);
  return (
    <SectionBlock id="news" title="News coverage" icon="newspaper" items={main} count={main.length} limit={4} onLayoutY={onLayoutY}
      renderItem={(n) => <RecordNewsCard item={n} />}>
      <NewsFolds passing={passing} aside={aside} />
    </SectionBlock>
  );
}

export function VideosSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const open = useOpenLink();
  return (
    <SectionBlock id="videos" title="Video" icon="tv" items={f.videos} onLayoutY={onLayoutY}
      renderItem={(v) => (
        <Pressable
          onPress={() => open(v.url)}
          accessibilityRole="link"
          accessibilityLabel={`${v.title || 'Video'}. Opens the video.`}
          style={({ pressed }) => [styles.video, pressed && styles.pressed]}>
          {v.thumb ? <Image source={{ uri: v.thumb }} accessible={false} contentFit="cover" style={styles.thumb} /> : null}
          <View style={styles.videoText}>
            <Text style={styles.videoTitle}>{v.title || 'Watch'}</Text>
            {v.source ? <Text style={styles.meta}>{v.source}</Text> : null}
          </View>
        </Pressable>
      )}
    />
  );
}

export function SiblingsSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const open = useOpenLink();
  return (
    <SectionBlock id="related" title={`Other programs run by ${f.operator?.name || 'the same operator'}`} icon="building" items={f.siblings} onLayoutY={onLayoutY}
      renderItem={(s) => (
        <DirectoryFacilityRow
          name={s.name}
          place={s.place}
          status={s.status && s.status !== 'Unknown' ? s.status : null}
          onPress={s.url ? () => open(s.url) : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  eraPart: { gap: spacing.sm },
  eraNews: { gap: spacing.sm },
  video: { ...card, overflow: 'hidden' },
  pressed: { backgroundColor: colors.sand },
  thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.sand, borderTopLeftRadius: radius.tile, borderTopRightRadius: radius.tile },
  videoText: { padding: 10, gap: spacing.xxs },
  videoTitle: { ...type.cardTitle },
  meta: { ...type.meta },
  paragraph: { ...type.body, lineHeight: 26 },
  body: { ...type.body },
  bold: { ...type.bodyBold },
});
