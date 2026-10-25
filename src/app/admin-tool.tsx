import { useLocalSearchParams, useNavigation } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { startAdminSession } from '@/api/admin';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/site';
import { AppText, Loading } from '@/components/ui';
import { clearAdminSession, hasAdminSession, isSiteUrl, loginRedirect, markAdminSession } from '@/lib/adminSession';
import { loadCredentials } from '@/lib/credentials';
import { colors } from '@/theme/colors';
import { spacing, touchTarget } from '@/theme/typography';

/**
 * One KOP Tools screen (or any wp-admin page) in a web view signed in to WordPress. The session is the web
 * view's long cookie; when WordPress shows its login page anyway, the app signs in again with the stored
 * application password, once per screen, and lands on the page that was asked for.
 */
export default function AdminToolScreen() {
  const navigation = useNavigation();
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const web = useRef<WebView>(null);
  const [source, setSource] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const signingIn = useRef(false);
  const signedInHere = useRef(false);
  const current = useRef(url);

  const signIn = useCallback(async (redirect: string) => {
    if (signingIn.current) return;
    signingIn.current = true;
    setState('loading');
    try {
      const creds = await loadCredentials();
      if (!creds) throw new Error('Sign in first: Home, Volunteers.');
      const login = await startAdminSession(creds, redirect);
      await markAdminSession();
      signedInHere.current = true;
      setSource(login);
    } catch (e) {
      await clearAdminSession();
      setError((e as Error).message);
      setState('error');
    } finally {
      signingIn.current = false;
    }
  }, []);

  useEffect(() => {
    if (!url) return;
    (async () => {
      if (await hasAdminSession()) setSource(url);
      else await signIn(url);
    })();
  }, [url, signIn]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title || 'KOP Tools',
      headerRight: () => (
        <View style={styles.headerButtons}>
          <Pressable onPress={() => web.current?.reload()} accessibilityRole="button" accessibilityLabel="Reload" hitSlop={8} style={styles.headerButton}>
            <Icon name="refresh" size={22} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={() => void openBrowserAsync(current.current || url)}
            accessibilityRole="button"
            accessibilityLabel="Open in the browser"
            hitSlop={8}
            style={styles.headerButton}>
            <Icon name="external" size={22} color={colors.white} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, title, url]);

  // Android's back button walks back through the tool's pages before leaving the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      web.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, [canGoBack]);

  /** WordPress asked for a login: answer it once with a new session; a second time shows the form. */
  const answerLogin = (target: string): boolean => {
    const redirect = loginRedirect(target);
    if (!redirect || signedInHere.current) return false;
    void signIn(redirect);
    return true;
  };

  const onRequest = (req: WebViewNavigation) => {
    if (answerLogin(req.url)) return false;
    if (isSiteUrl(req.url) || /^(about|data|blob):/.test(req.url)) return true;
    void openBrowserAsync(req.url);
    return false;
  };

  if (!url) return <AppText variant="body">No tool was chosen.</AppText>;

  return (
    <View style={styles.screen}>
      {source ? (
        <WebView
          ref={web}
          source={{ uri: source }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={onRequest}
          onNavigationStateChange={(nav) => {
            setCanGoBack(nav.canGoBack);
            if (isSiteUrl(nav.url) && !nav.url.includes('/app-login')) current.current = nav.url;
            // Android may not ask before following a server redirect to the login page.
            answerLogin(nav.url);
          }}
          onLoadEnd={() => setState((s) => (s === 'error' ? s : 'loaded'))}
          onError={() => {
            setError('The page could not be loaded. Check your connection and try again.');
            setState('error');
          }}
          style={styles.web}
        />
      ) : null}
      {state === 'loading' ? (
        <View style={styles.overlay} pointerEvents="none">
          <Loading label="Opening the tool" />
        </View>
      ) : null}
      {state === 'error' ? (
        <View style={[styles.overlay, styles.errorBox]}>
          <AppText variant="body" style={styles.center}>{error}</AppText>
          <Button
            label="Try again"
            onPress={() => {
              signedInHere.current = false;
              setError('');
              if (source) {
                setState('loading');
                web.current?.reload();
              } else void signIn(url);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  web: { flex: 1, backgroundColor: colors.white },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  errorBox: { padding: spacing.lg, gap: spacing.md },
  center: { textAlign: 'center' },
  headerButtons: { flexDirection: 'row' },
  headerButton: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
