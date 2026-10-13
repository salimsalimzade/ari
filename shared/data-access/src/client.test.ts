import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkUsername, login, verifyEmail } from './auth';
import { ApiError, request } from './client';
import { changeEmail, changePhoto } from './users';

// Runs the client as it runs in the browser.
vi.mock('solid-js/web', () => ({ isServer: false, getRequestEvent: () => undefined }));

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn();

// The paths of every request sent, in order.
const sent = () => fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { location: { assign } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  assign.mockReset();
});

describe('request', () => {
  it('refreshes once on a 401 and retries', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { code: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(json(204))
      .mockResolvedValueOnce(json(200, { username: 'ada' }));

    await expect(request('/api/v1/me')).resolves.toEqual({ username: 'ada' });
    expect(sent()).toEqual(['/api/v1/me', '/api/v1/auth/refresh', '/api/v1/me']);
    expect(fetchMock.mock.calls.every(([, init]) => init?.credentials === 'include')).toBe(true);
  });

  it('shares one refresh between requests that fail together', async () => {
    let finishRefresh!: (response: Response) => void;
    fetchMock.mockImplementation(async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/v1/auth/refresh')
        return new Promise((resolve) => (finishRefresh = resolve));
      const retried = sent().filter((sentPath) => sentPath === path).length > 1;
      return retried ? json(200, { path }) : json(401);
    });

    const both = Promise.all([request('/api/v1/me'), request('/api/v1/highlights')]);
    await vi.waitFor(() => expect(sent()).toContain('/api/v1/auth/refresh'));
    finishRefresh(json(204));

    await expect(both).resolves.toEqual([{ path: '/api/v1/me' }, { path: '/api/v1/highlights' }]);
    expect(sent().filter((path) => path === '/api/v1/auth/refresh')).toHaveLength(1);
  });

  it('goes to /login when the refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(401));

    await expect(request('/api/v1/me')).rejects.toMatchObject({ status: 401 });
    expect(assign).toHaveBeenCalledWith('/login');
    expect(sent()).toEqual(['/api/v1/me', '/api/v1/auth/refresh']);
  });

  it('throws the Problem Details of other errors', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { code: 'USERNAME_TAKEN', detail: 'Taken' }));

    const error = await request('/api/v1/auth/register', { method: 'POST', body: {} }).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'USERNAME_TAKEN' });
  });

  it('throws status 0 when ari-api cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(request('/api/v1/me')).rejects.toMatchObject({ status: 0 });
  });
});

describe('login', () => {
  it('reports wrong credentials without refreshing', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { code: 'INVALID_CREDENTIALS' }));

    await expect(login({ username: 'ada', password: 'wrong' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(sent()).toEqual(['/api/v1/auth/login']);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('verifyEmail', () => {
  it('reports a bad link without refreshing or leaving the page', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { code: 'INVALID_CODE' }));

    await expect(verifyEmail({ code: 'used' })).rejects.toMatchObject({ code: 'INVALID_CODE' });
    expect(sent()).toEqual(['/api/v1/auth/verify-email']);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('changeEmail', () => {
  it('sends the address with PUT and returns the updated user', async () => {
    fetchMock.mockResolvedValueOnce(json(202, { pendingEmail: 'bee@example.com' }));

    await expect(changeEmail({ email: 'Bee@Example.com' })).resolves.toEqual({
      pendingEmail: 'bee@example.com',
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe('{"email":"Bee@Example.com"}');
  });
});

describe('changePhoto', () => {
  it('sends the photo as multipart, leaving the content type to the browser', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { photoUrl: 'http://localhost:9000/ari/a.jpg' }));

    await changePhoto(new Blob(['jpeg'], { type: 'image/jpeg' }));

    const [, init] = fetchMock.mock.calls[0];
    const body = init?.body;
    expect(init?.method).toBe('PUT');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('photo')).toBeInstanceOf(Blob);
    expect(new Headers(init?.headers).has('content-type')).toBe(false);
  });
});

describe('checkUsername', () => {
  it('asks with the username in the query string, without refreshing', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { username: 'bee.reader', available: true }));

    await expect(checkUsername('Bee.Reader')).resolves.toEqual({
      username: 'bee.reader',
      available: true,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).searchParams.get('username')).toBe('Bee.Reader');
    expect(init?.method).toBe('GET');
  });
});
