import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DisclaimerGate } from '@/components/DisclaimerGate';
import { ShareIntentHandler } from '@/components/ShareIntentHandler';
import { colors } from '@/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bgPrimary, card: colors.midnight, text: colors.white, primary: colors.teal, border: colors.cardBorder },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.midnight },
              headerShadowVisible: false,
              headerTintColor: colors.white,
              headerTitleStyle: { fontWeight: '700' },
              headerBackButtonDisplayMode: 'minimal',
              // The native stack header takes only a background colour, so the footer's 4 px teal rule is
              // the top edge of the screen under it. The tabs draw their own header with the rule.
              contentStyle: { backgroundColor: colors.bgPrimary, borderTopWidth: 4, borderTopColor: colors.teal },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPrimary } }} />
            <Stack.Screen name="facility/[slug]" options={{ title: 'Facility' }} />
            <Stack.Screen name="operator/[slug]" options={{ title: 'Company' }} />
            <Stack.Screen name="place/[slug]" options={{ title: 'Place' }} />
            <Stack.Screen name="documents/[slug]" options={{ title: 'Documents' }} />
            <Stack.Screen name="doc" options={{ title: 'Document' }} />
            <Stack.Screen name="reviewer" options={{ title: 'Volunteer sign-in' }} />
            <Stack.Screen name="reviewer-auth" options={{ title: 'Signing in' }} />
            <Stack.Screen name="admin-tool" options={{ title: 'KOP Tools' }} />
            <Stack.Screen name="news-processor" options={{ title: 'News Processor' }} />
            <Stack.Screen name="lawsuit-processor" options={{ title: 'Lawsuit Processor' }} />
            <Stack.Screen name="resources" options={{ title: 'Resources' }} />
            <Stack.Screen name="about" options={{ title: 'About' }} />
          </Stack>
          <ShareIntentHandler />
          <DisclaimerGate />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
