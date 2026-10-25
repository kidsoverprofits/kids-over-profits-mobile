import { fetchAdminTools } from '@/api/admin';
import { testCredentials } from '@/api/submit';
import type { Credentials } from '@/api/types';
import { saveCredentials } from '@/lib/credentials';

export type SignInResult = { ok: true; user: string; admin: boolean } | { ok: false; message: string };

/**
 * Checks a login with the site, keeps it in secure storage, and asks whether it is an administrator's
 * (which notes it for the Admin tab). Used by both the pasted application password and WordPress's
 * Authorize Application answer.
 */
export async function signInWith(creds: Credentials): Promise<SignInResult> {
  const r = await testCredentials(creds);
  if (!r.ok) return r;
  if (!(await saveCredentials(creds))) {
    return { ok: false, message: 'This device could not store the login securely, so it was not saved.' };
  }
  let admin = false;
  try {
    admin = (await fetchAdminTools(creds)).tools.length > 0;
  } catch {
    // a reviewer who is not an administrator, or the site is slow: the Admin tab waits for the next try
  }
  return { ok: true, user: r.user, admin };
}
