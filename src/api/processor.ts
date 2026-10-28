import { useQuery } from '@tanstack/react-query';

import { API_BASE } from '@/api/client';
import { basicHeaders, describeDuplicates, duplicatesOf, send, type RequestSpec } from '@/api/submit';
import type { Credentials } from '@/api/types';

/**
 * Admin mode: the News Processor and the Lawsuit Processor. They mirror the Send to KOP extension's reviewer
 * panel (kop-send-to-kop popup.js / api.js): the site's AI reads a link and fills the fields, the administrator
 * edits them, then publishes on the site or sends the record to the review queue. Every route takes HTTP Basic
 * auth with the administrator's application password.
 */
type Json = Record<string, unknown>;

export type Option = { value: string; label: string };
export type NewsForm = {
  types: Option[];
  warnings: string[];
  details: Record<string, Record<string, string>>;
  can_publish: boolean;
  user: string;
};
export type LawsuitForm = { statuses: Option[]; can_publish: boolean; user: string };
export type ArchiveResult = { archive_url: string; timestamp: string; save_url: string };

export type ProcessInput = { url: string; text: string; instructions: string };

export type NewsFields = {
  title: string;
  author: string;
  published: string;
  site_name: string;
  location: string;
  tags: string[];
  facilities: string[];
  staff: string[];
  survivors: string[];
  summary: string;
  alternate_title: string;
  content_warnings: string[];
  article_type: string;
  details: Record<string, string>;
};
export type LawsuitFields = {
  case_name: string;
  case_number: string;
  court: string;
  jurisdiction: string;
  filing_date: string;
  status: string;
  outcome: string;
  settlement_amount: string;
  summary: string;
  plaintiffs: string[];
  defendants: string[];
  facilities_mentioned: string[];
  staff_mentioned: string[];
  organizations_mentioned: string[];
  claims: string[];
  tags: string[];
};

/** What the screens edit: list fields are one entry per line, tags are comma separated. */
export type NewsDraft = {
  url: string;
  archive_url: string;
  title: string;
  author: string;
  published: string;
  site_name: string;
  location: string;
  alternate_title: string;
  summary: string;
  article_type: string;
  tags: string;
  facilities: string;
  staff: string;
  survivors: string;
  warnings: string[];
  details: Record<string, string>;
  notes: string;
};
export type LawsuitDraft = {
  url: string;
  case_name: string;
  case_number: string;
  court: string;
  jurisdiction: string;
  filing_date: string;
  status: string;
  outcome: string;
  settlement_amount: string;
  summary: string;
  plaintiffs: string;
  defendants: string;
  facilities_mentioned: string;
  staff_mentioned: string;
  organizations_mentioned: string;
  claims: string;
  tags: string;
  notes: string;
};

export type ProcessorKind = 'news' | 'lawsuit';
export type ProcessorOutcome =
  | { kind: 'ok'; published: boolean; queue: string }
  | { kind: 'duplicate'; message: string }
  | { kind: 'error'; message: string };

export const emptyNewsDraft = (url = ''): NewsDraft => ({
  url, archive_url: '', title: '', author: '', published: '', site_name: '', location: '', alternate_title: '', summary: '',
  article_type: '', tags: '', facilities: '', staff: '', survivors: '', warnings: [], details: {}, notes: '',
});
export const emptyLawsuitDraft = (url = ''): LawsuitDraft => ({
  url, case_name: '', case_number: '', court: '', jurisdiction: '', filing_date: '', status: '', outcome: '',
  settlement_amount: '', summary: '', plaintiffs: '', defendants: '', facilities_mentioned: '', staff_mentioned: '',
  organizations_mentioned: '', claims: '', tags: '', notes: '',
});

/* ---------- pure helpers ---------- */

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/** Split a text area (one entry per line) into trimmed, non-empty entries. */
export const lines = (v: string): string[] => v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
/** Split a comma-separated field. */
export const commaList = (v: string): string[] => v.split(',').map((s) => s.trim()).filter(Boolean);

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Add `values` under the existing lines, skipping any already there (case-insensitive). */
export function mergeLines(current: string, values: string[]): string {
  const have = lines(current);
  for (const v of values) if (!have.some((h) => same(h, v))) have.push(v);
  return have.join('\n');
}
/** The same for a comma-separated field. */
export function mergeTags(current: string, values: string[]): string {
  const have = commaList(current);
  for (const v of values) if (!have.some((h) => same(h, v))) have.push(v);
  return have.join(', ');
}
const ifEmpty = (current: string, value: string) => (current.trim() ? current : value);

