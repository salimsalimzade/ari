import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNote, deleteNote, fetchNote, listNotes, replaceNote } from './notes';

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
  fetchMock.mockImplementation(async () => new Response('{}'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('notes', () => {
  it('lists, creates and reads notes', async () => {
    await listNotes();
    expect(last()).toMatchObject({ path: '/api/v1/notes', method: 'GET' });

    await listNotes({ q: 'swarm nest' });
    const [url] = fetchMock.mock.calls.at(-1) ?? [];
    expect(new URL(String(url)).search).toBe('?q=swarm+nest');

    await createNote({ title: '', blocks: [{ kind: 'TEXT', text: '' }] });
    expect(last()).toMatchObject({
      path: '/api/v1/notes',
      method: 'POST',
      body: '{"title":"","blocks":[{"kind":"TEXT","text":""}]}',
    });

    await fetchNote('a/b');
    expect(last()).toMatchObject({ path: '/api/v1/notes/a%2Fb', method: 'GET' });
  });

  it('replaces and deletes a note by its id', async () => {
    await replaceNote('7', { title: 'Swarm', blocks: [{ kind: 'QUOTE', saveId: '9' }] });
    expect(last()).toMatchObject({
      path: '/api/v1/notes/7',
      method: 'PUT',
      body: '{"title":"Swarm","blocks":[{"kind":"QUOTE","saveId":"9"}]}',
    });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteNote('7');
    expect(last()).toMatchObject({ path: '/api/v1/notes/7', method: 'DELETE' });
  });
});
