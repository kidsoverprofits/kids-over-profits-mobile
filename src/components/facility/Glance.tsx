import { StyleSheet, Text, View } from 'react-native';

import type { FacilityPayload } from '@/api/types';
import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { GlanceBox, useOpenLink, type GlanceRow } from '../site';
import { factText, presentSections } from './model';

/**
 * "At a glance": addresses, former locations, then every fact with its sources; the operator links to its page.
 * Last, the materials the project holds as small ticked boxes, each jumping to its section (website: .kop-fp-held).
 */
export function Glance({ f, onJump }: { f: FacilityPayload; onJump?: (key: string) => void }) {
  const open = useOpenLink();
  const rows: GlanceRow[] = [];
  if (f.addresses.length) {
    rows.push({ label: f.addresses.length > 1 ? 'Addresses' : 'Address', value: f.addresses.join('\n') });
  }
  if (f.former_locations.length) {
    rows.push({
      label: 'Former locations',
      value: f.former_locations.map((l) => `${l.line}${l.years ? ` (${l.years})` : ''}`).join('\n'),
      sources: f.fact_sources?.former_locations,
    });
  }
  const facts = f.facts.some((x) => x.label === 'Operator') || !f.operator?.name
    ? f.facts
    : [...f.facts, { label: 'Operator', value: f.operator.name }];
  for (const fact of facts) {
    const text = factText(fact.value);
    if (!text) continue;
    const sources = f.fact_sources?.[fact.label];
    if (fact.label === 'Operator' && f.operator?.url) {
      rows.push({
        label: fact.label,
        value: (
          <Text
            onPress={() => open(f.operator.url)}
            accessibilityRole="link"
            style={{ ...type.body, fontWeight: '600', color: colors.navy }}>
            {text}
          </Text>
        ),
        sources,
      });
    } else {
      rows.push({ label: fact.label, value: text, sources });
    }
  }
  const held = f.resources ?? [];
  if (held.length) {
    const shown = new Set(presentSections(f).map((s) => s.id));
    rows.push({
      label: 'Materials held',
      value: (
        <View style={styles.held} accessibilityLabel="Materials the project holds">
          {held.map((r, j) => {
            const label = r.label === 'Note' && r.detail ? r.detail : r.label;
            const to = (r.anchors ?? []).find((a) => shown.has(a));
            return (
              <View key={j} style={styles.heldItem}>
                <Text style={styles.box} accessibilityElementsHidden importantForAccessibility="no">{'✓'}</Text>
                {to && onJump ? (
                  <Text style={[styles.heldText, styles.link]} accessibilityRole="link" onPress={() => onJump(to)}>{label}</Text>
                ) : (
                  <Text style={styles.heldText}>{label}</Text>
                )}
              </View>
            );
          })}
        </View>
      ),
    });
  }
  return <GlanceBox rows={rows} />;
}

const styles = StyleSheet.create({
  held: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  heldItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  box: {
    width: 16, height: 16, borderWidth: 1, borderColor: colors.tealInk, borderRadius: 2, backgroundColor: colors.white,
    color: colors.tealInk, fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center',
  },
  heldText: { fontSize: 14, lineHeight: 20, color: colors.textPrimary, flexShrink: 1 },
  link: { color: colors.navy, textDecorationLine: 'underline' },
});