export function readNewsFields(raw: Json): NewsFields {
  const d = raw.details && typeof raw.details === 'object' && !Array.isArray(raw.details) ? (raw.details as Json) : {};
  return {
    title: str(raw.title),
    author: str(raw.author),
    published: str(raw.published),
    site_name: str(raw.site_name),
    location: str(raw.location),
    tags: strList(raw.tags),
    facilities: strList(raw.facilities),
    staff: strList(raw.staff),
    survivors: strList(raw.survivors),
    summary: str(raw.summary),
    alternate_title: str(raw.alternate_title),
    content_warnings: strList(raw.content_warnings),
    article_type: str(raw.article_type),
    details: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, str(v)] as [string, string]).filter(([, v]) => v)),
  };
}

export function readLawsuitFields(raw: Json): LawsuitFields {
  return {
    case_name: str(raw.case_name),
    case_number: str(raw.case_number),
    court: str(raw.court),
    jurisdiction: str(raw.jurisdiction),
    filing_date: str(raw.filing_date),
    status: str(raw.status),
    outcome: str(raw.outcome),
    settlement_amount: str(raw.settlement_amount),
    summary: str(raw.summary),
    plaintiffs: strList(raw.plaintiffs),
    defendants: strList(raw.defendants),
    facilities_mentioned: strList(raw.facilities_mentioned),
    staff_mentioned: strList(raw.staff_mentioned),
    organizations_mentioned: strList(raw.organizations_mentioned),
    claims: strList(raw.claims),
    tags: strList(raw.tags),
  };
}

/** The AI's answer into the draft the way the extension does it: empty fields are filled, lists are merged, nothing typed is overwritten. */
export function applyNewsFields(d: NewsDraft, f: NewsFields, types: Option[] = []): NewsDraft {
  const typeKnown = !types.length || types.some((t) => t.value === f.article_type);
  const typed = Object.fromEntries(Object.entries(d.details).filter(([, v]) => v.trim()));
  return {
    ...d,
    title: ifEmpty(d.title, f.title),
    author: ifEmpty(d.author, f.author),
    published: ifEmpty(d.published, /^\d{4}-\d{2}-\d{2}$/.test(f.published) ? f.published : ''),
    site_name: ifEmpty(d.site_name, f.site_name),
    location: ifEmpty(d.location, f.location),
    alternate_title: ifEmpty(d.alternate_title, f.alternate_title),
    summary: ifEmpty(d.summary, f.summary),
    facilities: mergeLines(d.facilities, f.facilities),
    staff: mergeLines(d.staff, f.staff),
    survivors: mergeLines(d.survivors, f.survivors),
    tags: mergeTags(d.tags, f.tags),
    warnings: [...d.warnings, ...f.content_warnings.filter((w) => !d.warnings.includes(w))],
    article_type: f.article_type && typeKnown ? f.article_type : d.article_type,
    details: { ...f.details, ...typed },
  };
}

export function applyLawsuitFields(d: LawsuitDraft, f: LawsuitFields, statuses: Option[] = []): LawsuitDraft {
  const statusKnown = !statuses.length || statuses.some((s) => s.value === f.status);
  return {
    ...d,
    case_name: ifEmpty(d.case_name, f.case_name),
    case_number: ifEmpty(d.case_number, f.case_number),
    court: ifEmpty(d.court, f.court),
    jurisdiction: ifEmpty(d.jurisdiction, f.jurisdiction),
    filing_date: ifEmpty(d.filing_date, f.filing_date),
    status: ifEmpty(d.status, statusKnown ? f.status : ''),
    outcome: ifEmpty(d.outcome, f.outcome),
    settlement_amount: ifEmpty(d.settlement_amount, f.settlement_amount),
    summary: ifEmpty(d.summary, f.summary),
    plaintiffs: mergeLines(d.plaintiffs, f.plaintiffs),
    defendants: mergeLines(d.defendants, f.defendants),
    facilities_mentioned: mergeLines(d.facilities_mentioned, f.facilities_mentioned),
    staff_mentioned: mergeLines(d.staff_mentioned, f.staff_mentioned),
    organizations_mentioned: mergeLines(d.organizations_mentioned, f.organizations_mentioned),
    claims: mergeLines(d.claims, f.claims),
    tags: mergeTags(d.tags, f.tags),
  };
}

