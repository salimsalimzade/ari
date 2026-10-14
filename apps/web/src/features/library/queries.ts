import {
  ApiError,
  deleteSave,
  fetchSave,
  fetchSaveFacets,
  listSaves,
  updateSave,
} from '@ari/data-access';
import type { ListSavesQuery, UpdateSaveRequest } from '@ari/types';
import type { HighlightColor } from '@ari/ui-kit';
import { action, json, query } from '@solidjs/router';
import { getMe } from '~/features/auth/queries';
import { getNote, getNotes } from '~/features/notes/queries';
import {
  getSource,
  getSourceCounts,
  getSourcePage,
  getSourceSaves,
} from '~/features/sources/queries';
import { type Facets, type Save, type SaveKind, toFacets, toSave } from './saves';

/**
 * What the Library shows: a type, any of the tags, colors and sources (ids) picked, and a search
 * (empty for none).
 */
export type SaveFilter = {
  type: 'all' | SaveKind;
  tags: string[];
  colors: HighlightColor[];
  sources: string[];
  q: string;
};

function toQuery(filter: SaveFilter): ListSavesQuery {
  return {
    type: filter.type === 'all' ? undefined : (filter.type.toUpperCase() as ListSavesQuery['type']),
    tag: filter.tags,
    color: filter.colors.map((color) => color.toUpperCase() as Uppercase<HighlightColor>),
    source: filter.sources,
    q: filter.q.trim() || undefined,
  };
}

// The queries answer `failed` instead of throwing when ari-api can't be reached or errs, so the
// page that needs them shows it, while search and the sidebar go on without them.

export type SavePage = { saves: Save[]; nextCursor?: string; failed?: true };

/** One page of the Library, newest first: the first without `cursor`, then the one it points to. */
export const getSavePage = query(async (filter: SaveFilter, cursor?: string): Promise<SavePage> => {
  try {
    const page = await listSaves({ ...toQuery(filter), cursor });
    return { saves: (page.items ?? []).map(toSave), nextCursor: page.nextCursor };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { saves: [], failed: true };
  }
}, 'saves');

/** The type tabs' counts for the filter, and the tag, color and source choices. */
export const getSaveFacets = query(async (filter: SaveFilter): Promise<Facets | undefined> => {
  try {
    return toFacets(await fetchSaveFacets(toQuery(filter)));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return undefined;
  }
}, 'save-facets');

/**
 * The first page of saves a search finds, and how many it finds in all; undefined when ari-api
 * failed. The page is the Library's own for that search, so opening it there needs no request.
 */
export async function searchSaves(q: string) {
  const filter: SaveFilter = { type: 'all', tags: [], colors: [], sources: [], q };
  const [page, facets] = await Promise.all([getSavePage(filter), getSaveFacets(filter)]);
  if (page.failed) return undefined;
  return { saves: page.saves, total: facets?.counts.all ?? page.saves.length };
}

/** One save; null when there is no such save or it is someone else's, `failed` on an error. */
export const getSave = query(async (id: string): Promise<Save | null | 'failed'> => {
  try {
    return toSave(await fetchSave(id));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    // 400: an id that isn't one ari-api could have made.
    return error.status === 404 || error.status === 400 ? null : 'failed';
  }
}, 'save');

// The actions refresh the counts they change, not the pages of saves the Library has loaded. The
// Sources pages sum the saves up, so theirs load again when they are next shown.
const sourceKeys = [getSourcePage.key, getSource.key, getSourceSaves.key];

/** Changes a save's color, comment or tags; returns it as ari-api has it now. */
export const changeSaveAction = action(
  async (id: string, change: UpdateSaveRequest) =>
    json(toSave(await updateSave(id, change)), {
      revalidate: [getSaveFacets.key, ...sourceKeys],
    }),
  'change-save',
);

/** Deletes a save; one that is gone already counts as deleted. */
export const deleteSaveAction = action(async (id: string) => {
  try {
    await deleteSave(id);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  return json(undefined, {
    revalidate: [
      getSaveFacets.key,
      getMe.key,
      getSave.keyFor(id),
      getSourceCounts.key,
      ...sourceKeys,
      // Its quotes go with it.
      getNotes.key,
      getNote.key,
    ],
  });
}, 'delete-save');
