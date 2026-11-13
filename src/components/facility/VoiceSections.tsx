import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { FacilityPayload } from '@/api/types';
import { colors } from '@/theme/colors';
import { spacing, type } from '@/theme/typography';
import { AboutText, hasAbout } from '../record/About';
import { ResearchList, SourceArchives } from '../record/Archives';
import { Quote } from '../record/Quote';
import { Button, HubListRow, SectionBlock, type TimelineItem } from '../site';
import type { SectionProps } from './model';
import { Bullets, LimitedTimeline } from './parts';

/** The page has a Documents section: our library, research that names it, or files others hold. */
export const hasDocuments = (f: FacilityPayload) => !!f.documents?.url || (f.research?.length ?? 0) > 0 || (f.archives?.length ?? 0) > 0;

/**
 * Documents, as the website lists them: our library (opened in the app), research in our library that names the
 * program, then the files Unsilenced and survivor sites published that we do not hold.
 */
export function DocumentsSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const router = useRouter();
  if (!hasDocuments(f)) return null;
  return (
    <SectionBlock id="documents" title="Documents" icon="file-text" onLayoutY={onLayoutY}>
      {f.documents?.url ? (
        <Button
          variant="secondary"
          icon="file-text"
          label="Open the document library"
          onPress={() => router.push({ pathname: '/documents/[slug]', params: { slug: f.slug, kind: 'facility' } } as Href)}
          style={styles.button}
        />
      ) : null}
      <ResearchList docs={f.research} />
      <SourceArchives archives={f.archives} />
    </SectionBlock>
  );
}

/**
 * The record's About near the top of the page (the website's "About <name>"): its research notes as cited prose, or
 * its published write-up, with the field notes under it.
 */
export function AboutSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  if (!hasAbout(f.about) && !f.field_notes.length) return null;
  return (
    <SectionBlock id="about" title={`About ${f.name}`} icon="book" onLayoutY={onLayoutY}>
      {hasAbout(f.about) ? <AboutText about={f.about} /> : null}
      <FieldNotes f={f} />
    </SectionBlock>
  );
}

function FieldNotes({ f }: { f: FacilityPayload }) {
  if (!f.field_notes.length) return null;
  return (
    <View style={styles.field}>
      {f.field_notes.map((n, i) => (
        <Text key={i} style={styles.body}>
          {n.label ? <Text style={styles.bold}>{`${n.label}: `}</Text> : null}
          {n.text}
        </Text>
      ))}
    </View>
  );
}

/** The quotes the testimony section holds: survivors' published accounts, then readers' answers to the questions page. */
export const testimonyCount = (f: FacilityPayload) => f.testimony.length + (f.readers?.length ?? 0);

/**
 * Survivors' own accounts, each in the site's midnight-framed notice: their words, who and where they are from (linked
 * to the original), and the note a quote naming staff carries. Readers' answers from the questions page follow.
 */
export function TestimonySection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const readers = f.readers ?? [];
  const items = [
    ...f.testimony.map((t) => ({
      text: t.text,
      credit: t.credit || `${t.submitted ? 'Submitted by a survivor' : 'Survivor account'}${t.date_label ? `, shared ${t.date_label}` : ''}`,
      url: t.url || undefined,
      note: t.note || undefined,
      staff: undefined as string[] | undefined,
    })),
    ...readers.map((r) => ({ text: r.text, credit: r.credit, url: undefined, note: undefined, staff: r.staff })),
  ];
  return (
    <SectionBlock id="testimony" title="Survivor testimony" icon="book" items={items} onLayoutY={onLayoutY}
      renderItem={(t) => (
        <Quote
          text={t.text}
          credit={t.credit}
          url={t.url}
          note={t.note}
          staff={t.staff}
          link={f.questions_url ? { phrase: 'questions page', url: f.questions_url } : undefined}
        />
      )}
    />
  );
}

export function ForumSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const forum = f.forum;
  if (!forum || !(forum.incidents?.length || forum.leads?.length || forum.links?.length)) return null;
  const incidents: TimelineItem[] = (forum.incidents ?? []).map((i) => ({
    when: i.when,
    kind: i.kind,
    text: i.text,
    sources: [i, ...(i.also ?? [])],
  }));
  return (
    <SectionBlock id="forum" title="Reported on survivor forums" icon="users" onLayoutY={onLayoutY}>
      {incidents.length ? <LimitedTimeline items={incidents} /> : null}
      {forum.leads?.length ? <Bullets items={forum.leads} /> : null}
      {(forum.links ?? []).map((l, i) => (
        <HubListRow key={i} title={l.label} url={l.url} />
      ))}
    </SectionBlock>
  );
}

/** The research notes as a list, for a record whose notes are not printed as its About. */
export function NotesSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  if (hasAbout(f.about) || !f.notes.length) return null;
  return (
    <SectionBlock id="notes" title="Research notes" icon="lightbulb" onLayoutY={onLayoutY}>
      <Bullets items={f.notes} />
    </SectionBlock>
  );
}

export function WikiSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  return (
    <SectionBlock id="wiki" title="Wiki entries" icon="book" items={f.wiki} onLayoutY={onLayoutY}
      renderItem={(w) => (
        <HubListRow title={w.title} meta={[w.organization, w.place, w.years].filter(Boolean).join(' | ')} url={f.wiki_url} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start' },
  field: { gap: spacing.sm, marginTop: spacing.xs },
  body: { ...type.body },
  bold: { ...type.bodyBold, color: colors.midnight },
});
