import { useResources } from '@/api/queries';
import type { IconName } from '@/components/Icon';
import { Lead } from '@/components/facility/parts';
import { ResourceItem } from '@/components/ResourceItem';
import { HubHeader, SectionBlock } from '@/components/site';
import { TabPage } from '@/components/tabs/TabPage';
import { ErrorState, Loading } from '@/components/ui';

/** The crisis lines come first and show in full: nobody in crisis should have to tap "Show more". */
const iconFor = (i: number): IconName => (i === 0 ? 'lifebuoy' : i === 1 ? 'alert-triangle' : 'link');

/** The website's /resources/ page: where to turn, grouped by what somebody arrives needing. */
export default function ResourcesScreen() {
  const query = useResources();
  const data = query.data;

  return (
    <TabPage refetch={query.refetch}>
      <HubHeader
        eyebrow="Where to turn"
        title="Resources"
        standfirst="Crisis lines, where to report abuse in a program, survivor support, advocacy and further reading."
        counts={data ? [`${data.total} resources`] : undefined}
      />
      {query.isLoading ? (
        <Loading label="Loading resources" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : (
        (data?.groups ?? []).map((g, gi) => (
          <SectionBlock
            key={g.heading}
            id={`group-${gi}`}
            title={g.heading}
            icon={iconFor(gi)}
            tone={gi === 0 ? 'grave' : 'info'}
            items={g.entries}
            limit={gi === 0 ? g.entries.length : 6}
            renderItem={(e, i) => (
              <>
                {i === 0 && g.intro ? <Lead>{g.intro}</Lead> : null}
                <ResourceItem entry={e} />
              </>
            )}
          />
        ))
      )}
    </TabPage>
  );
}
