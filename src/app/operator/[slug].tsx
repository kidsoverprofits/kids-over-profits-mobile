import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useOperator, useOperatorByName } from '@/api/queries';
import type { OperatorPayload } from '@/api/types';
import { PageFooter, PageScroll, Slot, usePageJump } from '@/components/operator/PageScroll';
import { HistorySection, OwnershipSection, PeopleSection, ProgramsSection, YearSection } from '@/components/operator/Narrative';
import {
  DeathsSection,
  DocumentsSection,
  LawsuitsSection,
  NewsSection,
  NotesSection,
  WebsitesSection,
} from '@/components/operator/Records';
import { aliasLines, glanceRows, placeLine, sectionsOf, statTiles } from '@/components/operator/model';
import { AboutText, hasAbout } from '@/components/record/About';
import { BusinessesSection, NonprofitsSection } from '@/components/record/Filings';
import { GlanceBox, JumpPills, RecordHeader, SectionBlock, StatTiles } from '@/components/site';
import { ErrorState, Loading, OpenOnSite } from '@/components/ui';
import { slugFromUrl } from '@/lib/links';
import { rememberRecent } from '@/lib/recent';
import { spacing, type } from '@/theme/typography';

/** The company's About (the website's "About <name>"): its notes as cited prose, or its published write-up. */
function AboutSection({ o }: { o: OperatorPayload }) {
  if (!hasAbout(o.about)) return null;
  return (
    <SectionBlock id="about" title={`About ${o.name}`} icon="book">
      <AboutText about={o.about} />
    </SectionBlock>
  );
}

const SECTIONS: Record<string, (props: { o: OperatorPayload }) => ReactNode> = {
  history: HistorySection,
  about: AboutSection,
  'tax-filings': ({ o }) => <NonprofitsSection orgs={o.nonprofits} who="company" />,
  'business-filings': ({ o }) => <BusinessesSection entities={o.businesses} who="company" />,
  years: YearSection,
  programs: ProgramsSection,
  people: PeopleSection,
  ownership: OwnershipSection,
  news: NewsSection,
  lawsuits: LawsuitsSection,
  deaths: DeathsSection,
  documents: DocumentsSection,
  websites: WebsitesSection,
  notes: NotesSection,
};

function OperatorBody({ o, refetch }: { o: OperatorPayload; refetch: () => Promise<unknown> }) {
  const jump = usePageJump();
  const sections = sectionsOf(o);
  const glance = glanceRows(o);

  return (
    <PageScroll jump={jump} refetch={refetch}>
      <RecordHeader eyebrow="Parent company profile" title={o.name} aliases={aliasLines(o)} place={placeLine(o)} status={o.status} />
      {o.summary ? <Text style={styles.summary}>{o.summary}</Text> : null}
      <StatTiles tiles={statTiles(o)} onJump={jump.to} />
      {sections.length > 1 ? <JumpPills items={sections} onJump={jump.to} /> : null}
      {glance.length ? <GlanceBox rows={glance} /> : null}

      <View onLayout={jump.onBody}>
        {sections.map(({ key }) => {
          const Section = SECTIONS[key];
          return (
            <Slot key={key} id={key} jump={jump}>
              <Section o={o} />
            </Slot>
          );
        })}
      </View>

      <PageFooter>
        {o.updated_label ? <Text style={styles.updated}>{`Updated ${o.updated_label}.`}</Text> : null}
        <OpenOnSite url={o.url} />
      </PageFooter>
    </PageScroll>
  );
}

export default function OperatorScreen() {
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  const byName = slug === 'by-name';
  const bySlug = useOperator(byName ? undefined : slug);
  const byNameQuery = useOperatorByName(byName ? name : undefined);
  const query = byName ? byNameQuery : bySlug;
  const o = query.data;
  useEffect(() => {
    const key = o ? slugFromUrl(o.url) : '';
    if (o && key) {
      const n = o.facilities?.length ?? 0;
      void rememberRecent({ kind: 'operator', slug: key, name: o.name, place: n ? `Company, ${n} ${n === 1 ? 'program' : 'programs'}` : 'Company' });
    }
  }, [o]);

  return (
    <>
      <Stack.Screen options={{ title: query.data?.name ?? 'Company' }} />
      {query.isLoading ? (
        <Loading label="Loading company" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <OperatorBody o={query.data} refetch={query.refetch} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  summary: { ...type.lead, marginBottom: spacing.md },
  updated: { ...type.meta },
});
