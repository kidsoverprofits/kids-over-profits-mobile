import { SITE } from '@/api/client';
import type { Credentials } from '@/api/types';

/**
 * Sign-in through WordPress's own "Authorize Application" page (wp-admin/authorize-application.php): the
 * reviewer logs in to the site in the browser as usual and taps Approve; WordPress makes an application
 * password for this app and sends it back to `redirect` as ?site_url=&user_login=&password=. It stays valid
 * until it is revoked under Users, Profile, so the app stays signed in.
 */
export const APP_NAME = 'Kids Over Profits app';
/** Fixed, so WordPress lists every phone's password under the same app. */
export const APP_ID = '6f1c2b8e-4d3a-4e5f-9a7b-2c8d1e0f3a54';

export function authorizeUrl(redirect: string, device = ''): string {
  const q = new URLSearchParams({
    app_name: device ? `${APP_NAME} (${device})` : APP_NAME,
    app_id: APP_ID,
    success_url: redirect,
    reject_url: `${redirect}${redirect.includes('?') ? '&' : '?'}rejected=1`,
  });
  return `${SITE}/wp-admin/authorize-application.php?${q}`;
}

export type AuthorizeResult = { kind: 'ok'; creds: Credentials } | { kind: 'rejected' } | { kind: 'none' };

/** Reads WordPress's answer from the address it sent back to (or from a route's params). */
export function readAuthorizeResult(params: Record<string, string | string[] | undefined>): AuthorizeResult {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? '';
  };
  if (one('rejected') || one('success') === 'false') return { kind: 'rejected' };
  const username = one('user_login').trim();
  const appPassword = one('password').replace(/\s+/g, '');
  return username && appPassword ? { kind: 'ok', creds: { username, appPassword } } : { kind: 'none' };
}

/** Parsed by hand: React Native's URL has no searchParams for custom schemes like kidsoverprofits://. */
export function readAuthorizeUrl(raw: string): AuthorizeResult {
  const query = raw.split('#')[0].split('?').slice(1).join('?');
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [k, ...v] = pair.split('=');
    try {
      params[decodeURIComponent(k)] = decodeURIComponent(v.join('=').replace(/\+/g, ' '));
    } catch {
      // a broken pair is skipped
    }
  }
  return readAuthorizeResult(params);
}
