import { getRequestEvent, isServer } from 'solid-js/web';

/**
 * An RFC 9457 Problem Details body with ari-api's stable `code`. Written by hand because ari-api's
 * OpenAPI declares its error responses as MeResponse; generate it once ari-api declares them.
 */
export type Problem = {
  status?: number;
  title?: string;
  detail?: string;
  /** e.g. INVALID_CREDENTIALS, EMAIL_TAKEN, VALIDATION_FAILED. */
  code?: string;
  /** VALIDATION_FAILED: one entry per invalid field. */
  errors?: { field: string; message: string }[];
};

/** A failed request: any non-2xx response, or status 0 when ari-api couldn't be reached. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem = {},
  ) {
    super(
      problem.detail ?? (status ? `ari-api answered ${status}` : 'ari-api could not be reached'),
    );
    this.name = 'ApiError';
  }

  get code() {
    return this.problem.code;
  }
}

/** ari-api's origin: API_URL on the server (read at runtime), VITE_API_URL in the browser. */
function apiUrl() {
  return (isServer ? process.env.API_URL : import.meta.env.VITE_API_URL) ?? 'http://localhost:8080';
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** false for endpoints whose 401 isn't an expired session, like a login with a wrong password. */
  refresh?: boolean;
};

async function send(path: string, options: RequestOptions) {
  const headers = new Headers();
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  if (isServer) {
    // The browser's cookies, with the tokens the middleware refreshed when ari_access was gone.
    // SolidStart's server events carry `locals`; solid-js's own types leave it out.
    const event = getRequestEvent() as
      | { request: Request; locals: { cookie?: string } }
      | undefined;
    const cookie = event?.locals.cookie ?? event?.request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
  }
  try {
    return await fetch(`${apiUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0);
  }
}

async function readProblem(response: Response): Promise<Problem> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

// One refresh at a time: every 401 that arrives while it runs waits for the same one.
let refreshing: Promise<boolean> | undefined;

function refresh() {
  refreshing ??= send('/api/v1/auth/refresh', { method: 'POST' })
    .then(
      (response) => response.ok,
      () => false,
    )
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

/**
 * Calls ari-api with the cookies and returns the JSON body. In the browser, a 401 refreshes the
 * session once and retries; when the refresh fails too, it goes to /login. On the server the
 * middleware has refreshed already, so a 401 is thrown.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);
  if (response.status === 401 && options.refresh !== false && !isServer) {
    if (!(await refresh())) {
      window.location.assign('/login');
      throw new ApiError(401, await readProblem(response));
    }
    response = await send(path, options);
  }
  if (!response.ok) throw new ApiError(response.status, await readProblem(response));
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/**
 * For the server's middleware: refreshes the session of a request that still has ari_refresh but
 * no ari_access. Returns ari-api's Set-Cookie headers, or undefined when the refresh failed.
 */
export async function refreshSession(cookie: string) {
  const response = await fetch(`${apiUrl()}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { cookie },
  }).catch(() => undefined);
  return response?.ok ? response.headers.getSetCookie() : undefined;
}
