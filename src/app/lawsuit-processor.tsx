import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import {
  applyLawsuitFields,
  buildLawsuitSubmitBody,
  emptyLawsuitDraft,
  processLawsuit,
  submitProcessed,
  useLawsuitForm,
  type LawsuitDraft,
  type ProcessorOutcome,
} from '@/api/processor';
import { Choice, Field, FormSection as Section, Notice } from '@/components/form';
import { isWebUrl, ProcessedResult, ReadSection, SignInGate, SubmitBar } from '@/components/ProcessorParts';
import { HubHeader } from '@/components/site';
import { ErrorState, Loading } from '@/components/ui';
import { TabPage } from '@/components/tabs/TabPage';
import { useCredentials } from '@/lib/credentials';
import { extractUrl } from '@/lib/sendLink';
import { type } from '@/theme/typography';

/**
 * Admin mode: the Lawsuit Processor. The site's AI reads a court-case link and fills the fields; the
 * administrator edits them, then publishes on the site or sends the case to the review queue.
 */
export default function LawsuitProcessorScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const { creds, ready } = useCredentials();
  const form = useLawsuitForm(creds);

  const [d, setD] = useState<LawsuitDraft>(() => emptyLawsuitDraft(extractUrl(params.url)));
  const [text, setText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState('');
  const [busy, setBusy] = useState<'publish' | 'queue' | null>(null);
  const [problem, setProblem] = useState('');
  const [outcome, setOutcome] = useState<ProcessorOutcome | null>(null);

  const shared = extractUrl(params.url);
  const [seen, setSeen] = useState(shared);
  if (shared !== seen) {
    setSeen(shared);
    if (shared) setD(emptyLawsuitDraft(shared));
  }

  const set = <K extends keyof LawsuitDraft>(key: K, value: LawsuitDraft[K]) => setD((p) => ({ ...p, [key]: value }));

  const read = async () => {
    if (!creds) return;
    if (!isWebUrl(d.url) && !text.trim()) {
      setReadNote('Enter the full web address, starting with https://, or paste the text.');
      return;
    }
    setReading(true);
    setReadNote('');
    try {
      const fields = await processLawsuit(creds, { url: d.url.trim(), text: text.trim(), instructions: instructions.trim() });
      setD((p) => applyLawsuitFields(p, fields, form.data?.statuses));
      setReadNote('Filled in. Check each field before saving.');
    } catch (e) {
      setReadNote((e as Error).message);
    } finally {
      setReading(false);
    }
  };

  const submit = async (publish: boolean) => {
    if (!creds) return;
    if (!isWebUrl(d.url)) {
      setProblem('Enter the full web address of the case, starting with https://.');
      return;
    }
    setProblem('');
    setOutcome(null);
    setBusy(publish ? 'publish' : 'queue');
    const result = await submitProcessed('lawsuit', buildLawsuitSubmitBody(d, publish), creds);
    setBusy(null);
    setOutcome(result);
    if (result.kind === 'error') setProblem(result.message);
  };

  const again = () => {
    setD(emptyLawsuitDraft());
    setText('');
    setInstructions('');
    setReadNote('');
    setProblem('');
    setOutcome(null);
    setSeen('');
  };

  return (
    <TabPage>
      <HubHeader eyebrow="Admin" title="Lawsuit Processor" standfirst={form.data?.user ? `Signed in as ${form.data.user}` : undefined} />
      <SignInGate creds={creds} ready={ready} />
      {creds && form.isLoading ? <Loading label="Loading the Lawsuit Processor" /> : null}
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
            what="court case"
          />

          <Section title="2. The case">
            <Field label="Case name" value={d.case_name} onChangeText={(t) => set('case_name', t)} maxLength={300} />
            <Field label="Case number" value={d.case_number} onChangeText={(t) => set('case_number', t)} autoCapitalize="none" />
            <Field label="Court" value={d.court} onChangeText={(t) => set('court', t)} />
            <Field label="State or US" value={d.jurisdiction} onChangeText={(t) => set('jurisdiction', t)} autoCapitalize="none" />
            <Field label="Filing date" value={d.filing_date} onChangeText={(t) => set('filing_date', t)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
            {form.data.statuses.length ? (
              <>
                <Text style={type.smallBold}>Status</Text>
                <Choice label="Status" options={form.data.statuses} value={d.status} onChange={(v) => set('status', v)} />
              </>
            ) : (
              <Field label="Status" value={d.status} onChangeText={(t) => set('status', t)} />
            )}
            <Field label="Outcome" value={d.outcome} onChangeText={(t) => set('outcome', t)} multiline />
            <Field label="Settlement amount" value={d.settlement_amount} onChangeText={(t) => set('settlement_amount', t)} autoCapitalize="none" />
            <Field label="Summary" value={d.summary} onChangeText={(t) => set('summary', t)} multiline />
          </Section>

          <Section title="3. Parties and claims">
            <Field label="Plaintiffs" value={d.plaintiffs} onChangeText={(t) => set('plaintiffs', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Defendants" value={d.defendants} onChangeText={(t) => set('defendants', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Facilities mentioned" value={d.facilities_mentioned} onChangeText={(t) => set('facilities_mentioned', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Staff mentioned" value={d.staff_mentioned} onChangeText={(t) => set('staff_mentioned', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Organizations mentioned" value={d.organizations_mentioned} onChangeText={(t) => set('organizations_mentioned', t)} multiline autoCapitalize="words" hint="One per line." />
            <Field label="Claims" value={d.claims} onChangeText={(t) => set('claims', t)} multiline hint="One per line." />
            <Field label="Tags" value={d.tags} onChangeText={(t) => set('tags', t)} autoCapitalize="none" hint="Separated by commas." />
            <Field label="Notes for the reviewer" value={d.notes} onChangeText={(t) => set('notes', t)} multiline />
          </Section>

          {form.data.can_publish ? null : (
            <Notice kind="info">This account can send cases to the review queue but not publish them directly.</Notice>
          )}
          <SubmitBar canPublish={form.data.can_publish} busy={busy} problem={problem} outcome={outcome} onSubmit={submit} noun="case" />
        </>
      ) : null}
    </TabPage>
  );
}
