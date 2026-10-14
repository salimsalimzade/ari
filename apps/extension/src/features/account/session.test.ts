// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';
import {
  account,
  apiRequest,
  expired,
  followsWebsite,
  knownAccounts,
  loggedOut,
  signInWithPassword,
  signOut,
  websiteAccount,
} from './session';

const bea = { id: 'bea', username: 'bea', fullName: 'Bea Linden' };
const tokens = { accessToken: 'access', refreshToken: 'refresh' };

/** Stands in for ari-api: `answer` replies to each request by its method and path. */
function api(answer: (route: string) => Response) {
  const fetch = vi.fn(async (input: string, init: RequestInit = {}) =>
    answer(`${init.method ?? 'GET'} ${new URL(input).pathname}`),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(async () => {
  fakeBrowser.reset();
  vi.unstubAllGlobals();
  await storage.setItem('local:tokens', tokens);
  await account.setValue(bea);
});

describe('apiRequest', () => {
  it('leaves the session expired, keeping whose it was, when the refresh is refused', async () => {
    api(() => json(401));

    expect(await apiRequest('/api/v1/me')).toBeUndefined();

    expect(await expired.getValue()).toBe(true);
    expect(await account.getValue()).toEqual(bea);
    expect(await storage.getItem('local:tokens')).toBeNull();
  });
});

describe('signInWithPassword', () => {
  it('stays on the same account after a wrong password', async () => {
    api(() => json(401, { code: 'INVALID_CREDENTIALS' }));

    expect(await signInWithPassword({ username: 'b.linden', password: 'hollow-oak' })).toBe(
      'wrong-password',
    );
    expect(await account.getValue()).toEqual(bea);
  });

  it('signs in as the account, and follows the website when it is the website’s', async () => {
    const ada = { id: 'ada', username: 'b.linden', fullName: 'Bea Linden', email: 'b@hollow.org' };
    await websiteAccount.setValue(ada);
    api((route) => {
      if (route === 'POST /api/v1/auth/extension/code') return json(200, { code: 'c1' });
      if (route === 'POST /api/v1/auth/extension/token') return json(200, tokens);
      if (route === 'GET /api/v1/me') return json(200, ada);
      return json(204);
    });

    expect(await signInWithPassword({ username: 'B.Linden', password: 'right' })).toBe('signed-in');

    expect(await account.getValue()).toMatchObject({ id: 'ada' });
    expect(await followsWebsite.getValue()).toBe(true);
    expect((await knownAccounts.getValue()).map((known) => known.id)).toEqual(['ada']);
  });
});

describe('signOut', () => {
  it('waits for Continue as after the user’s own Log out, but not after the website’s', async () => {
    api(() => new Response(null, { status: 204 }));
    await knownAccounts.setValue([bea]);

    await signOut(false);
    expect(await loggedOut.getValue()).toBe(false);
    expect(await knownAccounts.getValue()).toEqual([bea]);

    await signOut(true);
    expect(await loggedOut.getValue()).toBe(true);
    expect(await knownAccounts.getValue()).toEqual([]);
    expect(await account.getValue()).toBeNull();
  });
});
