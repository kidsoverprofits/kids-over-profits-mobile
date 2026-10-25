import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { openAuthSessionAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { testCredentials } from '@/api/submit';
import { Field, FormSection as Section, Notice } from '@/components/form';
import { Button, HubHeader } from '@/components/site';
import { TabPage } from '@/components/tabs/TabPage';
import { clearAdminSession, rememberAdmin, rememberedAdmin } from '@/lib/adminSession';
import { clearCredentials, useCredentials } from '@/lib/credentials';
import { signInWith, type SignInResult } from '@/lib/signIn';
import { authorizeUrl, readAuthorizeUrl } from '@/lib/wpAuthorize';
import { spacing, type } from '@/theme/typography';

/** Where WordPress sends its answer; reviewer-auth.tsx also reads it if the phone opens it as a link. */
export const AUTH_PATH = 'reviewer-auth';

/**
 * Sign-in for the site's reviewers. "Sign in with WordPress" opens the site's Authorize Application page, which
 * makes an application password for this app; pasting one by hand still works. Either is kept only in secure
 * storage and stays until it is revoked or the reviewer signs out here.
 */
export default function ReviewerScreen() {
  const router = useRouter();
  const { creds, ready, reload } = useCredentials();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let live = true;
    void rememberedAdmin().then((u) => live && setAdmin(!!creds && u === creds.username));
    return () => {
      live = false;
    };
  }, [creds]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'error' | 'info'; text: string } | null>(null);

  const entered = { username: username.trim(), appPassword: password.replace(/\s+/g, '') };
  const active = creds ?? (entered.username && entered.appPassword ? entered : null);

  const test = async () => {
    if (!active) {
      setNote({ kind: 'error', text: 'Enter a username and an application password first.' });
      return;
    }
    setBusy(true);
    const r = await testCredentials(active);
    setBusy(false);
    setNote(r.ok ? { kind: 'ok', text: `Signed in as ${r.user}.` } : { kind: 'error', text: r.message });
  };

  const finish = async (r: SignInResult) => {
    setBusy(false);
    if (!r.ok) {
      setNote({ kind: 'error', text: r.message });
      return;
    }
    setPassword('');
    setAdmin(r.admin);
    await reload();
    setNote({
      kind: 'ok',
      text: r.admin
        ? `Signed in as ${r.user}. The Admin tab now holds the review queues and every KOP Tools screen, and stays signed in on this phone.`
        : `Signed in as ${r.user}. Links you send now go straight to the review queues.`,
    });
  };

  const save = async () => {
    if (!entered.username || !entered.appPassword) {
      setNote({ kind: 'error', text: 'Enter a username and an application password.' });
      return;
    }
    setBusy(true);
    await finish(await signInWith(entered));
  };

  const signInWithWordPress = async () => {
    const redirect = Linking.createURL(AUTH_PATH);
    setBusy(true);
    setNote(null);
    let answer = '';
    try {
      const r = await openAuthSessionAsync(authorizeUrl(redirect, Platform.OS === 'ios' ? 'iPhone' : 'Android'), redirect);
      if (r.type === 'success') answer = r.url;
    } catch (e) {
      setBusy(false);
      setNote({ kind: 'error', text: (e as Error).message });
      return;
    }
    const result = readAuthorizeUrl(answer);
    if (result.kind === 'ok') {
      await finish(await signInWith(result.creds));
      return;
    }
    setBusy(false);
    // The phone may have handed WordPress's answer to reviewer-auth.tsx instead; it signs in and comes back here.
    await reload();
    setNote(
      result.kind === 'rejected'
        ? { kind: 'info', text: 'WordPress was told not to connect the app. Nothing was saved.' }
        : { kind: 'info', text: 'The sign-in was closed before WordPress answered.' },
    );
  };

  const signOut = async () => {
    await clearCredentials();
    await clearAdminSession();
    await rememberAdmin(null);
    setAdmin(false);
    setUsername('');
    setPassword('');
    await reload();
    setNote({ kind: 'info', text: 'Signed out. This device no longer holds the login.' });
  };

  return (
    <TabPage>
      <HubHeader eyebrow="Send" title="Reviewer sign-in" />
      <Section title="Sign in">
        <>
          <Text style={type.body}>
            For the site&apos;s reviewers. Sign in with WordPress opens the site&apos;s login; after you log in, tap Approve and the app keeps its own login in this device&apos;s secure storage. It stays signed in until you sign out here or revoke it in WordPress under Users, Profile, Application Passwords.
          </Text>
          <Text style={type.body}>Everyone else can send links and facility information without signing in.</Text>
        </>

        {ready && creds ? (
          <Notice kind="ok" title={`Signed in as ${creds.username}`} />
        ) : (
          <Button label={busy ? 'Checking' : 'Sign in with WordPress'} onPress={signInWithWordPress} disabled={busy} style={styles.button} />
        )}

        {note ? <Notice kind={note.kind}>{note.text}</Notice> : null}

        {creds && admin ? <Button label="Open the Admin tab" onPress={() => router.navigate('/admin')} style={styles.button} /> : null}
      </Section>

      {!creds ? (
        <Section title="Or paste an application password">
          <>
            <Text style={type.body}>Made by hand in WordPress under Users, Profile, Application Passwords.</Text>
            <Field label="WordPress username" value={username} onChangeText={setUsername} autoCapitalize="none" />
            <Field label="Application password" value={password} onChangeText={setPassword} autoCapitalize="none" secure />
          </>
          <Button label={busy ? 'Checking' : 'Sign in'} variant="secondary" onPress={save} disabled={busy} style={styles.button} />
        </Section>
      ) : null}

      {creds ? (
        <Section title="This login">
          <Button label={busy ? 'Checking' : 'Test'} variant="secondary" onPress={test} disabled={busy} style={styles.button} />
          <Button label="Sign out" variant="secondary" onPress={signOut} disabled={busy} style={styles.button} />
        </Section>
      ) : null}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start', marginBottom: spacing.xs },
});
