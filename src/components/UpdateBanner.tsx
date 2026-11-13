import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { radius, spacing, touchTarget, type } from '@/theme/typography';

/** At most one check every 15 minutes: Expo rate-limits update checks. */
const CHECK_EVERY_MS = 15 * 60 * 1000;

/**
 * A new version of the app's code (an EAS Update, published on every push to the app's main branch) is fetched as soon
 * as the app opens or comes back, and a bar offers to restart into it now; left alone, it runs on the next launch.
 * Does nothing in development or Expo Go, where updates are off.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const last = useRef(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    let alive = true;
    const check = async () => {
      if (Date.now() - last.current < CHECK_EVERY_MS) return;
      last.current = Date.now();
      try {
        const found = await Updates.checkForUpdateAsync();
        if (!found.isAvailable) return;
        const got = await Updates.fetchUpdateAsync();
        if (alive && got.isNew) setReady(true);
      } catch {
        // offline, or the update server is busy: the next launch or return tries again
      }
    };
    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  if (!ready) return null;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="alert">
      <Text style={styles.text}>A new version of the app is ready.</Text>
      <Pressable
        onPress={() => {
          setRestarting(true);
          Updates.reloadAsync().catch(() => setRestarting(false));
        }}
        disabled={restarting}
        accessibilityRole="button"
        accessibilityLabel="Restart the app to use the new version"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{restarting ? 'Restarting...' : 'Restart'}</Text>
      </Pressable>
      <Pressable onPress={() => setReady(false)} accessibilityRole="button" accessibilityLabel="Later" hitSlop={8} style={styles.later}>
        <Text style={styles.laterText}>Later</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.midnight,
    borderTopWidth: 4,
    borderTopColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: { ...type.small, color: colors.white, flexGrow: 1, flexShrink: 1 },
  button: {
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.box,
    backgroundColor: colors.teal,
  },
  pressed: { opacity: 0.8 },
  buttonText: { ...type.smallBold, color: colors.midnight },
  later: { minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: spacing.xs },
  laterText: { ...type.small, color: colors.white, textDecorationLine: 'underline' },
});
