import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { checkDuplicate, emptyDraft, isLinkType, submitDraft } from '@/api/submit';
import type { SubmitDraft, SubmitOutcome, SubmitType } from '@/api/types';
import { CheckRow, Choice, CompanyField, FacilityPicker, Field, FormSection as Section, Notice } from '@/components/form';
import { Button, HubHeader } from '@/components/site';
import { TabPage } from '@/components/tabs/TabPage';
import { classifyUrl, type ClassifyFields } from '@/lib/classify';
import { rememberedAdmin } from '@/lib/adminSession';
import { useCredentials } from '@/lib/credentials';
import { fetchPageMeta, type PageMeta } from '@/lib/pageMeta';
import { extractUrl, looksLikeEmail } from '@/lib/sendLink';
import { colors } from '@/theme/colors';
import { spacing, type } from '@/theme/typography';

type Path = 'link' | 'new' | 'correction';

const PATHS = [
  { value: 'link' as const, label: 'Send a link' },
  { value: 'new' as const, label: 'Add a facility' },
  { value: 'correction' as const, label: 'Correct a facility' },
];
const LINK_TYPES = [
  { value: 'article' as const, label: 'Article' },
  { value: 'lawsuit' as const, label: 'Lawsuit' },
  { value: 'legislation' as const, label: 'Legislation' },
  { value: 'website' as const, label: 'Website' },
];

const APP_VERSION = Constants.expoConfig?.version ?? '';
const isWebUrl = (u: string) => /^https?:\/\/[^\s/]+\.[^\s/]{2,}/i.test(u.trim());

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Fill fields that are still empty from what is known about the link, so nothing a person typed is overwritten. */
function detect(p: SubmitDraft, meta: PageMeta | null, typePicked: boolean): SubmitDraft {
  const c = classifyUrl(
    p.url,
    meta ? { title: meta.title, bodySample: meta.bodySample, ogType: meta.ogType, ldTypes: meta.ldTypes, published: meta.published } : {},
  );
  const next: SubmitDraft = { ...p };
  if (!typePicked && isLinkType(p.type)) next.type = c.type;
  const fill = (
    key: 'jurisdiction' | 'case_number' | 'court' | 'bill_number' | 'session' | 'title' | 'site_name' | 'published' | 'author',
    value: string | undefined,
  ) => {
    if (value && !p[key].trim()) next[key] = value;
  };
  const f: ClassifyFields = c.fields;
  fill('jurisdiction', f.jurisdiction);
  fill('case_number', f.case_number);
  fill('court', f.court);
  fill('bill_number', f.bill_number);
  fill('session', f.session);
  if (meta) {
    fill('title', meta.title);
    fill('site_name', meta.siteName);
    fill('published', meta.published);
    fill('author', meta.author);
  }
  return next;
}

const TYPE_WORDS: Record<SubmitType, string> = {
  article: 'an article',
  lawsuit: 'a lawsuit',
  legislation: 'a bill',
  website: 'a website',
  facility_new: 'a facility',
  facility_correction: 'a correction',
};

