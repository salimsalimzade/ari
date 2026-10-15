import { fetchNote, listNotes, listSaves } from '@ari/data-access';
import type { NoteResponse, SaveResponse } from '@ari/types';
import type { ExportData, ExportPart } from './export-file';

// Highlights take in the ones imported from files and photos.
const types = { highlights: ['HIGHLIGHT', 'IMPORT'], clips: ['CLIP'] } as const;

/**
 * Everything the export holds, loaded in the browser: the saves of each part picked, a hundred at a
 * time, then each note that has something in it. `loaded` counts saves and notes as they come;
 * `stopped` ends it early when the page goes away. Throws an `ApiError` when ari-api fails.
 */
export async function loadExport(
  parts: Record<ExportPart, boolean>,
  loaded: (count: number) => void,
  stopped: () => boolean,
): Promise<ExportData | undefined> {
  const saves: SaveResponse[] = [];
  for (const part of ['highlights', 'clips'] as const) {
    if (!parts[part]) continue;
    for (const type of types[part]) {
      let cursor: string | undefined;
      do {
        const page = await listSaves({ type, limit: 100, cursor });
        if (stopped()) return;
        saves.push(...(page.items ?? []));
        loaded(page.items?.length ?? 0);
        cursor = page.nextCursor;
      } while (cursor);
    }
  }
  const notes: NoteResponse[] = [];
  if (parts.notes) {
    for (const summary of await listNotes()) {
      if (summary.empty || !summary.id) continue;
      notes.push(await fetchNote(summary.id));
      if (stopped()) return;
      loaded(1);
    }
  }
  return { saves, notes };
}
