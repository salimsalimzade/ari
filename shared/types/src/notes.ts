import type { RequestBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type ListNotes = paths['/api/v1/notes']['get'];
type CreateNote = paths['/api/v1/notes']['post'];
type GetNote = paths['/api/v1/notes/{id}']['get'];

/** A search (`q`); left out for every note. */
export type ListNotesQuery = NonNullable<ListNotes['parameters']['query']>;
/** Every note (or those a search finds), the one changed most recently first, without its text. */
export type NoteListResponse = ResponseBody<ListNotes>;
/** A note in the list: its title, the saves it quotes, whether it is empty, and its times. */
export type NoteSummaryResponse = NoteListResponse[number];

/** A whole note, sent to create one or to replace what one holds. */
export type NoteRequest = RequestBody<CreateNote>;
/** A note with its blocks in order; each quote carries its save. */
export type NoteResponse = ResponseBody<GetNote>;
