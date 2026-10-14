import type { CreateSaveRequest, SaveResponse, UpdateSaveRequest } from '@ari/types';
import { account, apiRequest, expired } from '../account/session';
import {
  deletedSaves,
  isWaiting,
  localPages,
  type PageSaves,
  pageStore,
  type Save,
  syncRetry,
} from './store';

// Sends the saves kept in this browser to the signed-in user's library (F13, F14): new ones, their
// changes and their deletions, oldest page first. Saves made while signed out wait here and go to
// whoever signs in next. Only the background runs it; it retries on its own while ari-api can't be
// reached. Errors that sending again won't fix (400, 413) leave the save here, marked refused.

// Minutes before each try after a failed one; the last one repeats.
const backoff = [1, 2, 5, 10, 30];

/** ari-api didn't answer, or answered with a server error: try again later. */
class Unreachable extends Error {}
/** The session ended while sending: nothing more goes until somebody signs in. */
class SignedOut extends Error {}

let running: Promise<void> | undefined;
let again = false;

/**
 * Sends what is waiting. A call while it runs makes it run once more after, so a save made
 * meanwhile goes too. Resolves when it is done; `onRetry` schedules the next try after a failure.
 */
export function syncSaves(onRetry: (at: Date) => void) {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce(onRetry);
    } while (again);
  })().finally(() => {
    running = undefined;
  });
  return running;
}

async function syncOnce(onRetry: (at: Date) => void) {
  const me = await account.getValue();
  if (!me?.id || (await expired.getValue())) return;
  try {
    await sendDeletions(me.id);
    for (const { url, page } of await localPages()) {
      for (const save of page.saves) await sendSave(url, page, save, me.id);
    }
    await syncRetry.setValue(null);
  } catch (error) {
    if (error instanceof SignedOut) return;
    // Unreachable, or fetch itself failed (offline, ari-api down): try again later.
    const tries = ((await syncRetry.getValue())?.tries ?? 0) + 1;
    const at = new Date(Date.now() + backoff[Math.min(tries, backoff.length) - 1] * 60_000);
    await syncRetry.setValue({ at: at.toISOString(), tries });
    onRetry(at);
  }
}

async function sendDeletions(owner: string) {
  for (const deleted of await deletedSaves.getValue()) {
    // Another account's deletion waits for that account.
    if (deleted.owner !== owner) continue;
    // A 404 means it was deleted in the library already.
    check(await apiRequest(`/api/v1/saves/${deleted.remoteId}`, { method: 'DELETE' }));
    const rest = await deletedSaves.getValue();
    await deletedSaves.setValue(rest.filter((other) => other.remoteId !== deleted.remoteId));
  }
}

async function sendSave(url: string, page: PageSaves, save: Save, owner: string) {
  const store = pageStore(url);
  if (isWaiting(save)) {
    const answer = await create(page, save);
    const response = answer === 'IMAGE_GONE' ? answer : check(answer);
    if (response === 'IMAGE_GONE' || !response.ok) {
      await store.mark(save.id, {
        refused: response === 'IMAGE_GONE' ? response : await codeOf(response),
      });
      return;
    }
    const created: SaveResponse = await response.json();
    if (!created.id) throw new Unreachable();
    const now = (await store.get())?.saves.find((other) => other.id === save.id);
    // Deleted while it was on its way: the library deletes it next.
    if (!now) {
      const remoteId = created.id;
      await deletedSaves.setValue([...(await deletedSaves.getValue()), { remoteId, owner }]);
      return;
    }
    // A change made while it was on its way goes next.
    await store.mark(save.id, {
      remoteId: created.id,
      owner,
      changed: !sameChange(now, save) || undefined,
    });
  } else if (save.remoteId && save.owner === owner && save.changed) {
    const body: UpdateSaveRequest = {
      color: save.kind === 'HIGHLIGHT' ? toColor(save.color) : undefined,
      comment: save.comment ?? '',
      tags: save.tags,
    };
    const response = check(
      await apiRequest(`/api/v1/saves/${save.remoteId}`, { method: 'PATCH', body }),
    );
    const now = (await store.get())?.saves.find((other) => other.id === save.id);
    // 404: deleted in the library, so it leaves the page too.
    if (response.status === 404) await store.remove([save.id]);
    else if (!now || sameChange(now, save)) await store.mark(save.id, { changed: undefined });
  }
}

/**
 * POST /saves: JSON, or multipart with the picture for an image clip; IMAGE_GONE when the image's
 * address no longer has it.
 */
async function create(page: PageSaves, save: Save) {
  const body: CreateSaveRequest = {
    kind: save.kind,
    color: save.kind === 'HIGHLIGHT' ? toColor(save.color) : undefined,
    clipType: save.clipType,
    text: save.text,
    contentMd: save.contentMd,
    comment: save.comment || undefined,
    section: save.section,
    tags: save.tags,
    source: { url: page.source.url, name: page.source.siteName, title: page.source.title },
  };
  if (save.clipType !== 'IMAGE' || !save.imageUrl) {
    return apiRequest('/api/v1/saves', { method: 'POST', body });
  }
  // The image's own address, or the screenshot's data: URL.
  const picture = await fetch(save.imageUrl);
  if (!picture.ok) return 'IMAGE_GONE';
  const form = new FormData();
  form.append('save', new Blob([JSON.stringify(body)], { type: 'application/json' }));
  form.append('image', await picture.blob(), 'clip');
  return apiRequest('/api/v1/saves', { method: 'POST', body: form });
}

/** An answer to act on: a refusal (4xx) is the save's, anything else is tried again later. */
function check(response: Response | undefined) {
  if (!response) throw new SignedOut();
  const later = response.status >= 500 || response.status === 408 || response.status === 429;
  if (!later) return response;
  throw new Unreachable();
}

async function codeOf(response: Response) {
  const problem: { code?: string } = await response.json().catch(() => ({}));
  return problem.code ?? String(response.status);
}

/** Whether the color, comment and tags are as they were when sent. */
function sameChange(now: Save, sent: Save) {
  return (
    now.color === sent.color &&
    (now.comment ?? '') === (sent.comment ?? '') &&
    now.tags.join('\n') === sent.tags.join('\n')
  );
}

function toColor(color: Save['color']) {
  return color ? (color.toUpperCase() as CreateSaveRequest['color']) : undefined;
}
