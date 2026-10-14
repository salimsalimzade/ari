// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';
import { account } from '../account/session';
import { deletedSaves, pageStore, type Save, syncRetry } from './store';
import { syncSaves } from './sync';

const url = 'https://meadow.example/bees';
const source = { url, title: 'How Honeybees Choose a New Home', siteName: 'Meadow Quarterly' };
const store = pageStore(url);

function highlight(fields: Partial<Save> = {}): Save {
  return {
    id: 'h1',
    kind: 'HIGHLIGHT',
    color: 'yellow',
    text: 'A swarm hangs from a branch.',
    tags: ['swarm'],
    createdAt: '2026-10-14T09:00:00.000Z',
    ...fields,
  };
}

type Call = { method: string; path: string; body: unknown };

/** Stands in for ari-api: each request is recorded, and `answer` replies to it. */
function api(answer: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const call = {
        method: init.method ?? 'GET',
        path: new URL(input).pathname,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
      };
      calls.push(call);
      return answer(call);
    }),
  );
  return calls;
}

// A 204 has no body.
const json = (status: number, body: unknown = {}) =>
  status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });

const sync = (onRetry = () => {}) => syncSaves(onRetry);
const saved = async () => (await store.get())?.saves[0];

beforeEach(async () => {
  fakeBrowser.reset();
  vi.unstubAllGlobals();
  await storage.setItem('local:tokens', { accessToken: 'access', refreshToken: 'refresh' });
  await account.setValue({ id: 'bea', username: 'bea' });
});

describe('syncSaves', () => {
  it('sends a waiting highlight and keeps its library id', async () => {
    const calls = api(() => json(201, { id: 'r1' }));
    await store.add(source, [highlight()]);

    await sync();

    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/api/v1/saves',
        body: expect.objectContaining({
          kind: 'HIGHLIGHT',
          color: 'YELLOW',
          text: 'A swarm hangs from a branch.',
          tags: ['swarm'],
          source: { url, name: 'Meadow Quarterly', title: 'How Honeybees Choose a New Home' },
        }),
      },
    ]);
    expect(await saved()).toMatchObject({ remoteId: 'r1', owner: 'bea' });
  });

  it('sends a change, then a deletion, of a sent save', async () => {
    const calls = api((call) => json(call.method === 'DELETE' ? 204 : 200));
    await storage.setItem(`local:page:${url}`, {
      source,
      saves: [highlight({ remoteId: 'r1', owner: 'bea' })],
    });

    await store.update('h1', { color: 'pink', comment: 'Opening line' });
    await sync();
    expect(calls.at(-1)).toEqual({
      method: 'PATCH',
      path: '/api/v1/saves/r1',
      body: { color: 'PINK', comment: 'Opening line', tags: ['swarm'] },
    });
    expect((await saved())?.changed).toBeUndefined();

    await store.remove(['h1']);
    await sync();
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/api/v1/saves/r1' });
    expect(await deletedSaves.getValue()).toEqual([]);
  });

  it('keeps a save ari-api refuses in the browser, and doesn’t send it again', async () => {
    const calls = api(() => json(400, { code: 'INVALID_URL' }));
    await store.add(source, [highlight()]);

    await sync();
    await sync();

    expect(calls).toHaveLength(1);
    expect(await saved()).toMatchObject({ refused: 'INVALID_URL' });
    expect(await syncRetry.getValue()).toBeNull();
  });

  it('tries again later while ari-api is down', async () => {
    api(() => json(503));
    await store.add(source, [highlight()]);
    const onRetry = vi.fn();

    await sync(onRetry);

    expect(onRetry).toHaveBeenCalledOnce();
    expect(await syncRetry.getValue()).toMatchObject({ tries: 1 });
    expect((await saved())?.remoteId).toBeUndefined();
  });

  it('leaves another account’s saves alone', async () => {
    const calls = api(() => json(200));
    await storage.setItem(`local:page:${url}`, {
      source,
      saves: [highlight({ remoteId: 'r1', owner: 'ada', changed: true })],
    });
    await deletedSaves.setValue([{ remoteId: 'r2', owner: 'ada' }]);

    await sync();

    expect(calls).toEqual([]);
  });

  it('sends nothing while signed out', async () => {
    const calls = api(() => json(201, { id: 'r1' }));
    await account.setValue(null);
    await store.add(source, [highlight()]);

    await sync();

    expect(calls).toEqual([]);
  });

  it('deletes a save that was deleted here while it was on its way', async () => {
    const calls = api(async (call) => {
      if (call.method === 'POST') await store.remove(['h1']);
      return json(call.method === 'POST' ? 201 : 204, { id: 'r1' });
    });
    await store.add(source, [highlight()]);

    await sync();
    await sync();

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /api/v1/saves',
      'DELETE /api/v1/saves/r1',
    ]);
  });
});
