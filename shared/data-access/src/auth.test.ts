import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPasswordReset, requestPasswordReset, resetPassword } from './auth';
import type { ApiError } from './client';

// Runs the client as it runs in the browser.
vi.mock('solid-js/web', () => ({ isServer: false, getRequestEvent: () => undefined }));

const fetchMock = vi.fn<typeof fetch>();

// The path of the last request, and how it was sent.
const last = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { path: new URL(String(url)).pathname, method: init?.method, body: init?.body };
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('password reset', () => {
  it('asks for a link, checks it and sets the new password', async () => {
    await requestPasswordReset({ login: 'ada' });
    expect(last()).toMatchObject({
      path: '/api/v1/auth/password-reset',
      method: 'POST',
      body: '{"login":"ada"}',
    });

    fetchMock.mockResolvedValueOnce(new Response('{"username":"ada"}'));
    expect(await checkPasswordReset({ code: 'c' })).toEqual({ username: 'ada' });
    expect(last().path).toBe('/api/v1/auth/password-reset/check');

    await resetPassword({ code: 'c', password: 'correct horse' });
    expect(last()).toMatchObject({
      path: '/api/v1/auth/password-reset/confirm',
      body: '{"code":"c","password":"correct horse"}',
    });
  });

  it('never refreshes: a 401 is a bad link, not an expired session', async () => {
    fetchMock.mockResolvedValue(new Response('{"code":"INVALID_CODE"}', { status: 401 }));

    await expect(checkPasswordReset({ code: 'c' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CODE',
    } satisfies Partial<ApiError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
