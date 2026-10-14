import type { ExtensionCodeResponse, ExtensionTokensResponse, MeResponse } from '@ari/types';
import { storage } from 'wxt/utils/storage';

// The extension's own session with ari-api (F13). It starts from a one-time code: one the website
// hands over for the account signed in there, which the extension then follows, or one an
// account's password gets in the popup, which it keeps. It lasts until someone logs out (on the
// website too while it follows it): each refresh gives it 30 more days. Only the background calls
// these; the popup, the pages and the welcome tab read the items.

const apiOrigin = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/** Who is signed in, for the popup and the pages; null while signed out. */
export type Account = Pick<MeResponse, 'id' | 'username' | 'fullName' | 'email' | 'photoUrl'>;

export const account = storage.defineItem<Account | null>('local:account', { fallback: null });

/** ari-api refused to refresh the session: `account` stays, so the popup can say whose ended. */
export const expired = storage.defineItem<boolean>('local:expired', { fallback: false });

type Tokens = { accessToken: string; refreshToken: string };

const tokens = storage.defineItem<Tokens | null>('local:tokens', { fallback: null });

/**
 * Whether the extension uses the website's account, and so follows it to another account or out;
 * false for an account signed in with its password in the popup.
 */
export const followsWebsite = storage.defineItem<boolean>('local:followsWebsite', {
  fallback: false,
});

/**
 * Set by the extension's own Sign out: the website's codes no longer sign it in, and only an
 * account's password in the popup (Continue as, Add an account) does, which clears it.
 */
export const loggedOut = storage.defineItem<boolean>('local:loggedOut', { fallback: false });

/** Who is signed in on the website, as its last page said; null once it logs out. */
export const websiteAccount = storage.defineItem<Account | null>('local:websiteAccount', {
  fallback: null,
});

/** The website account the user chose to Keep the extension's own account beside. */
export const keptBeside = storage.defineItem<string | null>('local:keptBeside', {
  fallback: null,
});

/** The accounts the extension has used, newest first, for the popup's account switcher. */
export const knownAccounts = storage.defineItem<Account[]>('local:knownAccounts', {
  fallback: [],
});

/** Set by the welcome tab's Not you?, which opens the popup: it opens on Add an account. */
export const addAccountNext = storage.defineItem<boolean>('session:addAccountNext', {
  fallback: false,
});

const remembered = 5;

/** Signs in with the website's code, then reads who that is. False when the code didn't work. */
export async function connect(code: string, follow: boolean) {
  const response = await call('/api/v1/auth/extension/token', { method: 'POST', body: { code } });
  const pair = response.ok ? toTokens(await response.json()) : undefined;
  if (!pair) return false;
  // Who it is comes with the tokens, so nothing sees the new session under the old account.
  const me = await call('/api/v1/me', { token: pair.accessToken });
  if (!me.ok) return false;
  const signedIn = toAccount(await me.json());
  const before = await tokens.getValue();
  await storage.setItems([
    { item: tokens, value: pair },
    { item: account, value: signedIn },
    { item: followsWebsite, value: follow },
    { item: expired, value: false },
    { item: loggedOut, value: false },
    { item: knownAccounts, value: withAccount(await knownAccounts.getValue(), signedIn) },
  ]);
  // Signed in as somebody else before: that session ends.
  if (before) void endSession(before);
  return true;
}

/**
 * Signs in with an account's username and password, as the popup's Add an account and account
 * switcher do; the website's cookies stay as they are. The extension follows the website when it
 * is the website's account. Wrong credentials leave the extension as it was.
 */
export async function signInWithPassword(login: { username: string; password: string }) {
  const response = await call('/api/v1/auth/extension/code', { method: 'POST', body: login });
  if (response.status === 401) return 'wrong-password';
  const { code }: ExtensionCodeResponse = response.ok ? await response.json() : {};
  if (!code) return 'failed';
  const website = await websiteAccount.getValue();
  const follow = website?.username?.toLowerCase() === login.username.toLowerCase();
  return (await connect(code, follow)) ? 'signed-in' : 'failed';
}

