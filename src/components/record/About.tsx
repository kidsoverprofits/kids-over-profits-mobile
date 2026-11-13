import { StyleSheet, Text, View } from 'react-native';

import type { About } from '@/api/types';
import { cleanProse, usableCitations } from '@/lib/citations';
import { colors } from '@/theme/colors';
import { spacing, type } from '@/theme/typography';
import { InlineSources, useOpenLink } from '../site';

/** True when the record has an About to print (paragraphs, or "Also drawn on" links). */
export function hasAbout(about?: About | null): about is About {
  return !!about && ((about.paragraphs?.length ?? 0) > 0 || (about.also ?? []).some((a) => a.url));
}

/**
 * A record's "About" as the website prints it (kop_pnotes_html()): each sentence followed by its "(source)" links,
 * one paragraph per topic, then "Also drawn on: ..." for sources read but not quoted. A published write-up (Claude's
 * About rewrites) keeps its sentences exactly as written.
 */
export function AboutText({ about }: { about: About }) {
  const open = useOpenLink();
  const also = usableCitations((about.also ?? []).filter((a) => a.url));
  return (
    <View style={styles.wrap}>
      {(about.paragraphs ?? []).map((para, i) => (
        <Text key={i} style={styles.paragraph}>
          {para.map((s, j) => (
            <Text key={j}>
              {j > 0 ? ' ' : ''}
              {cleanProse(s.text)}
              <InlineSources items={s.sources} />
            </Text>
          ))}
        </Text>
      ))}
      {also.length ? (
        <Text style={styles.also}>
          {'Also drawn on: '}
          {also.map((a, i) => (
            <Text key={i}>
              {i > 0 ? '; ' : ''}
              <Text accessibilityRole="link" onPress={() => open(a.url)} style={styles.link}>
                {a.label || a.cite || a.url}
              </Text>
            </Text>
          ))}
          {'.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  paragraph: { ...type.body, lineHeight: 26 },
  also: { ...type.meta },
  link: { color: colors.navy, textDecorationLine: 'underline' },
});
