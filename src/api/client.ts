/** The site and its REST base. Every request is a public GET; the app has no login and no tracking. */
export const SITE = 'https://kidsoverprofits.org';
export const API_BASE = `${SITE}/wp-json/kop/v1`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const TIMEOUT_MS = 20000;

export function buildUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
  const url = new URL(`${API_BASE}/${path.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function fetchJson<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    // 'no-store': every read goes to the live site, never the phone's HTTP cache (the site's answers say max-age=600);
    // React Query keeps the screens' own copies, and a pull to refresh or a return to the app reads them again.
    const res = await fetch(buildUrl(path, params), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) {
      let message = res.status === 404 ? 'Not found.' : `The site answered ${res.status}.`;
      try {
        const body = await res.json();
        if (body && typeof body.message === 'string') message = body.message;
      } catch {
        // keep the generic message
      }
      throw new ApiError(message, res.status);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError('The request took too long. Check your connection and try again.', 0);
    throw new ApiError('Could not reach kidsoverprofits.org. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timer);
  }
}
