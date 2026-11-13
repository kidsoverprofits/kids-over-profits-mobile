import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFacility } from '@/api/queries';
import type { FacilityPayload } from '@/api/types';
import { ConnectionsSection } from '@/components/facility/ConnectionsSection';
import { FacilityFooter, ReportingNotice } from '@/components/facility/Footer';
import { Glance } from '@/components/facility/Glance';
import { HeaderBlock, Summary } from '@/components/facility/HeaderBlock';
import { InspectionsSection } from '@/components/facility/InspectionsSection';
import { pageView, presentSections, statTiles, tileAnchor } from '@/components/facility/model';
import { PracticesSection, StaffSection } from '@/components/facility/PeopleSections';
import {
  CampusSection, ErasSection, FundingSection, HomesSection, IncidentsSection, LawsuitsSection, MemorialsSection, NewsSection,
  ProgramHistorySection, SiblingsSection, VideosSection, ViolationsSection,
} from '@/components/facility/RecordSections';
import { ResourcesSection } from '@/components/facility/ResourcesSection';
import {
  AboutSection, DocumentsSection, ForumSection, NotesSection, TestimonySection, WikiSection,
} from '@/components/facility/VoiceSections';
import { BusinessesSection, NonprofitsSection } from '@/components/record/Filings';
import { PageTimelineSection } from '@/components/record/PageTimeline';
import { OutsideResearchBoxes, ProfileJoined, ProfileSections } from '@/components/record/Profile';
import { ErrorState, Loading } from '@/components/ui';
import { JumpPills, StatTiles } from '@/components/site';
import { colors } from '@/theme/colors';
import { rememberRecent } from '@/lib/recent';
import { useRefreshControl } from '@/lib/refresh';
import { gutter, maxContentWidth, spacing } from '@/theme/typography';

function FacilityBody({ f, refetch }: { f: FacilityPayload; refetch: () => Promise<unknown> }) {
  const refreshControl = useRefreshControl(refetch);
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const listY = useRef(0);
  const onLayoutY = useCallback((id: string, y: number) => {
    offsets.current[id] = y;
  }, []);
  const jump = useCallback((key: string) => {
    const y = offsets.current[key];
    if (y !== undefined) scroller.current?.scrollTo({ y: Math.max(0, listY.current + y - spacing.sm), animated: true });
  }, []);

  const sections = presentSections(f);
  const tiles = statTiles(f).filter((t) => t.count > 0);
  // A renamed program's plain sections keep only what no name's section took.
  const p = { f: pageView(f), onLayoutY };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView ref={scroller} contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
        <View style={styles.column}>
          <HeaderBlock f={f} />
          <Summary text={f.summary} />
          <OutsideResearchBoxes items={f.outside_research} />
          {tiles.length >= 2 ? <StatTiles tiles={tiles} onJump={(key) => jump(tileAnchor(f, key))} /> : null}
          {sections.length > 1 ? <JumpPills items={sections.map((s) => ({ key: s.id, label: s.label }))} onJump={jump} /> : null}
          <Glance f={f} />
          <View onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
            {/* The website's order (templates/facility-page.php). */}
            <ProgramHistorySection {...p} />
            <ProfileSections profile={f.profile} onLayoutY={onLayoutY} />
            <HomesSection {...p} />
            <CampusSection {...p} />
            <AboutSection {...p} />
            <NotesSection {...p} />
            <TestimonySection {...p} />
            <ProfileJoined profile={f.profile} kind="testimony" onLayoutY={onLayoutY} />
            <ForumSection {...p} />
            <PageTimelineSection years={f.timeline} onLayoutY={onLayoutY} />
            <ErasSection {...p} />
            <MemorialsSection {...p} />
            <ViolationsSection {...p} />
            <LawsuitsSection {...p} />
            <ProfileJoined profile={f.profile} kind="lawsuits" onLayoutY={onLayoutY} />
            <FundingSection {...p} />
            <NonprofitsSection orgs={f.nonprofits} who="program" onLayoutY={onLayoutY} />
            <BusinessesSection entities={f.businesses} who="program" onLayoutY={onLayoutY} />
            <IncidentsSection {...p} />
            <NewsSection {...p} />
            <ProfileJoined profile={f.profile} kind="news" onLayoutY={onLayoutY} />
            <VideosSection {...p} />
            <ProfileJoined profile={f.profile} kind="videos" onLayoutY={onLayoutY} />
            <StaffSection {...p} />
            <PracticesSection {...p} />
            <InspectionsSection {...p} />
            <ConnectionsSection {...p} />
            <DocumentsSection {...p} />
            <ProfileJoined profile={f.profile} kind="documents" onLayoutY={onLayoutY} />
            <WikiSection {...p} />
            <SiblingsSection {...p} />
            <ProfileJoined profile={f.profile} kind="related" onLayoutY={onLayoutY} />
            <ResourcesSection {...p} />
          </View>
          <ReportingNotice f={f} />
          <FacilityFooter f={f} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function FacilityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useFacility(slug);
  const name = query.data?.name;
  const f = query.data;
  useEffect(() => {
    if (f?.name) void rememberRecent({ kind: 'facility', slug: f.slug || slug, name: f.name, place: f.place });
  }, [f, slug]);

  return (
    <>
      <Stack.Screen options={{ title: name ?? 'Facility' }} />
      {query.isLoading ? (
        <Loading label="Loading facility" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <FacilityBody f={query.data} refetch={query.refetch} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scroll: { alignItems: 'center' },
  column: { width: '100%', maxWidth: maxContentWidth, paddingHorizontal: gutter, paddingTop: spacing.md, paddingBottom: spacing.xl },
});
