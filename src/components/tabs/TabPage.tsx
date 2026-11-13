import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRefreshControl } from '@/lib/refresh';
import { colors } from '@/theme/colors';
import { gutter, maxContentWidth, spacing } from '@/theme/typography';

/** The padding and width cap every tab's content shares (a FlatList uses it as its contentContainerStyle). */
export const pageColumn = {
  width: '100%',
  maxWidth: maxContentWidth,
  alignSelf: 'center',
  paddingHorizontal: gutter,
  paddingTop: spacing.md,
  paddingBottom: spacing.xl,
} as const;

/** A scrolling tab page: the site's white content panel, centred and capped in width on tablets. */
export function TabPage({
  children,
  background = colors.white,
  refetch,
}: {
  children: ReactNode;
  background?: string;
  /** Pulled down, the page reads these again from the live site. */
  refetch?: () => Promise<unknown>;
}) {
  const refreshControl = useRefreshControl(refetch ?? noRefetch);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={refetch ? refreshControl : undefined}>
        <View style={pageColumn}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const noRefetch = () => Promise.resolve();

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
});