export default function SendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; mode?: string; facility_id?: string; facility?: string; ts?: string }>();
  const { creds } = useCredentials();

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let live = true;
    void rememberedAdmin().then((u) => live && setIsAdmin(!!creds && !!u && u === creds.username));
    return () => {
      live = false;
    };
  }, [creds]);

  const [path, setPath] = useState<Path>('link');
  const [d, setD] = useState<SubmitDraft>(() => emptyDraft('article'));
  const [otherNames, setOtherNames] = useState('');
  const [wantNotify, setWantNotify] = useState(false);
  const [wantNewsletter, setWantNewsletter] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [problem, setProblem] = useState('');
  const [pasteNote, setPasteNote] = useState('');
  const [typePicked, setTypePicked] = useState(false);
  const [session, setSession] = useState(0);
  const [readFor, setReadFor] = useState('');
  const pickedRef = useRef(false);
  useEffect(() => {
    pickedRef.current = typePicked;
  }, [typePicked]);

  const set = <K extends keyof SubmitDraft>(key: K, value: SubmitDraft[K]) => setD((p) => ({ ...p, [key]: value }));

  // A link or a facility handed to this screen: a share, the deep link, or "Suggest a correction".
  const incoming = [params.ts, params.url, params.mode, params.facility_id, params.facility].join('|');
  const [seen, setSeen] = useState('');
  if (incoming !== seen) {
    setSeen(incoming);
    const shared = extractUrl(params.url);
    if (shared || params.mode === 'correction' || params.mode === 'new') {
      setTypePicked(false);
      setSession((s) => s + 1);
      setOutcome(null);
      setProblem('');
      if (params.mode === 'correction') {
        setPath('correction');
        setD({ ...emptyDraft('facility_correction'), facility: params.facility ?? '', facility_id: Number(params.facility_id) || null });
      } else if (params.mode === 'new') {
        setPath('new');
        setD({ ...emptyDraft('facility_new'), name: params.facility ?? '' });
      } else {
        setPath('link');
        setD(detect({ ...emptyDraft('article'), url: shared }, null, false));
      }
    }
  }

  const changeUrl = (t: string) => setD((p) => (isWebUrl(t) ? detect({ ...p, url: t }, null, typePicked) : { ...p, url: t }));

  // Read the page behind the link, once the address stops changing.
  const debouncedUrl = useDebounced(d.url.trim(), 700);
  const linkMode = path === 'link';
  useEffect(() => {
    if (!linkMode || !isWebUrl(debouncedUrl)) return;
    let live = true;
    fetchPageMeta(debouncedUrl).then((meta) => {
      if (!live) return;
      if (meta) setD((p) => detect(p, meta, pickedRef.current));
      setReadFor(`${session}|${debouncedUrl}`);
    });
    return () => {
      live = false;
    };
  }, [debouncedUrl, linkMode, session]);
  const looking = linkMode && isWebUrl(debouncedUrl) && readFor !== `${session}|${debouncedUrl}`;

  const debouncedTitle = useDebounced(d.title.trim(), 800);
  const dup = useQuery({
    queryKey: ['send-dup', d.type, debouncedUrl, debouncedTitle, !!creds],
    queryFn: () => checkDuplicate({ ...d, title: debouncedTitle, url: debouncedUrl }, creds),
    enabled: linkMode && isWebUrl(debouncedUrl),
    staleTime: 60 * 1000,
  });

  const choosePath = (next: Path) => {
    setPath(next);
    setOutcome(null);
    setProblem('');
    setD((p) => ({
      ...p,
      type: next === 'link' ? (isLinkType(p.type) ? p.type : 'article') : next === 'new' ? 'facility_new' : 'facility_correction',
    }));
  };

  const paste = async () => {
    setPasteNote('');
    try {
      const url = extractUrl(await Clipboard.getStringAsync());
      if (!url) {
        setPasteNote('There is no web address on the clipboard.');
        return;
      }
      setTypePicked(false);
      setSession((n) => n + 1);
      setPath('link');
      setOutcome(null);
      setD((p) => detect({ ...emptyDraft('article'), submitter_name: p.submitter_name, url }, null, false));
    } catch {
      setPasteNote('Could not read the clipboard. Type or paste the address into the box.');
    }
  };

  const reviewer = !!creds && linkMode;
  const needsEmail = !reviewer && (wantNotify || wantNewsletter);

  const validate = (): string => {
    if (linkMode && !isWebUrl(d.url)) return 'Enter the full web address, starting with https://.';
    if (path === 'new' && !d.name.trim()) return 'Enter the facility name.';
    if (path === 'correction') {
      if (!d.facility.trim() && !d.facility_id) return 'Pick the facility.';
      if (!d.notes.trim()) return 'Tell us what is wrong or what to add.';
    }
    if (d.url.trim() && !linkMode && !isWebUrl(d.url)) return 'The source link must be a full web address, or leave it empty.';
    if (needsEmail && !looksLikeEmail(email)) return 'Enter an email address, or untick the boxes that need one.';
    return '';
  };

  const send = async () => {
    const message = validate();
    setProblem(message);
    if (message) return;
    setBusy(true);
    const draft: SubmitDraft = {
      ...d,
      other_names: path === 'new' ? otherNames.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) : [],
      notify_email: needsEmail && wantNotify ? email.trim() : '',
      newsletter_email: needsEmail && wantNewsletter ? email.trim() : '',
    };
    const result = await submitDraft(draft, creds, APP_VERSION);
    setBusy(false);
    setOutcome(result);
    if (result.kind === 'error') setProblem(result.message);
  };

  const reset = () => {
    setTypePicked(false);
    setSession((n) => n + 1);
    setOutcome(null);
    setProblem('');
    setOtherNames('');
    setD((p) => ({ ...emptyDraft(p.type), submitter_name: p.submitter_name }));
    router.setParams({ url: undefined, mode: undefined, facility: undefined, facility_id: undefined, ts: undefined });
  };

  if (outcome?.kind === 'ok') {
    return (
      <TabPage>
        <HubHeader eyebrow="Send" title="Sent" />
        <Section title="Thank you">
          <Notice kind="ok" title="Thank you. We have it.">
            {`It is waiting in ${outcome.queue}. A person reviews everything before it appears on the site.`}
          </Notice>
          {d.notify_email || (needsEmail && wantNotify) ? (
            <Text style={type.body}>We will email you once it has been reviewed.</Text>
          ) : null}
          <Button label="Send another" icon="send" onPress={reset} style={styles.button} />
        </Section>
      </TabPage>
    );
  }

  return (
    <TabPage>
      <HubHeader eyebrow="Send" title="Send to Kids Over Profits" />
      <Notice kind="info">
        Everything you send is reviewed by a person before it appears on the site. You do not need an account.
      </Notice>
      {creds ? null : (
        <Button variant="secondary" label="Volunteer? Sign in" icon="key" onPress={() => router.push('/reviewer')} style={styles.button} />
      )}

      <Choice label="What to send" options={PATHS} value={path} onChange={choosePath} />

      {linkMode ? (
        <Section title="Send a link">
          <Field
            label="Link"
            value={d.url}
            onChangeText={changeUrl}
            keyboardType="url"
            autoCapitalize="none"
            placeholder="https://"
            hint={looking ? 'Reading the page for details...' : 'An article, court case, bill or program website.'}
            required
          />
          <Button label="Paste link" variant="secondary" onPress={paste} style={styles.button} />
          {pasteNote ? <Text style={type.meta}>{pasteNote}</Text> : null}

          {dup.data?.duplicate ? (
            <Notice kind="warn" title="Already on file">
              {dup.data.duplicates.length
                ? dup.data.duplicates.map((x) => `${x.type}: ${x.status}`).join('. ')
                : 'This link is already on the site or in review.'}
            </Notice>
          ) : null}

          {isAdmin && isWebUrl(d.url) && (d.type === 'article' || d.type === 'lawsuit') ? (
            <Button
              label={d.type === 'lawsuit' ? 'Open in Lawsuit Processor' : 'Open in News Processor'}
              icon={d.type === 'lawsuit' ? 'scale' : 'news'}
              onPress={() =>
                router.push({ pathname: d.type === 'lawsuit' ? '/lawsuit-processor' : '/news-processor', params: { url: d.url.trim() } })
              }
              style={styles.button}
            />
          ) : null}

          <Text style={type.smallBold}>Type</Text>
          <Choice
            label="Type of link"
            options={LINK_TYPES}
            value={isLinkType(d.type) ? d.type : 'article'}
            onChange={(t) => {
              setTypePicked(true);
              set('type', t);
            }}
          />

          <Field
            label={d.type === 'lawsuit' ? 'Case name' : d.type === 'legislation' ? 'Bill title' : 'Title'}
            value={d.title}
            onChangeText={(t) => set('title', t)}
            maxLength={300}
          />
          {d.type === 'article' || d.type === 'website' ? (
            <>
              <Field label="Publication or site" value={d.site_name} onChangeText={(t) => set('site_name', t)} />
              <Field label="Author" value={d.author} onChangeText={(t) => set('author', t)} autoCapitalize="words" />
              <Field label="Date" value={d.published} onChangeText={(t) => set('published', t)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
            </>
          ) : null}
          {d.type === 'lawsuit' ? (
            <>
              <Field label="Case number" value={d.case_number} onChangeText={(t) => set('case_number', t)} autoCapitalize="none" />
              <Field label="Court" value={d.court} onChangeText={(t) => set('court', t)} />
            </>
          ) : null}
          {d.type === 'legislation' ? (
            <>
              <Field label="Bill number" value={d.bill_number} onChangeText={(t) => set('bill_number', t)} placeholder="LD 1234" autoCapitalize="none" />
              <Field label="State or US" value={d.jurisdiction} onChangeText={(t) => set('jurisdiction', t.toUpperCase())} maxLength={4} placeholder="ME" autoCapitalize="none" />
              <Field label="Session" value={d.session} onChangeText={(t) => set('session', t)} />
            </>
          ) : null}
          <FacilityPicker
            key={session}
            label="Related facility (optional)"
            value={{ id: d.facility_id, name: d.facility }}
            onChange={(f) => setD((p) => ({ ...p, facility: f.name, facility_id: f.id }))}
          />
          <Field label="Notes for the reviewer" value={d.notes} onChangeText={(t) => set('notes', t)} multiline />
        </Section>
      ) : null}

      {path === 'new' ? (
        <Section title="Add a facility">
          <Text style={[type.body, { color: colors.textMuted }]}>For a program that is not on the site yet. Give what you know; leave the rest empty.</Text>
          <Field label="Facility name" value={d.name} onChangeText={(t) => set('name', t)} autoCapitalize="words" required />
          <Field label="Other names" value={otherNames} onChangeText={setOtherNames} hint="Past or alternate names, separated by commas." autoCapitalize="words" />
          <Field label="City" value={d.city} onChangeText={(t) => set('city', t)} autoCapitalize="words" />
          <Field label="State" value={d.state} onChangeText={(t) => set('state', t.toUpperCase().slice(0, 2))} maxLength={2} placeholder="UT" hint="Two-letter code." autoCapitalize="none" />
          <Field label="Country" value={d.country} onChangeText={(t) => set('country', t)} hint="If it is not in the United States." autoCapitalize="words" />
          <CompanyField label="Company or operator" value={d.operator} onChangeText={(t) => set('operator', t)} />
          <Field label="Type of program" value={d.program_type} onChangeText={(t) => set('program_type', t)} hint="For example wilderness, residential treatment or boarding school." />
          <Field label="Year opened" value={d.start_year} onChangeText={(t) => set('start_year', t)} keyboardType="number-pad" maxLength={4} />
          <Field label="Year closed" value={d.end_year} onChangeText={(t) => set('end_year', t)} keyboardType="number-pad" maxLength={4} />
          <Field label="Website" value={d.website} onChangeText={(t) => set('website', t)} keyboardType="url" autoCapitalize="none" />
          <Field label="Source link" value={d.url} onChangeText={(t) => set('url', t)} keyboardType="url" autoCapitalize="none" hint="Where you learned this. Optional." />
          <Field label="Notes for the reviewer" value={d.notes} onChangeText={(t) => set('notes', t)} multiline />
        </Section>
      ) : null}

      {path === 'correction' ? (
        <Section title="Correct or add to a facility">
          <FacilityPicker
            key={session}
            label="Facility"
            required
            value={{ id: d.facility_id, name: d.facility }}
            onChange={(f) => setD((p) => ({ ...p, facility: f.name, facility_id: f.id }))}
          />
          <Field label="What is wrong, or what should be added" value={d.notes} onChangeText={(t) => set('notes', t)} multiline required />
          <Field label="Source link" value={d.url} onChangeText={(t) => set('url', t)} keyboardType="url" autoCapitalize="none" hint="Where we can check it. Optional." />
        </Section>
      ) : null}

      {reviewer ? (
        <Notice kind="info" title={`Signed in as ${creds?.username ?? 'a volunteer'}`}>
          Links go straight to the review queues. You can sign out under Volunteer sign-in on the Home screen.
        </Notice>
      ) : (
        <Section title="About you (optional)">
          <Field label="Your name" value={d.submitter_name} onChangeText={(t) => set('submitter_name', t)} autoCapitalize="words" />
          <CheckRow label="Email me when this has been reviewed" checked={wantNotify} onChange={setWantNotify} />
          <CheckRow label="Also sign me up for the newsletter" checked={wantNewsletter} onChange={setWantNewsletter} />
          {needsEmail ? (
            <Field label="Your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          ) : null}
        </Section>
      )}

      {outcome?.kind === 'duplicate' ? (
        <Notice kind="warn" title="Already on file">{outcome.message}</Notice>
      ) : null}
      {problem ? <Notice kind="error" title="Not sent">{problem}</Notice> : null}

      <Button label={busy ? 'Sending' : `Send ${TYPE_WORDS[d.type]}`} icon="send" onPress={send} disabled={busy} style={styles.send} />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start' },
  send: { marginBottom: spacing.lg },
});
