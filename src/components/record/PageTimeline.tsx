import { useState } from 'react';
import { View } from 'react-native';

import type { PageTimelineYear } from '@/api/types';
import { MoreButton, SectionBlock, Timeline, type TimelineItem } from '../site';

const SHOWN = 10;

/** A page timeline's events as Timeline rows: the year (or its date), the kind as a pill, then the event in words. */
export function timelineItems(years: PageTimelineYear[] | undefined): TimelineItem[] {
  const out: TimelineItem[] = [];
  for (const y of years ?? []) {
    for (const e of y.events) {
      const words = [e.title, e.lead, ...e.items, ...e.detail]
        .map((w) => w.trim())
        .filter(Boolean)
        .map((w) => (/[.!?]$/.test(w) ? w : `${w}.`))
        .join(' ');
      if (!words) continue;
      out.push({ when: e.when || y.year, kind: e.label || undefined, text: words, sources: e.sources });
    }
  }
  return out;
}

/** The year-by-year timeline the website draws on a facility page (inc/profile-timeline.php), oldest first. */
export function PageTimelineSection({ years, onLayoutY }: { years?: PageTimelineYear[]; onLayoutY?: (id: string, y: number) => void }) {
  const [all, setAll] = useState(false);
  const items = timelineItems(years);
  if (!items.length) return null;
  const hidden = Math.max(0, items.length - SHOWN);
  return (
    <SectionBlock id="timeline" title="Timeline" icon="calendar" count={items.length} onLayoutY={onLayoutY}>
      <View>
        <Timeline items={all ? items : items.slice(0, SHOWN)} />
        {hidden > 0 ? <MoreButton count={hidden} expanded={all} onPress={() => setAll((a) => !a)} /> : null}
      </View>
    </SectionBlock>
  );
}
