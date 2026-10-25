import { API_BASE } from './client';
import type {
  Credentials,
  DuplicateCheck,
  DuplicateInfo,
  FacilityType,
  LinkType,
  SubmitDraft,
  SubmitOutcome,
  SubmitType,
} from './types';

/**
 * Send to KOP. Everyone uses the public route (kop/v1/mobile/*, no account). A signed-in reviewer's links go to
 * kop/v1/extension/*, the same routes as the Chrome extension, with HTTP Basic auth (WordPress username and an
 * application password). Facility information always goes to the public route.
 */
const TIMEOUT_MS = 20000;

export const LINK_TYPES: LinkType[] = ['article', 'lawsuit', 'legislation', 'website'];
export const isLinkType = (t: SubmitType): t is LinkType => (LINK_TYPES as string[]).includes(t);
export const isFacilityType = (t: SubmitType): t is FacilityType => t === 'facility_new' || t === 'facility_correction';

export function emptyDraft(type: SubmitType = 'article'): SubmitDraft {
  return {
    type, url: '', title: '', site_name: '', author: '', published: '',
    case_number: '', court: '', bill_number: '', jurisdiction: '', session: '',
    facility: '', facility_id: null, notes: '', selection: '',
    submitter_name: '', notify_email: '', newsletter_email: '',
    name: '', other_names: [], city: '', state: '', country: '', operator: '',
    start_year: '', end_year: '', website: '', program_type: '',
  };
}

type Values = Record<string, string | number | string[]>;
type Draft = SubmitDraft;

function pick(draft: Draft, keys: (keyof Draft)[]): Values {
  const out: Values = {};
  for (const k of keys) {
    const v = draft[k];
    if (typeof v === 'string') {
      if (v.trim()) out[k] = v.trim();
    } else if (typeof v === 'number') {
      out[k] = v;
    } else if (Array.isArray(v)) {
      const list = v.map((x) => x.trim()).filter(Boolean);
      if (list.length) out[k] = list;
    }
  }
  return out;
}

const TYPE_KEYS: Record<LinkType, (keyof Draft)[]> = {
  article: ['title', 'site_name', 'author', 'published'],
  website: ['title', 'site_name', 'author', 'published'],
  lawsuit: ['title', 'case_number', 'court'],
  legislation: ['title', 'bill_number', 'jurisdiction', 'session'],
};

/** The body for the public route. Only the keys that belong to the type are sent, and empty ones are left out. */
export function buildPublicBody(draft: Draft, appVersion = ''): Record<string, unknown> {
  const body: Record<string, unknown> = { type: draft.type };
  if (isLinkType(draft.type)) {
    Object.assign(body, { url: draft.url.trim() }, pick(draft, [...TYPE_KEYS[draft.type], 'facility', 'facility_id', 'selection']));
  } else if (draft.type === 'facility_new') {
    Object.assign(
      body,
      pick(draft, ['name', 'other_names', 'city', 'state', 'country', 'operator', 'start_year', 'end_year', 'website', 'program_type', 'url']),
    );
  } else {
    Object.assign(body, pick(draft, ['facility_id', 'facility', 'url']));
  }
  Object.assign(body, pick(draft, ['notes', 'submitter_name', 'notify_email', 'newsletter_email']));
  body.website_hp = '';
  body.app_version = appVersion;
  return body;
}

/** The body for the reviewer route: the Chrome extension's keys. */
export function buildReviewerBody(draft: Draft): Record<string, unknown> {
  if (!isLinkType(draft.type)) throw new Error('Facility information does not go through the reviewer route.');
  return {
    type: draft.type,
    url: draft.url.trim(),
    title: draft.title.trim() || draft.url.trim(),
    ...pick(draft, [...TYPE_KEYS[draft.type].filter((k) => k !== 'title'), 'facility', 'notes', 'selection']),
    submitted_via: 'app',
  };
}

export type RequestSpec = { url: string; method: 'GET' | 'POST'; headers: Record<string, string>; body?: string };

