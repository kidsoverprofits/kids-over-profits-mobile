import { focusManager } from '@tanstack/react-query';
import { useState } from 'react';
import { AppState, Platform, RefreshControl, type AppStateStatus } from 'react-native';

import { colors } from '@/theme/colors';

/**
 * Coming back to the app counts as focus: React Query then reads again from kidsoverprofits.org every screen whose
 * copy is older than its staleTime (queries.ts). Called once, from the root layout.
 */
export function refetchWhenAppReturns() {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (Platform.OS !== 'web') setFocused(state === 'active');
    });
    return () => sub.remove();
  });
}

/**
 * Pull to refresh for a screen's ScrollView or FlatList: reads the screen's data from the live site again. The spinner
 * shows only while a pull is being answered, not during the quiet reads on return to the app.
 */
export function useRefreshControl(refetch: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const onRefresh = () => {
    setBusy(true);
    void Promise.resolve()
      .then(refetch)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };
  return <RefreshControl refreshing={busy} onRefresh={onRefresh} tintColor={colors.tealInk} colors={[colors.tealInk]} />;
}
