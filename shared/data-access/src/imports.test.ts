import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from './client';
import {
  discardImport,
  dismissImport,
  fetchImport,
  listImports,
  retryImport,
  reviewImport,
  uploadImport,
} from './imports';

// Runs the client as it runs in the browser.
vi.mock('solid-js/web', () => ({ isServer: false, getRequestEvent: () => undefined }));

const fetchMock = vi.fn<typeof fetch>();

// The path of the last request, and how it was sent.
const last = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { path: new URL(String(url)).pathname, method: init?.method, body: init?.body };
};

// An XMLHttpRequest that sends in two steps and answers with `answer`.
let answer = { status: 202, text: '{"id":"7","status":"QUEUED"}' };
const sent: { url: string; body: unknown; withCredentials: boolean }[] = [];
class FakeRequest {
  status = 0;
  responseText = '';
  withCredentials = false;
  private url = '';
  private listeners: Record<string, () => void> = {};
  upload = {
    progress: undefined as ((event: ProgressEvent) => void) | undefined,
    addEventListener: (_: string, listener: (event: ProgressEvent) => void) => {
      this.upload.progress = listener;
    },
  };
  open(_method: string, url: string) {
    this.url = url;
  }
  addEventListener(type: string, listener: () => void) {
    this.listeners[type] = listener;
  }
  send(body: unknown) {
    sent.push({ url: this.url, body, withCredentials: this.withCredentials });
    for (const loaded of [50, 100])
      this.upload.progress?.({ lengthComputable: true, loaded, total: 100 } as ProgressEvent);
    this.status = answer.status;
    this.responseText = answer.text;
    this.listeners.load?.();
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('XMLHttpRequest', FakeRequest);
  // A session whose access token has more than a minute left.
  vi.stubGlobal('document', { cookie: 'ari_lang=en; ari_access_fresh=1' });
  fetchMock.mockImplementation(async () => new Response('{}'));
  sent.length = 0;
  answer = { status: 202, text: '{"id":"7","status":"QUEUED"}' };
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('imports', () => {
  it('uploads the file as multipart with the cookies, telling how far it got', async () => {
    const progress: number[] = [];
    const file = new File(['%PDF-'], 'swarms.pdf', { type: 'application/pdf' });

    const created = await uploadImport(file, (share) => progress.push(share));

    expect(created).toEqual({ id: '7', status: 'QUEUED' });
    expect(progress).toEqual([0.5, 1]);
    expect(new URL(sent[0].url).pathname).toBe('/api/v1/imports');
    expect(sent[0].withCredentials).toBe(true);
    expect((sent[0].body as FormData).get('file')).toBeInstanceOf(File);
  });

  it('sends the file at once while the session is fresh', async () => {
    await uploadImport(new File(['%PDF-'], 'swarms.pdf'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
  });

  it('refreshes first when the access token is about to go, so the file goes once', async () => {
    vi.stubGlobal('document', { cookie: 'ari_lang=en' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await uploadImport(new File(['%PDF-'], 'swarms.pdf'));

    expect(last()).toMatchObject({ path: '/api/v1/auth/refresh', method: 'POST' });
    expect(sent).toHaveLength(1);
  });

  it('goes to /login without sending when the session cannot be refreshed', async () => {
    vi.stubGlobal('document', { cookie: '' });
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(uploadImport(new File(['%PDF-'], 'swarms.pdf'))).rejects.toMatchObject({
      status: 401,
    });
    expect(assign).toHaveBeenCalledWith('/login');
    expect(sent).toHaveLength(0);
  });

  it('turns a refused upload into an ApiError with its code', async () => {
    answer = { status: 400, text: '{"code":"NO_SPACE_LEFT"}' };
    const file = new File(['%PDF-'], 'swarms.pdf');

    await expect(uploadImport(file)).rejects.toMatchObject({
      status: 400,
      code: 'NO_SPACE_LEFT',
    } satisfies Partial<ApiError>);
  });

  it('lists, reads, reviews, retries, dismisses and discards', async () => {
    await listImports();
    expect(last()).toMatchObject({ path: '/api/v1/imports', method: 'GET' });

    await fetchImport('a/b');
    expect(last()).toMatchObject({ path: '/api/v1/imports/a%2Fb', method: 'GET' });

    await reviewImport('7', { title: 'Swarms', selectedMarkIds: ['1'] });
    expect(last()).toMatchObject({
      path: '/api/v1/imports/7/review',
      method: 'PUT',
      body: '{"title":"Swarms","selectedMarkIds":["1"]}',
    });

    await retryImport('7');
    expect(last()).toMatchObject({ path: '/api/v1/imports/7/retry', method: 'POST' });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await dismissImport('7');
    expect(last()).toMatchObject({ path: '/api/v1/imports/7/dismiss', method: 'POST' });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await discardImport('7');
    expect(last()).toMatchObject({ path: '/api/v1/imports/7', method: 'DELETE' });
  });
});
