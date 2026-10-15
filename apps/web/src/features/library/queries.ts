import {
  ApiError,
  deleteSave,
  discardImport,
  dismissImport,
  fetchImport,
  fetchSave,
  fetchSaveFacets,
  importPhoto,
  listImports,
  listSaves,
  retryImport,
  reviewImport,
  updateSave,
  uploadImport,
} from '@ari/data-access';
import type { ListSavesQuery, ReviewImportRequest, UpdateSaveRequest } from '@ari/types';
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
import { type ImportFile, type Space, toImportFile, toSpace } from './imports';
import { photoType, readPhotoMarks } from './photo-ocr';
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

// — Imports (sequences §5) —

export type ImportList = { files: ImportFile[]; space: Space; failed?: true };

/** The Imports page's files, newest first, and the upload space. */
export const getImports = query(async (): Promise<ImportList> => {
  try {
    const page = await listImports();
    return { files: (page.items ?? []).map(toImportFile), space: toSpace(page.space) };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { files: [], space: toSpace(), failed: true };
  }
}, 'imports');

/**
 * Uploads a file, telling `onProgress` the share sent; answers the import ari-api queued, or why it
 * was refused.
 */
export async function uploadFile(
  file: File,
  onProgress: (sent: number) => void,
): Promise<ImportFile | { rejected: NonNullable<ImportFile['rejected']> }> {
  try {
    return toImportFile(await uploadImport(file, onProgress));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const reasons = {
      UNSUPPORTED_FILE: 'type',
      // Over the whole space: it can never fit.
      FILE_TOO_LARGE: 'noSpace',
      NO_SPACE_LEFT: 'noSpace',
    } as const;
    return { rejected: reasons[error.code as keyof typeof reasons] ?? 'failed' };
  }
}

/**
 * Reads a photo here and sends what is marked on it, reporting how far the reading got; ari-api
 * answers with the import, ready to review (or empty), as a file's would be once read.
 */
export async function importPhotoFile(
  file: File,
  onProgress: (share: number) => void,
): Promise<ImportFile | { rejected: NonNullable<ImportFile['rejected']> }> {
  let marks: Awaited<ReturnType<typeof readPhotoMarks>>;
  try {
    marks = await readPhotoMarks(file, onProgress);
  } catch {
    return { rejected: 'unreadable' };
  }
  try {
    return toImportFile(
      await importPhoto({
        fileName: file.name,
        contentType: photoType(file),
        sizeBytes: file.size,
        marks: marks.map((mark) => ({
          type: mark.type.toUpperCase() as Uppercase<typeof mark.type>,
          text: mark.text,
          color: mark.color,
        })),
      }),
    );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const full = error.code === 'NO_SPACE_LEFT' || error.code === 'FILE_TOO_LARGE';
    return { rejected: full ? 'noSpace' : 'failed' };
  }
}

/** One import with its marks once read; null when there is no such import, `failed` on an error. */
export const getImport = query(async (id: string): Promise<ImportFile | null | 'failed'> => {
  try {
    return toImportFile(await fetchImport(id));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return error.status === 404 || error.status === 400 ? null : 'failed';
  }
}, 'import');

/**
 * Saves a review: its saves join the Library (and unticked saved ones leave it), so the Library,
 * its counts and the Sources pages load again.
 */
export const reviewImportAction = action(
  async (id: string, body: ReviewImportRequest) =>
    json(await reviewImport(id, body), {
      revalidate: [
        getImports.key,
        getImport.keyFor(id),
        getSavePage.key,
        getSaveFacets.key,
        getMe.key,
        getSourceCounts.key,
        ...sourceKeys,
        // Removed saves take their quotes with them.
        getNotes.key,
        getNote.key,
      ],
    }),
  'review-import',
);

/** Reads a failed file again. */
export const retryImportAction = action(
  async (id: string) => json(toImportFile(await retryImport(id)), { revalidate: getImports.key }),
  'retry-import',
);

/** Hides a failed, empty or discarded file. */
export const dismissImportAction = action(async (id: string) => {
  await dismissImport(id);
  return json(undefined, { revalidate: getImports.key });
}, 'dismiss-import');

/** Drops a file before its review. */
export const discardImportAction = action(async (id: string) => {
  await discardImport(id);
  return json(undefined, { revalidate: [getImports.key, getImport.keyFor(id)] });
}, 'discard-import');
