import type { NoteRequest, NoteResponse, NoteSummaryResponse } from '@ari/types';
import { type Save, toSave } from '~/features/library/saves';

/** A paragraph of the note's own text, or a quote of a save in the Library. */
export type Block =
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'quote'; saveId: string };

/** A note with its blocks, as the editor has it. */
export type Note = {
  id: string;
  title: string;
  /** Always ends with a paragraph, so there is somewhere to write after a quote. */
  blocks: Block[];
  /** The saves its quotes show, as ari-api sent them or as they were picked. */
  quoted: Record<string, Save>;
  createdAt: Date;
  /** The last edit; the same as `createdAt` until the first one. */
  updatedAt: Date;
};

/** A note in the list, without its text. */
export type NoteSummary = {
  id: string;
  title: string;
  /** The saves it quotes, in order. */
  saveIds: string[];
  /** No title, no quote and nothing written. */
  empty: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** A note as ari-api sends it. Its blocks' ids come from their places, so the server's match. */
export function toNote(response: NoteResponse): Note {
  const id = response.id ?? '';
  const quoted: Record<string, Save> = {};
  const blocks = (response.blocks ?? []).map((block, index): Block => {
    const blockId = `${id}:${index}`;
    if (block.kind === 'QUOTE' && block.save) {
      const save = toSave(block.save);
      quoted[save.id] = save;
      return { id: blockId, kind: 'quote', saveId: save.id };
    }
    return { id: blockId, kind: 'text', text: block.text ?? '' };
  });
  if (blocks.at(-1)?.kind !== 'text')
    blocks.push({ id: `${id}:${blocks.length}`, kind: 'text', text: '' });
  return {
    id,
    title: response.title ?? '',
    blocks,
    quoted,
    createdAt: new Date(response.createdAt ?? 0),
    updatedAt: new Date(response.updatedAt ?? 0),
  };
}

export function toNoteSummary(response: NoteSummaryResponse): NoteSummary {
  return {
    id: response.id ?? '',
    title: response.title ?? '',
    saveIds: response.saveIds ?? [],
    empty: response.empty ?? false,
    createdAt: new Date(response.createdAt ?? 0),
    updatedAt: new Date(response.updatedAt ?? 0),
  };
}

/** The whole note for ari-api, which replaces what it held. */
export function toNoteRequest(note: Pick<Note, 'title' | 'blocks'>): NoteRequest {
  return {
    title: note.title,
    blocks: note.blocks.map((block) =>
      block.kind === 'text'
        ? { kind: 'TEXT', text: block.text }
        : { kind: 'QUOTE', saveId: block.saveId },
    ),
  };
}
