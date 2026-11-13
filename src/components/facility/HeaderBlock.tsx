import { Pressable, StyleSheet, Text } from 'react-native';

import type { FacilityPayload } from '@/api/types';
import { aliasLabel } from '@/lib/alias';
import { cleanProse } from '@/lib/citations';
import { colors } from '@/theme/colors';
import { spacing, type } from '@/theme/typography';
import { RecordHeader, useOpenLink, type AliasLine } from '../site';
import { homeRows } from './model';

/** "Name · Operated ... · Run by ..." as RecordHeader's lines, in the website's order. */
export function HeaderBlock({ f }: { f: FacilityPayload }) {
  const open = useOpenLink();
  const past = f.formerly ?? [];
  // A past name's years, keyed by the name ("Formerly Sedona Sky Academy (2006-2014)"); an empty list when none has years.
  const years = (n: string) => (f.formerly_years && !Array.isArray(f.formerly_years) ? f.formerly_years[n] ?? '' : '');
  const later = (f.later ?? []).filter(Boolean);
  const aliases: AliasLine[] = [
    ...(f.current_name ? [aliasLabel('current', f.current_name)] : []),
    // The past names' sources follow the last of them, as the website's one "Formerly" line ends with them.
    ...past.map((n, i) => ({
      text: `${aliasLabel('past', n)}${years(n) ? ` (${years(n)})` : ''}`,
      sources: i === past.length - 1 ? f.fact_sources?.formerly : undefined,
    })),
    ...(later.length ? [`Later called ${later.join(', ')}`] : []),
    ...(f.aka ?? []).map((n) => aliasLabel('other', n)),
  ];
  const where = f.state_name || f.country;
  const place = [f.place, f.operated ? `Operated ${f.operated}` : ''].filter(Boolean).join('\n');
  const homes = homeRows(f);
  const program = f.home_of?.program;

  return (
    <RecordHeader
      eyebrow={where ? `Facility profile · ${where}` : 'Facility profile'}
      title={f.name}
      aliases={aliases}
      place={place}
      status={f.status}>
      {f.operator?.name ? (
        f.operator.url ? (
          <Pressable
            onPress={() => open(f.operator.url)}
            accessibilityRole="link"
            accessibilityLabel={`Run by ${f.operator.name}`}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={styles.link}>
            <Text style={styles.line}>
              {'Run by '}
              <Text style={styles.operator}>{f.operator.name}</Text>
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.line}>{`Run by ${f.operator.name}`}</Text>
        )
      ) : null}
      {f.home_of && program ? (
        <Text style={styles.line}>
          {`One of ${f.home_of.count} homes of `}
          {program.url ? (
            <Text onPress={() => open(program.url)} accessibilityRole="link" style={styles.operator}>
              {program.name}
            </Text>
          ) : (
            program.name
          )}
        </Text>
      ) : homes.isProgram ? (
        <Text style={styles.line}>{`A program of ${homes.homes.length} licensed homes`}</Text>
      ) : null}
    </RecordHeader>
  );
}

/** The one-paragraph summary under the header (1.15rem). */
export function Summary({ text }: { text: string }) {
  const words = cleanProse(text);
  return words ? <Text style={styles.summary}>{words}</Text> : null;
}

const styles = StyleSheet.create({
  line: { ...type.small, color: colors.navy },
  link: { alignSelf: 'flex-start' },
  operator: { ...type.small, fontWeight: '600', color: colors.navy },
  summary: { ...type.lead, marginBottom: spacing.lg },
});
