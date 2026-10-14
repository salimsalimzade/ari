import type { HighlightColor } from '@ari/ui-kit';
import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';

/** The page a save came from. */
export type Source = {
  url: string;
  title: string;
  /** The site's name (og:site_name), or its domain. */
  siteName: string;
};

/**
 * A highlight or a clip. Shaped like ari-api's CreateSaveRequest; the background sends it to the
 * signed-in user's library (sync.ts) and keeps it here too, so the page can mark it.
 */
export type Save = {
  id: string;
  kind: 'HIGHLIGHT' | 'CLIP';
  /** Highlights only. */
  color?: HighlightColor;
  /** Clips only: a table as Markdown, or a picture. */
  clipType?: 'TABLE' | 'IMAGE';
  /** The marked words, or a clip's title. */
  text: string;
  /** A table clip's table. */
  contentMd?: string;
  /** An image clip's picture: the image's address, or a screenshot as a data: URL. */
  imageUrl?: string;
  comment?: string;
  /** The heading above it on the page. */
  section?: string;
  tags: string[];
  /** A highlight's neighbouring text, to tell its words apart from the same words elsewhere. */
  prefix?: string;
  suffix?: string;
  createdAt: string;
  /** Its id in the library, once it was sent there. */
  remoteId?: string;
  /** The account whose library has it; only that account sees it on the page. */
  owner?: string;
  /** Changed here since it was sent: the change goes to the library next. */
  changed?: boolean;
  /** ari-api's error code when it refused the save, which then stays in this browser only. */
  refused?: string;
};

/** One page's saves, kept under the page's address. */
export type PageSaves = { source: Source; saves: Save[] };

/** What a save can change after it is made, as in ari-api's PATCH /saves/{id}. */
export type SaveChange = Partial<Pick<Save, 'color' | 'comment' | 'tags'>>;

/** A save deleted here after it reached a library: the library deletes it next. */
export type Deleted = { remoteId: string; owner: string };

export const deletedSaves = storage.defineItem<Deleted[]>('local:deletedSaves', { fallback: [] });

/** Set while ari-api can't be reached: when sync tries again, and how many tries failed in a row. */
export const syncRetry = storage.defineItem<{ at: string; tries: number } | null>(
  'local:syncRetry',
  { fallback: null },
);

/**
 * Where a page's saves are kept: `local` for websites, `session` for the welcome tab's practice
 * saves, which the browser forgets when it closes.
 */
export type Area = 'local' | 'session';

/** Reads and changes the saves of the page at `url`. */
export function pageStore(url: string, area: Area = 'local') {
  const key = `${area}:page:${url}` as const;

  const get = () => storage.getItem<PageSaves>(key);

  const change = async (edit: (saves: Save[]) => Save[]) => {
    const page = await get();
    if (!page) return;
    const saves = edit(page.saves);
    if (saves.length) await storage.setItem(key, { ...page, saves });
    else await storage.removeItem(key);
  };

  return {
    get,
    watch: (callback: (page: PageSaves | null) => void) =>
      storage.watch<PageSaves>(key, (page) => callback(page)),
    /** New saves, or deleted ones put back by Undo, which go to the library as new. */
    async add(source: Source, saves: Save[]) {
      const page = await get();
      const added = saves.map(({ remoteId, owner, changed, refused, ...save }) => save);
      await storage.setItem(key, { source, saves: [...(page?.saves ?? []), ...added] });
    },
    update: (id: string, edit: SaveChange) =>
      change((saves) =>
        saves.map((save) =>
          save.id === id ? { ...save, ...edit, changed: !!save.remoteId || undefined } : save,
        ),
      ),
    async remove(ids: string[]) {
      const page = await get();
      const sent = (page?.saves ?? []).filter((save) => ids.includes(save.id));
      const deleted = sent.flatMap(({ remoteId, owner }) =>
        remoteId && owner ? [{ remoteId, owner }] : [],
      );
      if (deleted.length)
        await deletedSaves.setValue([...(await deletedSaves.getValue()), ...deleted]);
      await change((saves) => saves.filter((save) => !ids.includes(save.id)));
    },
    /** For sync: what the library answered, without counting as a change of the user's. */
    mark: (id: string, fields: Partial<Save>) =>
      change((saves) => saves.map((save) => (save.id === id ? { ...save, ...fields } : save))),
  };
}

export type PageStore = ReturnType<typeof pageStore>;

/** A new save's id; random bytes, because crypto.randomUUID is missing on http:// pages. */
export function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** The saves this browser shows: those kept only here, and those in the signed-in library. */
export function ownSaves(saves: Save[], accountId: string | undefined) {
  return saves.filter((save) => !save.owner || save.owner === accountId);
}

/** Whether a save is still to go to a library: neither there nor refused by it. */
export function isWaiting(save: Save) {
  return !save.remoteId && !save.refused;
}

/** Every website's saves in this browser, with the page's address. */
export async function localPages() {
  const all: Record<string, unknown> = await browser.storage.local.get(null);
  return Object.entries(all).flatMap(([key, value]) =>
    key.startsWith('page:') ? [{ url: key.slice('page:'.length), page: value as PageSaves }] : [],
  );
}

/** How many saves are kept only in this browser, and on how many sites. */
export async function waitingSaves() {
  const waiting = (await localPages()).flatMap(({ url, page }) =>
    page.saves.filter(isWaiting).map(() => url),
  );
  return { count: waiting.length, sites: new Set(waiting.map((url) => new URL(url).host)).size };
}
