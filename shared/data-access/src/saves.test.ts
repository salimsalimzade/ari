import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSave, fetchSave, fetchSaveFacets, listSaves, updateSave } from './saves';

// Runs the client as it runs in the browser.
vi.mock('solid-js/web', () => ({ isServer: false, getRequestEvent: () => undefined }));

const fetchMock = vi.fn<typeof fetch>();

// The path and search of the last request, and how it was sent.
const last = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  const sent = new URL(String(url));
  return { path: `${sent.pathname}${sent.search}`, method: init?.method, body: init?.body };
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ items: [] })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('saves', () => {
  it('repeats each filter value and leaves out empty ones', async () => {
    await listSaves({
      type: 'HIGHLIGHT',
      tag: ['nest site', 'swarm'],
      color: [],
      source: ['8d3f'],
      cursor: undefined,
    });
    expect(last().path).toBe('/api/v1/saves?type=HIGHLIGHT&tag=nest+site&tag=swarm&source=8d3f');

    await fetchSaveFacets({});
    expect(last().path).toBe('/api/v1/saves/facets');
  });

  it('sends the cursor for the next page', async () => {
    await listSaves({ cursor: 'eyJ0Ijo', limit: 30 });
    expect(last().path).toBe('/api/v1/saves?cursor=eyJ0Ijo&limit=30');
  });

  it('reads, changes and deletes one save by its id', async () => {
    await fetchSave('a/b');
    expect(last()).toMatchObject({ path: '/api/v1/saves/a%2Fb', method: 'GET' });

    await updateSave('7', { color: 'PINK' });
    expect(last()).toMatchObject({
      path: '/api/v1/saves/7',
      method: 'PATCH',
      body: '{"color":"PINK"}',
    });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteSave('7');
    expect(last()).toMatchObject({ path: '/api/v1/saves/7', method: 'DELETE' });
  });
});
