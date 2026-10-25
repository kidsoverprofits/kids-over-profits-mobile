import AsyncStorage from '@react-native-async-storage/async-storage';

import { SITE } from '@/api/client';

/**
 * Admin mode's WordPress session lives in the web view's own cookies (a "remember me" cookie the site sets
 * for a year). The app only notes when it made one, so a tool opens straight away instead of asking the site
 * for a new session each time. A wrong note costs nothing: WordPress's login page starts a new session.
 */
const KEY = 'kop_admin_session_until';
const DAYS = 360;

export async function hasAdminSession(now = Date.now()): Promise<boolean> {
  try {
    return Number(await AsyncStorage.getItem(KEY)) > now;
  } catch {
    return false;
  }
}

export async function markAdminSession(now = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(now + DAYS * 86400000));
  } catch {
    // the next tool asks for a session again
  }
}

export async function clearAdminSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
}

/**
 * The username the site last confirmed as an administrator's, so the Admin tab shows at once (and offline)
 * instead of waiting for the tools list; cleared when the site rejects the login or on sign-out.
 */
const ADMIN_KEY = 'kop_admin_user';

export async function rememberedAdmin(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(ADMIN_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function rememberAdmin(username: string | null): Promise<void> {
  try {
    if (username) await AsyncStorage.setItem(ADMIN_KEY, username);
    else await AsyncStorage.removeItem(ADMIN_KEY);
  } catch {
    // the tab waits for the tools list instead
  }
}

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, '');

/** True for any page of kidsoverprofits.org (www or not), which stays in the admin web view. */
export function isSiteUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') && bareHost(u.host) === bareHost(new URL(SITE).host);
  } catch {
    return false;
  }
}

/**
 * Where WordPress's login page wants to go next ("redirect_to"), when the page is the plain login form the
 * app should answer for the admin; null for any other page, and for logging out or the "logged out" page
 * (signing out on purpose is never undone by the app).
 */
export function loginRedirect(raw: string): string | null {
  if (!isSiteUrl(raw)) return null;
  const u = new URL(raw);
  if (!/\/wp-login\.php$/.test(u.pathname)) return null;
  if (u.searchParams.has('action') || u.searchParams.has('loggedout')) return null;
  return u.searchParams.get('redirect_to') || `${SITE}/wp-admin/`;
}
