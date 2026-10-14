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
  /** Sent as JSON; FormData (a file upload) goes as multipart with its own content type. */
  body?: unknown;
  /** false for endpoints whose 401 isn't an expired session, like a login with a wrong password. */
  refresh?: boolean;
};

async function send(path: string, options: RequestOptions) {
  const headers = new Headers();
  const body =
    options.body instanceof FormData || options.body === undefined
      ? options.body
      : JSON.stringify(options.body);
  if (typeof body === 'string') headers.set('content-type', 'application/json');
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
      body,
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
 * Whether the access token has a minute left: ari-api sets `ari_access_fresh` beside the sign-in
 * cookies, readable here and holding no token, and it goes a minute before `ari_access`.
 */
const accessFresh = () =>
  typeof document !== 'undefined' && /(?:^|;\s*)ari_access_fresh=/.test(document.cookie);

/**
 * Sends a file (multipart) from the browser with the cookies and returns the JSON body, telling
 * `onProgress` how much has gone (0 to 1) on the way; fetch can't, so this uses XMLHttpRequest.
 * The session is refreshed first when its access token is about to go, so the file isn't sent
 * just to get a 401 and go again. Errors, and a 401 all the same, go as in `request`.
 */
export async function upload<T>(
  path: string,
  body: FormData,
  onProgress?: (sent: number) => void,
): Promise<T> {
  if (!accessFresh() && !(await refresh())) {
    window.location.assign('/login');
    throw new ApiError(401);
  }
  let response = await sendWithProgress(path, body, onProgress);
  if (response.status === 401) {
    if (!(await refresh())) {
      window.location.assign('/login');
      throw new ApiError(401, parse(response.text) ?? {});
    }
    response = await sendWithProgress(path, body, onProgress);
  }
  const answer = parse(response.text);
  if (response.status < 200 || response.status >= 300) {
    throw new ApiError(response.status, (answer as Problem | undefined) ?? {});
  }
  return answer as T;
}

function sendWithProgress(path: string, body: FormData, onProgress?: (sent: number) => void) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiUrl()}${path}`);
    xhr.withCredentials = true;
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });
    xhr.addEventListener('load', () => resolve({ status: xhr.status, text: xhr.responseText }));
    xhr.addEventListener('error', () => reject(new ApiError(0)));
    xhr.send(body);
  });
}

function parse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
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

/** "?type=CLIP&tag=a&tag=b": arrays repeat their name, and empty values are left out. */
export function searchOf(query: Record<string, string | number | string[] | undefined>) {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== '') search.append(name, String(item));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
