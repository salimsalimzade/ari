import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listSaves } from './saves';
import { fetchSource, fetchSourceCounts, listSources } from './sources';

// Runs the client as it runs in the browser.
vi.mock('solid-js/web', () => ({ isServer: false, getRequestEvent: () => undefined }));

const fetchMock = vi.fn<typeof fetch>();

// The path and search of the last request.
const lastPath = () => {
  const sent = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
  return `${sent.pathname}${sent.search}`;
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ items: [] })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('sources', () => {
  it('lists a kind a page at a time', async () => {
    await listSources();
    expect(lastPath()).toBe('/api/v1/sources');

    await listSources({ kind: 'FILE', cursor: 'eyJ0Ijo' });
    expect(lastPath()).toBe('/api/v1/sources?kind=FILE&cursor=eyJ0Ijo');
  });

  it('reads the counts and one source by its id', async () => {
    await fetchSourceCounts();
    expect(lastPath()).toBe('/api/v1/sources/counts');

    await fetchSource('a/b');
    expect(lastPath()).toBe('/api/v1/sources/a%2Fb');
  });

  it("asks for a source's saves in page order", async () => {
    await listSaves({ source: ['8d3f'], order: 'PAGE' });
    expect(lastPath()).toBe('/api/v1/saves?source=8d3f&order=PAGE');
  });
});