const putIf = (o: Json, key: string, v: string) => {
  if (v.trim()) o[key] = v.trim();
};

/** The body of POST extension/submit for an article, with the extension's keys (popup.js collect()). */
export function buildNewsSubmitBody(d: NewsDraft, newsForm: Pick<NewsForm, 'details'> | null, publish: boolean): Json {
  const shown = Object.keys(newsForm?.details?.[d.article_type] ?? {});
  const body: Json = {
    type: 'article',
    full: 1,
    publish: publish ? 1 : 0,
    url: d.url.trim(),
    title: d.title.trim() || d.url.trim(),
    tags: commaList(d.tags),
    facilities: lines(d.facilities),
    staff: lines(d.staff),
    survivors: lines(d.survivors),
    content_warnings: d.warnings,
    details: Object.fromEntries(shown.filter((k) => (d.details[k] ?? '').trim()).map((k) => [k, d.details[k].trim()])),
    submitted_via: 'app',
  };
  for (const k of ['archive_url', 'site_name', 'author', 'published', 'location', 'alternate_title', 'article_type', 'summary', 'notes'] as const) {
    putIf(body, k, d[k]);
  }
  return body;
}

/** The body of POST extension/submit for a lawsuit. */
export function buildLawsuitSubmitBody(d: LawsuitDraft, publish: boolean): Json {
  const body: Json = {
    type: 'lawsuit',
    full: 1,
    publish: publish ? 1 : 0,
    url: d.url.trim(),
    title: d.case_name.trim() || d.url.trim(),
    plaintiffs: lines(d.plaintiffs),
    defendants: lines(d.defendants),
    facilities_mentioned: lines(d.facilities_mentioned),
    staff_mentioned: lines(d.staff_mentioned),
    organizations_mentioned: lines(d.organizations_mentioned),
    claims: lines(d.claims),
    tags: commaList(d.tags),
    document_urls: [],
    submitted_via: 'app',
  };
  for (const k of ['case_name', 'case_number', 'court', 'jurisdiction', 'filing_date', 'status', 'outcome', 'settlement_amount', 'summary', 'notes'] as const) {
    putIf(body, k, d[k]);
  }
  return body;
}

/** The plain-words message for a failed processor request. */
export function processorErrorMessage(kind: ProcessorKind, status: number, body: Json): string {
  const text = typeof body.message === 'string' ? body.message : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const name = kind === 'news' ? 'News Processor' : 'Lawsuit Processor';
  if (status === 401) return 'WordPress rejected the login. Sign in again under Volunteer sign-in.';
  if (status === 403 && code === 'rest_forbidden') return 'Signed in, but this account is not allowed to add records.';
  if (status === 403 && !code) return "The site's firewall blocked the request (403).";
  if (status === 404) return `The site does not have the ${name} yet. It needs the latest site update.`;
  if (status === 429) return text || 'Too many requests just now. Wait a few minutes and try again.';
  return text || `The site answered ${status}. Try again in a moment.`;
}

/* ---------- requests ---------- */

const spec = (path: string, creds: Credentials, method: 'GET' | 'POST', body?: Json): RequestSpec => ({
  url: `${API_BASE}/extension${path}`,
  method,
  headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...basicHeaders(creds) },
  body: body ? JSON.stringify(body) : undefined,
});

async function call(kind: ProcessorKind, s: RequestSpec, fetchImpl: typeof fetch): Promise<Json> {
  const res = await send(s, fetchImpl);
  if ('network' in res) throw new Error(res.network);
  if (!res.ok) throw Object.assign(new Error(processorErrorMessage(kind, res.status, res.body)), { status: res.status });
  return res.body;
}

