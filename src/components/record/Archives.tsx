import { StyleSheet, Text, View } from 'react-native';

import type { ResearchDoc, SourceArchive } from '@/api/types';
import { colors } from '@/theme/colors';
import { spacing, type } from '@/theme/typography';
import { HubListRow, useOpenLink } from '../site';
import { Limited, SubHead } from '../facility/parts';

/** "Research that mentions this program": documents in our library that name it, then the whole library. */
export function ResearchList({ docs }: { docs?: ResearchDoc[] }) {
  const open = useOpenLink();
  if (!docs?.length) return null;
  return (
    <View style={styles.block}>
      <SubHead>Research that mentions this program</SubHead>
      <Limited
        items={docs}
        render={(d) => (
          <HubListRow
            title={d.title}
            meta={[d.byline, d.why, d.pages ? `Named on ${d.pages}` : ''].filter(Boolean).join(' - ') || undefined}
            url={d.url}
          />
        )}
      />
      {docs[0].library ? (
        <Text accessibilityRole="link" onPress={() => open(docs[0].library)} style={[styles.meta, styles.link]}>
          The whole research library
        </Text>
      ) : null}
    </View>
  );
}

/** Files Unsilenced and survivor sites published about the program and KOP does not hold, as the website lists them. */
export function SourceArchives({ archives }: { archives?: SourceArchive[] }) {
  const open = useOpenLink();
  if (!archives?.length) return null;
  return (
    <>
      {archives.map((a, i) => (
        <View key={i} style={styles.block}>
          <SubHead>{`From ${a.label}`}</SubHead>
          <Text style={styles.meta}>
            {a.intro}
            {a.folders.length ? (a.folders.length === 1 ? ' Their whole folder: ' : ' Their folders: ') : ''}
            {a.folders.map((f, j) => (
              <Text key={j}>
                {j > 0 ? ', ' : ''}
                <Text accessibilityRole="link" onPress={() => open(f.url)} style={styles.link}>
                  {f.name}
                </Text>
              </Text>
            ))}
            {a.folders.length ? '.' : ''}
          </Text>
          {a.groups.map((g, j) => (
            <View key={j} style={styles.group}>
              {g.name ? <Text style={styles.groupName}>{`${g.name} (${g.files.length})`}</Text> : null}
              <Limited items={g.files} render={(f) => <HubListRow title={f.title} meta={f.note || undefined} url={f.url} />} />
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm, marginTop: spacing.sm },
  group: { gap: spacing.xs },
  groupName: { ...type.smallBold },
  meta: { ...type.meta },
  link: { color: colors.navy, textDecorationLine: 'underline' },
});
