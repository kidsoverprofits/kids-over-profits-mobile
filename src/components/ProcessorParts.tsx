import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import type { ProcessorOutcome } from '@/api/processor';
import type { Credentials } from '@/api/types';
import { Field, FormSection as Section, Notice } from '@/components/form';
import { Button } from '@/components/site';
import { ErrorState, Loading } from '@/components/ui';
import { spacing, type } from '@/theme/typography';

export const isWebUrl = (u: string) => /^https?:\/\/[^\s/]+\.[^\s/]{2,}/i.test(u.trim());

/** Shown instead of the processor when nobody is signed in. */
export function SignInGate({ creds, ready }: { creds: Credentials | null; ready: boolean }) {
  const router = useRouter();
  if (!ready) return <Loading label="Loading" />;
  if (creds) return null;
  return (
    <View style={styles.gap}>
      <Text style={type.body}>Sign in with an administrator&apos;s WordPress account to use the processors.</Text>
      <Button label="Sign in" icon="key" onPress={() => router.push('/reviewer')} style={styles.start} />
    </View>
  );
}

/** The form could not be loaded (older site, bad login, offline). */
export function FormError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState message={message} onRetry={onRetry} />;
}

/** Address, optional pasted text and optional instructions, then "Read with AI". */
export function ReadSection({
  url,
  onUrl,
  text,
  onText,
  instructions,
  onInstructions,
  reading,
  status,
  onRead,
  what,
}: {
  url: string;
  onUrl: (t: string) => void;
  text: string;
  onText: (t: string) => void;
  instructions: string;
  onInstructions: (t: string) => void;
  reading: boolean;
  status: string;
  onRead: () => void;
  what: string;
}) {
  const [showText, setShowText] = useState(!!text);
  return (
    <Section title="1. The link">
      <Field
        label="Address"
        value={url}
        onChangeText={onUrl}
        keyboardType="url"
        autoCapitalize="none"
        placeholder="https://"
        hint={`The ${what} to read.`}
        required
      />
      {showText ? (
        <Field
          label="Paste the text"
          value={text}
          onChangeText={onText}
          multiline
          hint="For a paywalled or blocked page: paste the text here and the AI reads it instead of fetching the page."
        />
      ) : (
        <Button variant="secondary" label="Paste the text instead" onPress={() => setShowText(true)} style={styles.start} />
      )}
      <Field
        label="Instructions for the AI (optional)"
        value={instructions}
        onChangeText={onInstructions}
        multiline
        hint="For example: the facility is Teen Challenge in Rehrersburg, PA."
      />
      <Button label={reading ? 'Reading' : 'Read with AI'} icon="search" onPress={onRead} disabled={reading} style={styles.start} />
      {reading ? <Loading label="Reading. This takes up to a minute" /> : null}
      {status ? <Text style={type.meta}>{status}</Text> : null}
    </Section>
  );
}

/** "Publish on the site now" (when allowed) and "Send to the review queue", with the confirmation before publishing. */
export function SubmitBar({
  canPublish,
  busy,
  problem,
  outcome,
  onSubmit,
  noun,
}: {
  canPublish: boolean;
  busy: 'publish' | 'queue' | null;
  problem: string;
  outcome: ProcessorOutcome | null;
  onSubmit: (publish: boolean) => void;
  noun: string;
}) {
  const confirmPublish = () =>
    Alert.alert(
      'Publish on the site now?',
      `This ${noun} goes live on kidsoverprofits.org right away, without waiting in the review queue. You can undo it from Recently done in the Review inbox.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish now', style: 'destructive', onPress: () => onSubmit(true) },
      ],
    );
  return (
    <Section title="Save">
      {outcome?.kind === 'duplicate' ? <Notice kind="warn" title="Already on file">{outcome.message}</Notice> : null}
      {problem ? <Notice kind="error" title="Not saved">{problem}</Notice> : null}
      {canPublish ? (
        <Button
          label={busy === 'publish' ? 'Publishing' : 'Publish on the site now'}
          icon="send"
          onPress={confirmPublish}
          disabled={!!busy}
          style={styles.start}
        />
      ) : null}
      <Button
        variant={canPublish ? 'secondary' : 'primary'}
        label={busy === 'queue' ? 'Sending' : 'Send to the review queue'}
        icon="list"
        onPress={() => onSubmit(false)}
        disabled={!!busy}
        style={styles.start}
      />
    </Section>
  );
}

/** The success page: where it went, and "Process another". */
export function ProcessedResult({
  outcome,
  onAgain,
  again,
  children,
}: {
  outcome: Extract<ProcessorOutcome, { kind: 'ok' }>;
  onAgain: () => void;
  again: string;
  children?: ReactNode;
}) {
  return (
    <Section title={outcome.published ? 'Published' : 'Added'}>
      <Notice kind="ok" title={outcome.published ? 'Published. It is on the site now.' : 'Added.'}>
        {outcome.published
          ? 'Undo is under Recently done in the Review inbox.'
          : `It is waiting in ${outcome.queue}.`}
      </Notice>
      {children}
      <Button label={again} icon="plus" onPress={onAgain} style={styles.start} />
    </Section>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm, marginTop: spacing.md },
  start: { alignSelf: 'flex-start' },
});
