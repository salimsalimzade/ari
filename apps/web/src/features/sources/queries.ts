import { ApiError, fetchSource, fetchSourceCounts, listSaves, listSources } from '@ari/data-access';
import type { ListSourcesQuery } from '@ari/types';
import { query } from '@solidjs/router';
import type { SavePage } from '~/features/library/queries';
import { toSave } from '~/features/library/saves';
import { type SourceKind, type SourceSummary, toSourceSummary } from './sources';

// Like the Library's, these answer `failed` instead of throwing when ari-api can't be reached or
// errs, so the page shows its error state while the sidebar and search go on.

export type SourcePage = { sources: SourceSummary[]; nextCursor?: string; failed?: true };

/** One page of the Sources page, the source saved from most recently first. */
export const getSourcePage = query(
  async (kind: 'all' | SourceKind, cursor?: string): Promise<SourcePage> => {
    try {
      const page = await listSources({
        kind: kind === 'all' ? undefined : (kind.toUpperCase() as ListSourcesQuery['kind']),
        cursor,
      });
      return { sources: (page.items ?? []).map(toSourceSummary), nextCursor: page.nextCursor };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      return { sources: [], failed: true };
    }
  },
  'sources',
);

/**
 * The sources whose name, title or author a search finds, latest saved from first (the first 40);
 * undefined when ari-api failed.
 */
export async function searchSources(q: string) {
  try {
    const page = await listSources({ q });
    return { sources: (page.items ?? []).map(toSourceSummary), more: !!page.nextCursor };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
}

export type SourceCounts = Record<'all' | SourceKind, number> & { failed?: true };

/** How many sources there are, in all and of each kind: the kind tabs' counts. */
export const getSourceCounts = query(async (): Promise<SourceCounts> => {
  try {
    const counts = await fetchSourceCounts();
    const of = (kind: string) => counts.kinds?.find((item) => item.kind === kind)?.count ?? 0;
    return { all: counts.total ?? 0, website: of('WEBSITE'), file: of('FILE') };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { all: 0, website: 0, file: 0, failed: true };
  }
}, 'source-counts');

/**
 * One source; null when there is no such source or nothing is saved from it any more, `failed` on
 * an error.
 */
export const getSource = query(async (id: string): Promise<SourceSummary | null | 'failed'> => {
  try {
    return toSourceSummary(await fetchSource(id));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    // 400: an id that isn't one ari-api could have made.
    return error.status === 404 || error.status === 400 ? null : 'failed';
  }
}, 'source');

/**
 * `page`: where the saves are in the source (by page for a file, the order they were saved for a
 * website). `newest`: newest first.
 */
export type SaveOrder = 'page' | 'newest';

/** One page of a source's saves, in the order picked. */
export const getSourceSaves = query(
  async (id: string, order: SaveOrder, cursor?: string): Promise<SavePage> => {
    try {
      const page = await listSaves({
        source: [id],
        order: order === 'page' ? 'PAGE' : undefined,
        cursor,
      });
      return { saves: (page.items ?? []).map(toSave), nextCursor: page.nextCursor };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      return { saves: [], failed: true };
    }
  },
  'source-saves',
);
