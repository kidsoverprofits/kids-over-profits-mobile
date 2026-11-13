import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useStatePage } from '@/api/queries';
import { SITE } from '@/api/client';
import type { StatePage } from '@/api/types';
import { PageFooter, PageScroll, Slot } from '@/components/operator/PageScroll';
import {
  InspectionsSection,
  LawsuitsSection,
  LegislationSection,
  NewsSection,
  ProgramsSection,
  type Bill,
} from '@/components/place/PlaceSections';
import { HubHeader } from '@/components/site';
import { Empty, ErrorState, Loading, OpenOnSite } from '@/components/ui';
import { placeBySlug } from '@/data/states';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function counts(data: StatePage): string[] {
  const c = data.counts ?? {};
  return [
    count(data.facilities.total, 'program', 'programs'),
    data.facilities.active.length ? `${data.facilities.active.length} open` : '',
    count(c.lawsuits ?? data.lawsuits.length, 'lawsuit', 'lawsuits'),
    count(c.news_articles ?? c.news ?? data.news.length, 'news story', 'news stories'),
  ].filter((p) => !p.startsWith('0 '));
}

function PlaceBody({ data, slug, country, refetch }: { data: StatePage; slug: string; country: boolean; refetch: () => Promise<unknown> }) {
  const name = data.state.name;
  const bills = ((data as StatePage & { legislation?: Bill[] }).legislation ?? []).filter((b) => b.bill_title || b.bill_number);
  const { active, closed, total } = data.facilities;
  const reports = data.inspections?.has_reports ? data.inspections.page_url : null;

  return (
    <PageScroll refetch={refetch}>
      <HubHeader
        eyebrow={country ? 'Country hub' : 'State hub'}
        title={name}
        standfirst={`Every facility, lawsuit, news story and bill on record in ${name}.`}
        counts={counts(data)}
      />
      <View>
        {active.length ? <Slot><ProgramsSection id="open" title="Open programs" tiles={active} /></Slot> : null}
        {closed.length ? <Slot><ProgramsSection id="closed" title="Closed programs" tiles={closed} /></Slot> : null}
        {total === 0 ? <Empty message="No facilities on record here yet." /> : null}
        {data.news.length ? <Slot><NewsSection news={data.news} /></Slot> : null}
        {data.lawsuits.length ? <Slot><LawsuitsSection lawsuits={data.lawsuits} /></Slot> : null}
        {bills.length ? <Slot><LegislationSection bills={bills} /></Slot> : null}
        {reports ? <Slot><InspectionsSection url={reports} /></Slot> : null}
      </View>
      <PageFooter>
        <OpenOnSite url={`${SITE}/${slug}/`} />
      </PageFooter>
    </PageScroll>
  );
}

export default function PlaceScreen() {
  const { slug, kind } = useLocalSearchParams<{ slug: string; kind?: string }>();
  const place = slug ? placeBySlug(slug) : undefined;
  const country = kind === 'country' || place?.kind === 'country';
  const query = useStatePage(slug, country ? 'country' : 'state');

  return (
    <>
      <Stack.Screen options={{ title: place?.name ?? query.data?.state?.name ?? 'Place' }} />
      {query.isLoading ? (
        <Loading label="Loading" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <PlaceBody data={query.data} slug={slug} country={country} refetch={query.refetch} />
      ) : null}
    </>
  );
}
