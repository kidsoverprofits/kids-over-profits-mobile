import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  applyNewsFields,
  buildNewsSubmitBody,
  describeArchive,
  emptyNewsDraft,
  findArchive,
  processArticle,
  submitProcessed,
  useNewsForm,
  type NewsDraft,
  type ProcessorOutcome,
} from '@/api/processor';
import { CheckRow, Choice, Field, FormSection as Section, Notice } from '@/components/form';
import { isWebUrl, ProcessedResult, ReadSection, SignInGate, SubmitBar } from '@/components/ProcessorParts';
import { Button, HubHeader } from '@/components/site';
import { ErrorState, Loading } from '@/components/ui';
import { TabPage } from '@/components/tabs/TabPage';
import { useCredentials } from '@/lib/credentials';
import { extractUrl } from '@/lib/sendLink';
import { spacing, type } from '@/theme/typography';

/**
 * Admin mode: the News Processor. The site's AI reads an article link and fills the fields; the administrator
 * edits them, then publishes on the site or sends the article to the review queue. Mirrors the Send to KOP
 * extension's reviewer panel.
 */
export default function NewsProcessorScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const { creds, ready } = useCredentials();
  const form = useNewsForm(creds);

  const [d, setD] = useState<NewsDraft>(() => emptyNewsDraft(extractUrl(params.url)));
  const [text, setText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState('');
  const [archiveNote, setArchiveNote] = useState('');
  const [finding, setFinding] = useState(false);
  const [busy, setBusy] = useState<'publish' | 'queue' | null>(null);
  const [problem, setProblem] = useState('');
  const [outcome, setOutcome] = useState<ProcessorOutcome | null>(null);

  // A different link handed to this screen (a share while it is open) starts over with that link.
  const shared = extractUrl(params.url);
  const [seen, setSeen] = useState(shared);
  if (shared !== seen) {
    setSeen(shared);
    if (shared) setD(emptyNewsDraft(shared));
  }

  const set = <K extends keyof NewsDraft>(key: K, value: NewsDraft[K]) => setD((p) => ({ ...p, [key]: value }));

  // The type picker starts on the first type the site lists.
  const articleType = d.article_type || form.data?.types[0]?.value || '';

  const read = async () => {
    if (!creds) return;
    if (!isWebUrl(d.url) && !text.trim()) {
      setReadNote('Enter the full web address, starting with https://, or paste the text.');
      return;
    }
    setReading(true);
    setReadNote('');
    try {
      const fields = await processArticle(creds, { url: d.url.trim(), text: text.trim(), instructions: instructions.trim() });
      setD((p) => applyNewsFields(p, fields, form.data?.types));
      setReadNote('Filled in. Check each field before saving.');
    } catch (e) {
      setReadNote((e as Error).message);
    } finally {
      setReading(false);
    }
  };

  const lookUpArchive = async () => {
    if (!creds || !isWebUrl(d.url)) {
      setArchiveNote('Enter the article address first.');
      return;
    }
    setFinding(true);
    setArchiveNote('Looking for a Wayback Machine copy');
    try {
      const a = await findArchive(creds, d.url.trim());
      if (a.archive_url) set('archive_url', a.archive_url);
      setArchiveNote(a.archive_url ? describeArchive(a) : 'No Wayback Machine copy yet. Save one at web.archive.org/save, then paste its address here.');
    } catch (e) {
      setArchiveNote((e as Error).message);
    } finally {
      setFinding(false);
    }
  };

  const submit = async (publish: boolean) => {
    if (!creds) return;
    if (!isWebUrl(d.url)) {
      setProblem('Enter the full web address of the article, starting with https://.');
      return;
    }
    setProblem('');
    setOutcome(null);
    setBusy(publish ? 'publish' : 'queue');
    const result = await submitProcessed('news', buildNewsSubmitBody({ ...d, article_type: articleType }, form.data ?? null, publish), creds);
    setBusy(null);
    setOutcome(result);
    if (result.kind === 'error') setProblem(result.message);
  };

  const again = () => {
    setD(emptyNewsDraft());
    setText('');
    setInstructions('');
    setReadNote('');
    setArchiveNote('');
    setProblem('');
    setOutcome(null);
    setSeen('');
  };

  const typeDetails = form.data?.details[articleType] ?? {};

  return (
    <TabPage>
      <HubHeader eyebrow="Admin" title="News Processor" standfirst={form.data?.user ? `Signed in as ${form.data.user}` : undefined} />
      <SignInGate creds={creds} ready={ready} />
      {creds && form.isLoading ? <Loading label="Loading the News Processor" /> : null}
      {creds && form.isError ? <ErrorState message={(form.error as Error).message} onRetry={() => form.refetch()} /> : null}

      {creds && form.data && outcome?.kind === 'ok' ? (
        <ProcessedResult outcome={outcome} onAgain={again} again="Process another" />
      ) : null}

      {creds && form.data && outcome?.kind !== 'ok' ? (
        <>
          <ReadSection
            url={d.url}
            onUrl={(t) => set('url', t)}
            text={text}
            onText={setText}
            instructions={instructions}
            onInstructions={setInstructions}
            reading={reading}
            status={readNote}
            onRead={read}
            what="article"
          />

          <Section title="2. The article">
            <Text style={type.smallBold}>Type of article</Text>
            <Choice
              label="Type of article"
              options={form.data.types}
              value={articleType}
              onChange={(t) => set('article_type', t)}
            />
            <Field label="Title" value={d.title} onChangeText={(t) => set('title', t)} maxLength={300} />
            <Field label="Alternate title" value={d.alternate_title} onChangeText={(t) => set('alternate_title', t)} />
            <Field label="Publication or site" value={d.site_name} onChangeText={(t) => set('site_name', t)} />
            <Field label="Author" value={d.author} onChangeText={(t) => set('author', t)} autoCapitalize="words" />
            <Field label="Date" value={d.published} onChangeText={(t) => set('published', t)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
            <Field label="Location" value={d.location} onChangeText={(t) => set('location', t)} autoCapitalize="words" />
            <Field label="Summary" value={d.summary} onChangeText={(t) => set('summary', t)} multiline />
          </Section>

          <Section title="3. People, places and tags">
            <Field label="Facilities" value={d.facilities} onChangeText={(t) => set('facilities', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Staff and company people" value={d.staff} onChangeText={(t) => set('staff', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Survivors and families" value={d.survivors} onChangeText={(t) => set('survivors', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Tags" value={d.tags} onChangeText={(t) => set('tags', t)} autoCapitalize="none" hint="Separated by commas." />
          </Section>

          {form.data.warnings.length ? (
            <Section title="Content warnings">
              {form.data.warnings.map((w) => (
                <CheckRow
                  key={w}
                  label={w}
                  checked={d.warnings.includes(w)}
                  onChange={(on) => set('warnings', on ? [...d.warnings, w] : d.warnings.filter((x) => x !== w))}
                />
              ))}
            </Section>
          ) : null}

          {Object.keys(typeDetails).length ? (
            <Section title="Details for this type">
              {Object.entries(typeDetails).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={d.details[key] ?? ''}
                  onChangeText={(t) => setD((p) => ({ ...p, details: { ...p.details, [key]: t } }))}
                />
              ))}
            </Section>
          ) : null}

          <Section title="Archived copy">
            <Field
              label="Archived copy address"
              value={d.archive_url}
              onChangeText={(t) => set('archive_url', t)}
              keyboardType="url"
              autoCapitalize="none"
              placeholder="https://web.archive.org/"
            />
            <Button variant="secondary" label={finding ? 'Looking' : 'Find an archived copy'} icon="search" onPress={lookUpArchive} disabled={finding} style={styles.start} />
            {archiveNote ? <Text style={type.meta}>{archiveNote}</Text> : null}
            <Field label="Notes for the reviewer" value={d.notes} onChangeText={(t) => set('notes', t)} multiline />
          </Section>

          {form.data.can_publish ? null : (
            <Notice kind="info">This account can send articles to the review queue but not publish them directly.</Notice>
          )}
          <SubmitBar canPublish={form.data.can_publish} busy={busy} problem={problem} outcome={outcome} onSubmit={submit} noun="article" />
        </>
      ) : null}
    </TabPage>
  );
}

const styles = StyleSheet.create({ start: { alignSelf: 'flex-start', marginTop: spacing.xs } });