export type PasswordSignIn = Awaited<ReturnType<typeof signInWithPassword>>;

/** Reads the signed-in user again (their photo link is signed for an hour). */
export async function loadAccount() {
  const response = await apiRequest('/api/v1/me');
  if (!response?.ok) return false;
  const me = toAccount(await response.json());
  await storage.setItems([
    { item: account, value: me },
    { item: knownAccounts, value: withAccount(await knownAccounts.getValue(), me) },
  ]);
  return true;
}

/**
 * Ends the extension's session; the website's own session stays. The user's own Sign out also
 * forgets the accounts it used, and from then on asks for a password to sign in again.
 */
export async function signOut(byUser: boolean) {
  const current = await tokens.getValue();
  await storage.setItems([
    { item: tokens, value: null },
    { item: account, value: null },
    { item: followsWebsite, value: false },
    { item: expired, value: false },
    ...(byUser
      ? [
          { item: loggedOut, value: true },
          { item: knownAccounts, value: [] },
        ]
      : []),
  ]);
  if (current) await endSession(current);
}

/**
 * Calls ari-api as the signed-in user. A 401 refreshes the tokens once; undefined when signed out
 * or once the session has ended, which leaves it expired.
 */
export async function apiRequest(path: string, options: { method?: string; body?: unknown } = {}) {
  const current = await tokens.getValue();
  if (!current) return undefined;
  const response = await call(path, { ...options, token: current.accessToken });
  if (response.status !== 401) return response;
  const next = await refresh(current);
  if (!next) return undefined;
  const retried = await call(path, { ...options, token: next.accessToken });
  if (retried.status === 401) await expire();
  return retried.status === 401 ? undefined : retried;
}

// One refresh at a time: every 401 that arrives while it runs waits for the same one.
let refreshing: Promise<Tokens | null> | undefined;

function refresh(used: Tokens) {
  refreshing ??= (async () => {
    // Another call refreshed already: its tokens are the ones to use.
    const stored = await tokens.getValue();
    if (stored && stored.refreshToken !== used.refreshToken) return stored;
    const response = await call('/api/v1/auth/extension/refresh', {
      method: 'POST',
      body: { refreshToken: used.refreshToken },
    });
    const pair = response.ok ? toTokens(await response.json()) : undefined;
    if (pair) await tokens.setValue(pair);
    else if (response.status === 401) await expire();
    return pair ?? null;
  })().finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}

function call(path: string, options: { method?: string; body?: unknown; token?: string }) {
  const headers = new Headers();
  // A FormData body sets its own multipart type.
  const json = options.body !== undefined && !(options.body instanceof FormData);
  if (json) headers.set('content-type', 'application/json');
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  return fetch(`${apiOrigin}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: json ? JSON.stringify(options.body) : (options.body as FormData | undefined),
    // Never the website's cookies: ari-api reads its session before the Bearer token.
    credentials: 'omit',
  });
}

function endSession(ended: Tokens) {
  return call('/api/v1/auth/extension/logout', {
    method: 'POST',
    body: { refreshToken: ended.refreshToken },
  }).catch(() => undefined);
}

/** The session is over, but whose it was stays for the popup's "Session expired". */
async function expire() {
  await storage.setItems([
    { item: tokens, value: null },
    { item: expired, value: true },
  ]);
}

function toTokens(body: ExtensionTokensResponse): Tokens | undefined {
  return body.accessToken && body.refreshToken
    ? { accessToken: body.accessToken, refreshToken: body.refreshToken }
    : undefined;
}

function toAccount(me: MeResponse): Account {
  return {
    id: me.id,
    username: me.username,
    fullName: me.fullName,
    email: me.email,
    photoUrl: me.photoUrl,
  };
}

/** The accounts used, with `latest` first. */
function withAccount(accounts: Account[], latest: Account) {
  return [latest, ...accounts.filter((other) => other.id !== latest.id)].slice(0, remembered);
}
