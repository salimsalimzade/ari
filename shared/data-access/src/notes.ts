import type { ListNotesQuery, NoteListResponse, NoteRequest, NoteResponse } from '@ari/types';
import { request, searchOf } from './client';

/**
 * The signed-in user's notes, the one changed most recently first; with `q`, those whose title or
 * paragraphs it finds.
 */
export function listNotes(query: ListNotesQuery = {}) {
  return request<NoteListResponse>(`/api/v1/notes${searchOf(query)}`);
}

/** Starts a note; quotes of saves that aren't the user's are left out. */
export function createNote(body: NoteRequest) {
  return request<NoteResponse>('/api/v1/notes', { method: 'POST', body });
}

/** One note with its quoted saves; a 404 is a note that doesn't exist or isn't theirs. */
export function fetchNote(id: string) {
  return request<NoteResponse>(`/api/v1/notes/${encodeURIComponent(id)}`);
}

/** Saves the whole note: its title and blocks replace what it held. */
export function replaceNote(id: string, body: NoteRequest) {
  return request<NoteResponse>(`/api/v1/notes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export function deleteNote(id: string) {
  return request<void>(`/api/v1/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
