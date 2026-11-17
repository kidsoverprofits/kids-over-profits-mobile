import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NewsItem } from '@/api/types';
import { colors } from '@/theme/colors';
import { radius, spacing, type } from '@/theme/typography';
import { dense, hitSlopFor } from './metrics';
import { RecordNewsCard } from './RecordNewsCard';

/**
 * A record's articles as the website lists them: the main list, then two folded lists of their own, articles
 * that name the program only in passing (`passing`, inc/news-passing.php) and celebrity or viral stories
 * (`aside`, kop_news_is_aside()).
 */
export function splitNews(items: NewsItem[]) {
  const aside = items.filter((n) => n.aside);
  const passing = items.filter((n) => !n.aside && n.passing);
  const main = items.filter((n) => !n.aside && !n.passing);
  return { main, passing, aside };
}

export function passingLabel(n: number, what = 'it') {
  return `${n} ${n === 1 ? 'article that mentions' : 'articles that mention'} ${what} in passing`;
}

export function asideLabel(n: number) {
  return `${n} ${n === 1 ? 'article' : 'articles'} about celebrities and viral stories`;
}

/** A line that opens a folded list of article cards, like the website's details/summary. */
export function NewsFold({ label, items }: { label: string; items: NewsItem[] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <View style={styles.fold}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        hitSlop={hitSlopFor(type.smallBold.lineHeight! + 2 * spacing.xs + 2)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <Text {...dense} style={styles.text}>{`${label} ${open ? '−' : '+'}`}</Text>
      </Pressable>
      {open ? items.map((n) => <RecordNewsCard key={n.id} item={n} />) : null}
    </View>
  );
}

/** The two folds under a news list, passing mentions first. */
export function NewsFolds({ passing, aside, what = 'it' }: { passing: NewsItem[]; aside: NewsItem[]; what?: string }) {
  return (
    <>
      <NewsFold label={passingLabel(passing.length, what)} items={passing} />
      <NewsFold label={asideLabel(aside.length)} items={aside} />
    </>
  );
}

const styles = StyleSheet.create({
  fold: { gap: spacing.sm },
  toggle: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.tealInk,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  pressed: { backgroundColor: colors.sand },
  text: { ...type.smallBold, color: colors.tealInk },
});
