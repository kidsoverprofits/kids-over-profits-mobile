import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppSuggestItem, SuggestKind } from '@/api/types';
import { dense } from '@/components/site/metrics';
import { colors, directoryStatusColor } from '@/theme/colors';
import { radius, spacing, touchTarget, type } from '@/theme/typography';

/** The website's Company / Facility pill (kop_kind_pill(), inc/kind-pill.php): same words, same colours. */
export function KindPill({ kind }: { kind: SuggestKind }) {
  const company = kind === 'operator';
  return (
    <View style={[styles.pill, company ? styles.company : styles.facility]}>
      <Text {...dense} style={styles.pillText}>{company ? 'Company' : 'Facility'}</Text>
    </View>
  );
}

/**
 * A search result's other names and places, at most two lines: the names (4, then "and N more"), the places (3).
 * Mirrors kop_v2_search_preview_lines() in the theme (inc/facility-v2-readers.php) and the website's search popup.
 */
export function previewLines(item: { names?: string[]; places?: string[] }): string[] {
  const out: string[] = [];
  for (const [list, max] of [[item.names ?? [], 4], [item.places ?? [], 3]] as [string[], number][]) {
    const words = list.filter(Boolean);
    if (!words.length) continue;
    out.push(words.slice(0, max).join('; ') + (words.length > max ? `; and ${words.length - max} more` : ''));
  }
  return out;
}

/** The app screen for a suggestion, or null when the record has no page. */
export function suggestionHref(item: Pick<AppSuggestItem, 'kind' | 'slug'>): Href | null {
  return item.slug ? (`/${item.kind}/${encodeURIComponent(item.slug)}` as Href) : null;
}

/**
 * One suggestion: the pill and the name, then its other names (the one that matched first) and other places, as the
 * website's search shows them; an older site sends only the "Formerly X" hint. Then the place.
 */
export function SuggestionRow({ item, onPress }: { item: AppSuggestItem; onPress: () => void }) {
  const status = item.status.trim();
  const line = [item.place, status].filter(Boolean).join(' · ');
  const preview = previewLines(item);
  const hints = preview.length ? preview : item.hint ? [item.hint] : [];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={[item.kind === 'operator' ? 'Company' : 'Facility', item.name, ...hints, item.place, status].filter(Boolean).join('. ')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.top}>
        <KindPill kind={item.kind} />
        <Text style={styles.name}>{item.name}</Text>
      </View>
      {hints.map((h, i) => (
        <Text key={i} style={styles.hint}>
          {h}
        </Text>
      ))}
      {line ? (
        <View style={styles.bottom}>
          {status ? <View style={[styles.dot, { backgroundColor: directoryStatusColor(status) }]} /> : null}
          <Text style={styles.meta}>{line}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** A column of suggestions, announced to screen readers as it changes. */
export function SuggestionList({ items, onPick }: { items: AppSuggestItem[]; onPick: (item: AppSuggestItem) => void }) {
  if (!items.length) return null;
  return (
    <View style={styles.list} accessibilityLiveRegion="polite" accessibilityLabel={`${items.length} ${items.length === 1 ? 'suggestion' : 'suggestions'}`}>
      {items.map((it) => (
        <SuggestionRow key={`${it.kind}-${it.id}-${it.name}`} item={it} onPress={() => onPick(it)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.tile, backgroundColor: colors.white, overflow: 'hidden' },
  row: {
    minHeight: touchTarget + 8,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md - 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.feedBorder,
    backgroundColor: colors.white,
  },
  pressed: { backgroundColor: colors.sand },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { ...type.bodyBold, color: colors.directoryNavy, flexShrink: 1 },
  hint: { ...type.small, fontStyle: 'italic', color: colors.navy },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { ...type.meta },
  // .kop-kind: midnight on mint (facility) or pastel yellow (company), 1 px ink border.
  pill: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 1 },
  facility: { backgroundColor: colors.mintGreen, borderColor: colors.tealInk },
  company: { backgroundColor: colors.softPastelYellow, borderColor: colors.orangeInk },
  pillText: { fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.2, color: colors.midnight },
});
