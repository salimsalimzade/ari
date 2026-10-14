import {
  ApiError,
  createNote,
  deleteNote,
  fetchNote,
  listNotes,
  replaceNote,
} from '@ari/data-access';
import type { NoteRequest } from '@ari/types';
import { action, json, query } from '@solidjs/router';
import { getSource, getSourcePage } from '~/features/sources/queries';
import { type Note, type NoteSummary, toNote, toNoteSummary } from './notes';

// Like the Library's, the queries answer `failed` instead of throwing, so the page shows its error
// state while the rest goes on.

export type NoteList = { notes: NoteSummary[]; failed?: true };

/** Every note, the one changed most recently first. */
export const getNotes = query(async (): Promise<NoteList> => {
  try {
    return { notes: (await listNotes()).map(toNoteSummary) };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { notes: [], failed: true };
  }
}, 'notes');

/** The notes whose title or paragraphs a search finds; undefined when ari-api failed. */
export async function searchNotes(q: string) {
  try {
    return (await listNotes({ q })).map(toNoteSummary);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
}

/** One note; null when there is no such note or it is someone else's, `failed` on an error. */
export const getNote = query(async (id: string): Promise<Note | null | 'failed'> => {
  try {
    return toNote(await fetchNote(id));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    // 400: an id that isn't one ari-api could have made.
    return error.status === 404 || error.status === 400 ? null : 'failed';
  }
}, 'note');

// The Sources pages show which notes quote a source, so a change to the quotes marks them stale.
const sourceKeys = [getSourcePage.key, getSource.key];

/** Starts a note; returns it as ari-api has it. */
export const createNoteAction = action(
  async (body: NoteRequest) =>
    json(toNote(await createNote(body)), { revalidate: [getNotes.key, ...sourceKeys] }),
  'create-note',
);

/** Saves the whole note. The page has it already, so only the Sources pages are marked stale. */
export const saveNoteAction = action(async (id: string, body: NoteRequest) => {
  await replaceNote(id, body);
  return json(undefined, { revalidate: sourceKeys });
}, 'save-note');

/** Deletes a note; one that is gone already counts as deleted. */
export const deleteNoteAction = action(async (id: string) => {
  try {
    await deleteNote(id);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  return json(undefined, { revalidate: [getNotes.key, getNote.keyFor(id), ...sourceKeys] });
}, 'delete-note');
