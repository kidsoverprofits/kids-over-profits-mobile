import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRefreshControl } from '@/lib/refresh';
import { colors } from '@/theme/colors';
import { gutter, maxContentWidth, spacing } from '@/theme/typography';

/** The space between two sections of a record or hub page. */
export const SECTION_GAP = 28;

export type PageJump = {
  ref: RefObject<ScrollView | null>;
  onBody: (e: LayoutChangeEvent) => void;
  onSlot: (id: string) => (e: LayoutChangeEvent) => void;
  to: (id: string) => void;
};

/** Remembers where each section sits so the stat tiles and jump pills can scroll to it. */
export function usePageJump(): PageJump {
  const ref = useRef<ScrollView>(null);
  const tops = useRef<Record<string, number>>({});
  const body = useRef(0);
  return useMemo(
    () => ({
      ref,
      onBody: (e) => {
        body.current = e.nativeEvent.layout.y;
      },
      onSlot: (id) => (e) => {
        tops.current[id] = e.nativeEvent.layout.y;
      },
      to: (id) => {
        const y = tops.current[id];
        if (y !== undefined) ref.current?.scrollTo({ y: Math.max(0, body.current + y - spacing.sm), animated: true });
      },
    }),
    [],
  );
}

/**
 * One section's place in the page. SectionBlock keeps a 32 point margin under itself; the slot takes
 * it back to the page's 28 and reports its own top (same parent for every section), since the
 * margin sits outside the block's own layout.
 */
export function Slot({ id, jump, children }: { id?: string; jump?: PageJump; children: ReactNode }) {
  return (
    <View onLayout={jump && id ? jump.onSlot(id) : undefined} style={styles.slot}>
      {children}
    </View>
  );
}

/** The foot of a page: a 1 px rule, then the small print and "Open on the site". */
export function PageFooter({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

/** A white page with 16 point gutters, centred and capped in width on tablets; pulled down, it reads `refetch` again. */
export function PageScroll({ jump, refetch, children }: { jump?: PageJump; refetch?: () => Promise<unknown>; children: ReactNode }) {
  const refreshControl = useRefreshControl(refetch ?? noRefetch);
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        ref={jump?.ref}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={refetch ? refreshControl : undefined}>
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const noRefetch = () => Promise.resolve();

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { alignItems: 'center' },
  column: { width: '100%', maxWidth: maxContentWidth, paddingHorizontal: gutter, paddingVertical: spacing.md },
  footer: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.md, gap: spacing.xs },
  slot: { marginBottom: SECTION_GAP - spacing.xl },
});
