import { StyleSheet, Text, View } from 'react-native';

import type { OutsideResearch, ProfilePost } from '@/api/types';
import { parseMarkdownLinks } from '@/lib/markdownLinks';
import { colors } from '@/theme/colors';
import { radius, spacing, type } from '@/theme/typography';
import { HubListRow, SectionBlock, useOpenLink } from '../site';

type LayoutY = { onLayoutY?: (id: string, y: number) => void };

/** A paragraph whose [words](address) links are underlined and open; "• " lines stay one per line. */
export function LinkedText({ text, style }: { text: string; style?: object }) {
  const open = useOpenLink();
  return (
    <Text style={[styles.paragraph, style]}>
      {parseMarkdownLinks(text).map((r, i) =>
        r.url ? (
          <Text key={i} accessibilityRole="link" onPress={() => open(r.url)} style={styles.link}>
            {r.text}
          </Text>
        ) : (
          r.text
        ),
      )}
    </Text>
  );
}

/** The section kinds a post's own sections join on the website; the rest of its sections are its written text. */
export const PROFILE_JOINS = ['testimony', 'news', 'lawsuits', 'documents', 'videos', 'related'] as const;

/** True when the record has a hand-written profile post to show. */
export const hasProfile = (p?: ProfilePost | null): p is ProfilePost =>
  !!p && (p.lead.length > 0 || p.facts.length > 0 || p.sections.length > 0);

/**
 * A hand-written Facility Profile post (the website's page for the program, or merged into it): its opening words and
 * facts, then each written section under the post's own heading. The sections that join the record's own (news,
 * testimony, ...) are drawn beside those by ProfileJoined.
 */
export function ProfileSections({ profile, onLayoutY }: { profile?: ProfilePost | null } & LayoutY) {
  const open = useOpenLink();
  if (!hasProfile(profile)) return null;
  const prose = profile.sections.filter((s) => !(PROFILE_JOINS as readonly string[]).includes(s.kind));
  return (
    <>
      {profile.lead.length || profile.facts.length ? (
        <SectionBlock id="profile" title={profile.title || 'Profile'} icon="book" onLayoutY={onLayoutY}>
          <Text style={styles.meta}>
            {profile.merged ? 'From our written profile of this program. ' : "Our written profile of this program; the website shows it as the program's page. "}
            <Text accessibilityRole="link" onPress={() => open(profile.url)} style={styles.link}>
              Open it on the site
            </Text>
            {profile.updated ? `. ${profile.updated}` : ''}
          </Text>
          {profile.lead.map((p, i) => (
            <LinkedText key={i} text={p} />
          ))}
          {profile.facts.length ? (
            <View style={styles.facts}>
              {profile.facts.map((f, i) => (
                <View key={i} style={styles.fact}>
                  {f.label ? <Text style={styles.dt}>{f.label}</Text> : null}
                  {f.lines.map((l, j) => (
                    <LinkedText key={j} text={l} style={styles.dd} />
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </SectionBlock>
      ) : null}
      {prose.map((s) => (
        <SectionBlock key={s.id} id={`profile-${s.id}`} title={s.title} icon="book" onLayoutY={onLayoutY}>
          <ProfileBody section={s} />
        </SectionBlock>
      ))}
    </>
  );
}

function ProfileBody({ section }: { section: ProfilePost['sections'][number] }) {
  return (
    <>
      {section.paragraphs.map((p, i) => (
        <LinkedText key={i} text={p} />
      ))}
      {section.links.map((l, i) => (
        <HubListRow key={i} title={l.title} meta={[l.outlet, l.summary].filter(Boolean).join(' | ') || undefined} url={l.url} />
      ))}
    </>
  );
}

/**
 * A post section that joins one of the record's sections on the website (its "Survivor stories", "News", ...): drawn
 * right after the record's own section, under the post's heading.
 */
export function ProfileJoined({ profile, kind, onLayoutY }: { profile?: ProfilePost | null; kind: (typeof PROFILE_JOINS)[number] } & LayoutY) {
  if (!hasProfile(profile)) return null;
  const parts = profile.sections.filter((s) => s.kind === kind);
  if (!parts.length) return null;
  return (
    <>
      {parts.map((s) => (
        <SectionBlock key={s.id} id={`profile-${s.id}`} title={`${s.title} (from our profile)`} icon="book" onLayoutY={onLayoutY}>
          <ProfileBody section={s} />
        </SectionBlock>
      ))}
    </>
  );
}

/** "Further research: <project>" boxes under the summary: research by others with a page on this program or company. */
export function OutsideResearchBoxes({ items }: { items?: OutsideResearch[] }) {
  const open = useOpenLink();
  if (!items?.length) return null;
  return (
    <View style={styles.outsideList}>
      {items.map((o, i) => (
        <View key={i} style={styles.outside} accessibilityLabel={`Research by others: ${o.name}`}>
          <Text style={styles.outsideHead}>
            {'Further research: '}
            <Text accessibilityRole="link" onPress={() => open(o.url)} style={styles.link}>
              {o.name}
            </Text>
          </Text>
          {o.note ? <Text style={styles.small}>{o.note}</Text> : null}
          {o.by ? <Text style={styles.meta}>{`Research by ${o.by}`}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: { ...type.body, lineHeight: 26 },
  link: { color: colors.navy, textDecorationLine: 'underline' },
  meta: { ...type.meta },
  small: { ...type.small },
  facts: { backgroundColor: colors.sand, borderRadius: radius.box, padding: 14, gap: 10 },
  fact: { gap: spacing.xxs },
  dt: { ...type.label },
  dd: { ...type.small, lineHeight: 20 },
  outsideList: { gap: spacing.sm, marginBottom: spacing.lg },
  outside: { backgroundColor: colors.softPastelYellow, borderLeftWidth: 4, borderLeftColor: colors.teal, borderRadius: radius.box, padding: 12, gap: 4 },
  outsideHead: { ...type.smallBold },
});
