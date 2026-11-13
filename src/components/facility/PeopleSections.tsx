import { StyleSheet, Text, View } from 'react-native';

import type { FacilityPayload } from '@/api/types';
import { type } from '@/theme/typography';
import { Quote } from '../record/Quote';
import { InlineSources, PersonCard, SectionBlock } from '../site';
import { staffRows, type SectionProps, type StaffRow } from './model';
import { Bullets, Lead, Limited, SubHead } from './parts';

/** Staff in the site's groups: each person once (name, role, source, career), the group's sub-head over its first. */
export function StaffSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  const rows = staffRows(f.staff);
  return (
    <SectionBlock id="staff" title="Staff" icon="users" items={rows} limit={6} onLayoutY={onLayoutY}
      renderItem={(row, i) => <StaffRowView row={row} index={i} />} />
  );
}

/** One person, under their group's sub-head when they are its first. */
export function StaffRowView({ row, index }: { row: StaffRow; index: number }) {
  return (
    <View>
      {row.head ? <SubHead first={index === 0}>{row.head}</SubHead> : null}
      <PersonCard entry={row.entry} style={row.head ? styles.afterHead : styles.person} />
    </View>
  );
}

/** True when the page has a "Rules and practices" section: reported practices, handbook lines or readers' rules. */
export const hasPractices = (f: FacilityPayload) =>
  f.practices.length > 0 || (f.rules?.length ?? 0) > 0 || (f.reader_rules?.length ?? 0) > 0;

/**
 * "Rules and practices", as the website prints it: the practices reported about the program, then the lines read from
 * its own handbooks and papers (each with its document), then the rules readers who were there remember, quoted.
 */
export function PracticesSection({ f, onLayoutY }: SectionProps & { f: FacilityPayload }) {
  if (!hasPractices(f)) return null;
  const rules = f.rules ?? [];
  const readers = f.reader_rules ?? [];
  return (
    <SectionBlock id="practices" title="Rules and practices" icon="clipboard" onLayoutY={onLayoutY}>
      {f.practices.map((g, i) => (
        <View key={`p${i}`} style={styles.group}>
          {g.label ? <SubHead first={i === 0}>{g.label}</SubHead> : null}
          <Bullets items={g.items} />
        </View>
      ))}
      {rules.length ? <Lead>{"Read from the program's own handbooks and papers; each line links the page it is on."}</Lead> : null}
      {rules.map((g) => (
        <View key={g.topic} style={styles.group}>
          <SubHead>{g.label}</SubHead>
          <Limited
            items={g.lines}
            limit={8}
            render={(l) => (
              <View style={styles.row}>
                <Text style={styles.bullet}>{'•'}</Text>
                <Text style={styles.text}>
                  {l.text}
                  <InlineSources
                    items={[{ url: l.source_url, cite: [l.source_title, l.page > 0 ? `page ${l.page}` : ''].filter(Boolean).join(', ') }]}
                  />
                </Text>
              </View>
            )}
          />
        </View>
      ))}
      {readers.length ? (
        <View style={styles.group}>
          <SubHead>What people who were there remember</SubHead>
          <Lead>In their own words, from our questions page; only the spelling and punctuation are fixed.</Lead>
          {readers.map((r, i) => (
            <Quote
              key={i}
              text={r.text}
              credit={r.credit}
              staff={r.staff}
              link={f.questions_url ? { phrase: 'questions page', url: f.questions_url } : undefined}
            />
          ))}
        </View>
      ) : null}
    </SectionBlock>
  );
}

const styles = StyleSheet.create({
  person: { marginBottom: 2 },
  afterHead: { marginTop: 8, marginBottom: 2 },
  group: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  bullet: { ...type.body, width: 12 },
  text: { ...type.body, flex: 1 },
});