const options = (v: unknown): Option[] =>
  Array.isArray(v) ? (v as Json[]).map((o) => ({ value: str(o.value), label: str(o.label) || str(o.value) })).filter((o) => o.value) : [];

export async function fetchNewsForm(creds: Credentials, fetchImpl: typeof fetch = fetch): Promise<NewsForm> {
  const b = await call('news', spec('/news-form', creds, 'GET'), fetchImpl);
  const details: NewsForm['details'] = {};
  if (b.details && typeof b.details === 'object') {
    for (const [type, fields] of Object.entries(b.details as Json)) {
      if (fields && typeof fields === 'object') {
        details[type] = Object.fromEntries(Object.entries(fields as Json).map(([k, v]) => [k, str(v) || k] as [string, string]));
      }
    }
  }
  return { types: options(b.types), warnings: strList(b.warnings), details, can_publish: !!b.can_publish, user: str(b.user) };
}

export async function fetchLawsuitForm(creds: Credentials, fetchImpl: typeof fetch = fetch): Promise<LawsuitForm> {
  const b = await call('lawsuit', spec('/lawsuit-form', creds, 'GET'), fetchImpl);
  return { statuses: options(b.statuses), can_publish: !!b.can_publish, user: str(b.user) };
}

export async function processArticle(creds: Credentials, input: ProcessInput, fetchImpl: typeof fetch = fetch): Promise<NewsFields> {
  const b = await call('news', spec('/process', creds, 'POST', { ...input }), fetchImpl);
  return readNewsFields((b.fields ?? {}) as Json);
}

export async function processLawsuit(creds: Credentials, input: ProcessInput, fetchImpl: typeof fetch = fetch): Promise<LawsuitFields> {
  const b = await call('lawsuit', spec('/lawsuit-process', creds, 'POST', { ...input }), fetchImpl);
  return readLawsuitFields((b.fields ?? {}) as Json);
}

export async function findArchive(creds: Credentials, url: string, fetchImpl: typeof fetch = fetch): Promise<ArchiveResult> {
  const b = await call('news', spec(`/archive?${new URLSearchParams({ url })}`, creds, 'GET'), fetchImpl);
  return { archive_url: str(b.archive_url), timestamp: str(b.timestamp), save_url: str(b.save_url) };
}

/** "Wayback Machine copy from 2023-09-26." from a 14-digit timestamp. */
export function describeArchive(a: ArchiveResult): string {
  if (!a.archive_url) return 'No Wayback Machine copy yet.';
  const t = a.timestamp;
  return /^\d{8}/.test(t) ? `Wayback Machine copy from ${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}.` : 'Wayback Machine copy found.';
}

export async function submitProcessed(
  kind: ProcessorKind,
  body: Json,
  creds: Credentials,
  fetchImpl: typeof fetch = fetch,
): Promise<ProcessorOutcome> {
  const res = await send(spec('/submit', creds, 'POST', body), fetchImpl);
  if ('network' in res) return { kind: 'error', message: res.network };
  if (res.status === 409 || res.body.code === 'kop_duplicate') {
    return { kind: 'duplicate', message: describeDuplicates(duplicatesOf(res.body)) };
  }
  if (!res.ok) return { kind: 'error', message: processorErrorMessage(kind, res.status, res.body) };
  return {
    kind: 'ok',
    published: !!res.body.published,
    queue: typeof res.body.queue === 'string' && res.body.queue ? res.body.queue : 'the review queue',
  };
}

/* ---------- hooks ---------- */

const retry = (count: number, e: unknown) => count < 1 && !(e as { status?: number }).status;

export function useNewsForm(creds: Credentials | null) {
  return useQuery({
    queryKey: ['news-form', creds?.username ?? ''],
    queryFn: () => fetchNewsForm(creds as Credentials),
    enabled: !!creds,
    staleTime: 10 * 60 * 1000,
    retry,
  });
}

export function useLawsuitForm(creds: Credentials | null) {
  return useQuery({
    queryKey: ['lawsuit-form', creds?.username ?? ''],
    queryFn: () => fetchLawsuitForm(creds as Credentials),
    enabled: !!creds,
    staleTime: 10 * 60 * 1000,
    retry,
  });
}
