import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/colors';
import { type } from '@/theme/typography';
import { NoticeBox, useOpenLink } from '../site';

const STAFF_NOTE = "What it says about them is this reader's allegation, not a finding; Kids Over Profits has not verified it.";

/**
 * A survivor's or a reader's own words, quoted as published (only spelling and punctuation fixed), in the site's
 * midnight-framed testimony box. The credit says who it is from and where; it links the original when there is one.
 * `link` turns one phrase of the credit into a link (a reader's "questions page").
 */
export function Quote({
  text,
  credit,
  url,
  note,
  staff,
  link,
}: {
  text: string;
  credit: string;
  url?: string;
  note?: string;
  /** Staff a reader's account names: printed with the allegation note, as the website does. */
  staff?: string[];
  link?: { phrase: string; url: string };
}) {
  const open = useOpenLink();
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const at = link && link.url ? credit.indexOf(link.phrase) : -1;
  return (
    <NoticeBox variant="testimony">
      {paragraphs.map((p, i) => (
        <Text key={i} style={styles.account}>
          {p}
        </Text>
      ))}
      {credit ? (
        url ? (
          <Text accessibilityRole="link" onPress={() => open(url)} style={[styles.meta, styles.link]}>
            {credit}
          </Text>
        ) : at >= 0 && link ? (
          <Text style={styles.meta}>
            {credit.slice(0, at)}
            <Text accessibilityRole="link" onPress={() => open(link.url)} style={styles.link}>
              {link.phrase}
            </Text>
            {credit.slice(at + link.phrase.length)}
          </Text>
        ) : (
          <Text style={styles.meta}>{credit}</Text>
        )
      ) : null}
      {note ? <Text style={[styles.meta, styles.note]}>{note}</Text> : null}
      {staff?.length ? <Text style={[styles.meta, styles.note]}>{`Names staff: ${staff.join(', ')}. ${STAFF_NOTE}`}</Text> : null}
    </NoticeBox>
  );
}

const styles = StyleSheet.create({
  account: { ...type.body },
  meta: { ...type.meta },
  link: { color: colors.navy, textDecorationLine: 'underline' },
  note: { fontStyle: 'italic' },
});
