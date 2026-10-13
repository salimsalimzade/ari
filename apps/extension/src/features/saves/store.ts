import type { HighlightColor } from '@ari/ui-kit';
import { storage } from 'wxt/utils/storage';

/** The page a save came from. */
export type Source = {
  url: string;
  title: string;
  /** The site's name (og:site_name), or its domain. */
  siteName: string;
};

/**
 * A highlight or a clip. Shaped like ari-api's CreateSaveRequest, so the saves kept here can be
 * sent to the library once the extension signs in (F13).
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
};

/** One page's saves, kept under the page's address. */
export type PageSaves = { source: Source; saves: Save[] };

/** What a save can change after it is made, as in ari-api's PATCH /saves/{id}. */
export type SaveChange = Partial<Pick<Save, 'color' | 'comment' | 'tags'>>;

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
    async add(source: Source, saves: Save[]) {
      const page = await get();
      await storage.setItem(key, { source, saves: [...(page?.saves ?? []), ...saves] });
    },
    update: (id: string, edit: SaveChange) =>
      change((saves) => saves.map((save) => (save.id === id ? { ...save, ...edit } : save))),
    remove: (ids: string[]) => change((saves) => saves.filter((save) => !ids.includes(save.id))),
  };
}

export type PageStore = ReturnType<typeof pageStore>;

/** A new save's id; random bytes, because crypto.randomUUID is missing on http:// pages. */
export function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