/** HTTP Basic, sent in both headers because some hosts drop Authorization before PHP sees it. */
export function basicHeaders(creds: Credentials): Record<string, string> {
  const raw = `${creds.username}:${creds.appPassword.replace(/\s+/g, '')}`;
  // Basic auth is UTF-8 bytes in base64; btoa alone only takes Latin-1.
  const bytes = encodeURIComponent(raw).replace(/%([0-9A-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  const auth = `Basic ${btoa(bytes)}`;
  return { Authorization: auth, 'X-KOP-Authorization': auth };
}

/** True when this draft goes to the reviewer route. */
export const usesReviewerRoute = (draft: Draft, creds: Credentials | null) => !!creds && isLinkType(draft.type);

export function buildSubmitRequest(draft: Draft, creds: Credentials | null, appVersion = ''): RequestSpec {
  const reviewer = usesReviewerRoute(draft, creds);
  return {
    url: `${API_BASE}/${reviewer ? 'extension' : 'mobile'}/submit`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(reviewer && creds ? basicHeaders(creds) : {}),
    },
    body: JSON.stringify(reviewer ? buildReviewerBody(draft) : buildPublicBody(draft, appVersion)),
  };
}

export function buildCheckRequest(
  draft: Pick<Draft, 'type' | 'url' | 'title' | 'site_name' | 'bill_number' | 'jurisdiction'>,
  creds: Credentials | null,
): RequestSpec {
  const reviewer = !!creds && isLinkType(draft.type);
  const q = new URLSearchParams();
  const keys = reviewer ? ['url', 'title', 'site_name', 'type', 'bill_number', 'jurisdiction'] : ['url', 'title', 'type'];
  for (const k of keys) {
    const v = String(draft[k as keyof typeof draft] ?? '').trim();
    if (v) q.set(k, v);
  }
  return {
    url: `${API_BASE}/${reviewer ? 'extension' : 'mobile'}/check?${q}`,
    method: 'GET',
    headers: { Accept: 'application/json', ...(reviewer && creds ? basicHeaders(creds) : {}) },
  };
}

type Json = Record<string, unknown>;

export async function send(spec: RequestSpec, fetchImpl: typeof fetch): Promise<{ status: number; ok: boolean; body: Json } | { network: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // No cookies: on Android these requests share the admin web view's cookie jar, and WordPress ignores the
    // application password when a login cookie comes with it (no nonce), so the route answers 401.
    const res = await fetchImpl(spec.url, {
      method: spec.method,
      headers: spec.headers,
      body: spec.body,
      credentials: 'omit',
      signal: controller.signal,
    });
    let body: Json = {};
    try {
      body = (await res.json()) as Json;
    } catch {
      // an error page that is not JSON
    }
    return { status: res.status, ok: res.ok, body };
  } catch (e) {
    return {
      network:
        (e as Error).name === 'AbortError'
          ? 'The request took too long. Check your connection and try again.'
          : 'Could not reach kidsoverprofits.org. Check your connection and try again.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function duplicatesOf(body: Json): DuplicateInfo[] {
  const list = Array.isArray(body.duplicates) ? (body.duplicates as Json[]) : [];
  return list.map((d) => ({
    type: String(d.type ?? ''),
    status: String(d.status ?? ''),
    id: typeof d.id === 'number' ? d.id : undefined,
    title: typeof d.title === 'string' ? d.title : undefined,
  }));
}

function errorMessage(status: number, body: Json, reviewer: boolean): string {
  const text = typeof body.message === 'string' ? body.message : '';
  const code = typeof body.code === 'string' ? body.code : '';
  if (reviewer) {
    if (status === 401) return 'WordPress rejected the login. Check the username and application password under About.';
    if (status === 403 && code === 'rest_forbidden') return 'Signed in, but this account is not allowed to add records.';
    if (status === 403 && !code) return "The site's firewall blocked the request (403).";
    if (status === 404 && code === 'rest_no_route') return 'Signed in, but the site does not have this endpoint yet.';
  }
  if (status === 429 || code === 'kop_rate_limited') return text || 'Too many submissions just now. Wait a few minutes and try again.';
  return text || `The site answered ${status}. Try again in a moment.`;
}

/** "Already on the site" or "Already in review", from the first duplicate. */
export function describeDuplicates(duplicates: DuplicateInfo[]): string {
  const first = duplicates[0];
  if (!first) return 'This is already on file.';
  const names: Record<string, string> = { news: 'article', article: 'article', lawsuit: 'lawsuit', legislation: 'bill', website: 'website' };
  const what = names[first.type] ?? 'item';
  if (/review/i.test(first.status)) return `Already on file: this ${what} is in review.`;
  if (/site/i.test(first.status)) return `Already on file: this ${what} is on the site.`;
  return first.status ? `Already on file (${first.status}).` : `Already on file as a ${what}.`;
}

export async function submitDraft(
  draft: Draft,
  creds: Credentials | null,
  appVersion = '',
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitOutcome> {
  const reviewer = usesReviewerRoute(draft, creds);
  const res = await send(buildSubmitRequest(draft, creds, appVersion), fetchImpl);
  if ('network' in res) return { kind: 'error', message: res.network };
  if (res.status === 409 || res.body.code === 'kop_duplicate') {
    const duplicates = duplicatesOf(res.body);
    return { kind: 'duplicate', message: describeDuplicates(duplicates), duplicates };
  }
  if (!res.ok) return { kind: 'error', message: errorMessage(res.status, res.body, reviewer) };
  return { kind: 'ok', queue: typeof res.body.queue === 'string' && res.body.queue ? res.body.queue : 'review' };
}

export async function checkDuplicate(
  draft: Pick<Draft, 'type' | 'url' | 'title' | 'site_name' | 'bill_number' | 'jurisdiction'>,
  creds: Credentials | null,
  fetchImpl: typeof fetch = fetch,
): Promise<DuplicateCheck> {
  const res = await send(buildCheckRequest(draft, creds), fetchImpl);
  if ('network' in res || !res.ok) return { duplicate: false, duplicates: [] };
  const duplicates = duplicatesOf(res.body);
  return { duplicate: !!res.body.duplicate || duplicates.length > 0, duplicates };
}

/** Sign-in test: asks the reviewer route about the site's own home page and names the account that answered. */
export async function testCredentials(
  creds: Credentials,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; user: string } | { ok: false; message: string }> {
  const spec: RequestSpec = {
    url: `${API_BASE}/extension/check?${new URLSearchParams({ url: 'https://kidsoverprofits.org/' })}`,
    method: 'GET',
    headers: { Accept: 'application/json', ...basicHeaders(creds) },
  };
  const res = await send(spec, fetchImpl);
  if ('network' in res) return { ok: false, message: res.network };
  if (!res.ok) return { ok: false, message: errorMessage(res.status, res.body, true) };
  const u = res.body.user;
  const name =
    typeof u === 'string'
      ? u
      : u && typeof u === 'object'
        ? String((u as Json).display_name ?? (u as Json).name ?? (u as Json).user_login ?? (u as Json).login ?? '')
        : '';
  return { ok: true, user: name || creds.username };
}
