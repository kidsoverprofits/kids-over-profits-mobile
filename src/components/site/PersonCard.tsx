import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { cleanProse, roleLine, usableCitations } from '@/lib/citations';
import { colors } from '@/theme/colors';
import { radius, spacing, type } from '@/theme/typography';
import { MoreButton } from './Button';
import { dense, hitSlopFor } from './metrics';
import { SourceLink } from './Source';
import { useOpenLink } from './useOpenLink';

/** kind: 'industry' or 'other' (a noteworthy position outside the industry), from the site's kop_facility_pages_job_kind(). */
export type Job = { text?: string; label?: string; name?: string; url?: string; role?: string; place?: string; years?: string; kind?: string };

/** A staff entry (facility pages) or a person on a company page. */
export type PersonEntry = {
  text?: string;
  name?: string;
  role?: string;
  source?: string;
  cite?: string;
  url?: string;
  career?: unknown[];
};

const JOBS_SHOWN = 4;

/** The website's two career headings (kop_facility_pages_career_groups()). */
const GROUPS = [
  { kind: 'industry', label: 'Elsewhere in the industry' },
  { kind: 'other', label: 'Other notable positions' },
] as const;

const isOther = (j: Job) => j.kind === 'other';

function jobsOf(entry: PersonEntry): Job[] {
  return (entry.career ?? [])
    .filter((j): j is Job => typeof j === 'object' && j !== null)
    .filter((j) => !!(j.place || j.label || j.name || j.text));
}

function jobPlace(j: Job): string {
  return j.place || j.label || j.name || cleanProse(j.text);
}

function jobDetail(j: Job): string {
  const role = roleLine(j.role);
  const years = (j.years ?? '').trim();
  return [role, years && !role.includes(years) ? years : ''].filter(Boolean).join(', ');
}

/**
 * One person. The name is printed once, then the role line, then a "source" link. The record's own sentence
 * (entry.text) repeats the name, role and every job, so it is never printed when the name is known.
 */
export function PersonCard({ entry, style }: { entry: PersonEntry; style?: StyleProp<ViewStyle> }) {
  const open = useOpenLink();
  const [all, setAll] = useState(false);
  // Industry jobs first, then the other positions, as the website lists them; "N more" counts across both.
  const listed = jobsOf(entry);
  const jobs = [...listed.filter((j) => !isOther(j)), ...listed.filter(isOther)];
  const named = !!entry.name;
  const role = named ? roleLine(entry.role) : '';
  const shownJobs = all ? jobs : jobs.slice(0, JOBS_SHOWN);
  const cited = usableCitations([entry]).length > 0;

  return (
    <View testID="person-card" style={[styles.card, jobs.length > 0 && styles.withCareer, style]}>
      {named ? (
        <Text style={styles.name}>{entry.name}</Text>
      ) : (
        <Text style={styles.text}>{cleanProse(entry.text)}</Text>
      )}
      {role ? <Text style={styles.role}>{role}</Text> : null}
      {cited ? <SourceLink items={[entry]} /> : null}
      {jobs.length ? (
        <View style={styles.career}>
          {GROUPS.map(({ kind, label }) => {
            const group = shownJobs.filter((j) => (kind === 'other') === isOther(j));
            if (!group.length) return null;
            return (
              <View key={kind} style={styles.group}>
                <Text {...dense} style={styles.kicker}>{label}</Text>
                {group.map((j, i) => {
                  const place = jobPlace(j);
                  const detail = jobDetail(j);
                  return (
                    <View key={`${place}-${i}`} style={styles.job}>
                      {j.url ? (
                        <Pressable
                          onPress={() => open(j.url)}
                          accessibilityRole="link"
                          accessibilityLabel={detail ? `${place}, ${detail}` : place}
                          hitSlop={hitSlopFor(type.smallBold.lineHeight!)}>
                          <Text {...dense} style={styles.place}>{place}</Text>
                        </Pressable>
                      ) : (
                        <Text {...dense} style={styles.place}>{place}</Text>
                      )}
                      {detail ? <Text {...dense} style={styles.detail}>{detail}</Text> : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
          {jobs.length > JOBS_SHOWN ? (
            <MoreButton count={jobs.length - JOBS_SHOWN} expanded={all} onPress={() => setAll((a) => !a)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.tile,
    paddingVertical: 10,
    paddingHorizontal: 13,
    gap: spacing.xxs,
  },
  withCareer: { borderLeftWidth: 4, borderLeftColor: colors.teal },
  name: { ...type.bodyBold },
  text: { ...type.body },
  role: { ...type.small, color: colors.textMuted },
  career: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.mintGreen,
    borderStyle: 'dashed',
    gap: spacing.xs + 2,
    alignItems: 'flex-start',
  },
  group: { gap: spacing.xs + 2, alignItems: 'flex-start' },
  kicker: { ...type.kicker, color: colors.tealInk },
  job: { gap: 0 },
  place: { ...type.smallBold, color: colors.navy },
  detail: { ...type.small, color: colors.textMuted },
});
