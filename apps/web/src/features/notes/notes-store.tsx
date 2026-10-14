import {
  createContext,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useLibrary } from '~/features/library/library-store';
import type { Save } from '~/features/library/saves';
import { type Block, type Note, sampleNotes } from './sample';

let lastId = 0;
// Unique within the page; ari-api will hand out the real ids.
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(lastId++).toString(36)}`;

const textBlock = (text = ''): Extract<Block, { kind: 'text' }> => ({
  id: newId('b'),
  kind: 'text',
  text,
});
const quoteBlock = (saveId: string): Block => ({ id: newId('b'), kind: 'quote', saveId });
const lastChange = (note: Note) => (note.editedAt ?? note.createdAt).getTime();

/**
 * The notes and their changes. Quotes point at saves, so a quote shows its save's current color
 * and goes away when the save is deleted. Everything stays in the page until ari-api has the
 * endpoints; it starts from the design's example notes (`sample.ts`).
 */
function createNotes(saves: () => Save[]) {
  const [notes, setNotes] = createStore<Note[]>(sampleNotes());
  // Moves on every half minute, so "10 min ago" stays true.
  const [now, setNow] = createSignal(new Date());
  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    onCleanup(() => clearInterval(timer));
  });

  const savesById = createMemo(() => new Map(saves().map((save) => [save.id, save])));
  const find = (id: string) => notes.find((note) => note.id === id);

  /** The note's blocks, without quotes of saves that were deleted from the Library. */
  const blocksOf = (note: Note) =>
    note.blocks.filter((block) => block.kind === 'text' || savesById().has(block.saveId));
  const quotesOf = (note: Note) =>
    note.blocks.flatMap((block) => {
      const save = block.kind === 'quote' ? savesById().get(block.saveId) : undefined;
      return save ? [save] : [];
    });

  // Changes one note's blocks and marks it edited. The note keeps a paragraph at its end.
  const edit = (id: string, change: (blocks: Block[], note: Note) => void) =>
    setNotes(
      (note) => note.id === id,
      produce((note) => {
        change(note.blocks, note);
        if (note.blocks.at(-1)?.kind !== 'text') note.blocks.push(textBlock());
        note.editedAt = new Date();
      }),
    );
  const at = (blocks: Block[], blockId: string) =>
    blocks.findIndex((block) => block.id === blockId);
  const textAt = (blocks: Block[], index: number) => {
    const block = blocks[index];
    return block?.kind === 'text' ? block : undefined;
  };

  const add = (note: Omit<Note, 'id' | 'createdAt'>) => {
    const id = newId('n');
    setNotes((list) => [...list, { ...note, id, createdAt: new Date() }]);
    return id;
  };

  return {
    /** Newest change first. */
    list: createMemo(() => [...notes].sort((a, b) => lastChange(b) - lastChange(a))),
    find,
    now,
    saveOf: (id: string) => savesById().get(id),
    blocksOf,
    quotesOf,
    /** Nothing written and nothing quoted. */
    isEmpty: (note: Note) =>
      !note.title.trim() &&
      blocksOf(note).every((block) => block.kind === 'text' && !block.text.trim()),

    /** Starts a note, empty or with the given saves quoted; returns its id. */
    create: (saveIds: string[] = []) =>
      add({ title: '', blocks: [...saveIds.map(quoteBlock), textBlock()] }),
    duplicate: (id: string, title: string) => {
      const note = find(id);
      if (!note) return;
      return add({
        title,
        blocks: note.blocks.map((block) => ({ ...block, id: newId('b') })),
        editedAt: new Date(),
      });
    },
    remove: (id: string) => setNotes((list) => list.filter((note) => note.id !== id)),

    setTitle: (id: string, title: string) =>
      edit(id, (_, note) => {
        note.title = title;
      }),
    setText: (id: string, blockId: string, text: string) =>
      edit(id, (blocks) => {
        const block = textAt(blocks, at(blocks, blockId));
        if (block) block.text = text;
      }),
    /** Splits a paragraph at the caret (dropping the selection); returns the new paragraph's id. */
    split: (id: string, blockId: string, start: number, end: number) => {
      const next = textBlock();
      edit(id, (blocks) => {
        const index = at(blocks, blockId);
        const block = textAt(blocks, index);
        if (!block) return;
        next.text = block.text.slice(end);
        block.text = block.text.slice(0, start);
        blocks.splice(index + 1, 0, next);
      });
      return next.id;
    },
    /** Puts a paragraph after another one, e.g. after a quote. Returns its id. */
    addText: (id: string, afterId: string) => {
      const next = textBlock();
      edit(id, (blocks) => {
        blocks.splice(at(blocks, afterId) + 1, 0, next);
      });
      return next.id;
    },
    /** Joins the paragraph `fromId` onto the end of the paragraph `intoId`. */
    merge: (id: string, intoId: string, fromId: string) =>
      edit(id, (blocks) => {
        const into = textAt(blocks, at(blocks, intoId));
        const from = textAt(blocks, at(blocks, fromId));
        if (!into || !from) return;
        into.text += from.text;
        blocks.splice(at(blocks, fromId), 1);
      }),
    removeBlock: (id: string, blockId: string) =>
      edit(id, (blocks) => {
        const index = at(blocks, blockId);
        if (index >= 0) blocks.splice(index, 1);
      }),
    /**
     * Swaps the paragraph holding the "/" command for a quote of the save. Returns the paragraph
     * after the quote, where writing goes on.
     */
    insertQuote: (id: string, blockId: string, saveId: string) => {
      let after = '';
      edit(id, (blocks) => {
        const index = at(blocks, blockId);
        if (index < 0) return;
        blocks.splice(index, 1, quoteBlock(saveId));
        const next = textAt(blocks, index + 1) ?? textBlock();
        if (next !== blocks[index + 1]) blocks.splice(index + 1, 0, next);
        after = next.id;
      });
      return after;
    },
    /** Quotes a save at the end of a note, e.g. from the Library's "Add to note". */
    appendQuote: (id: string, saveId: string) =>
      edit(id, (blocks) => {
        const last = blocks.at(-1);
        const trailing = last?.kind === 'text' && !last.text.trim();
        blocks.splice(trailing ? blocks.length - 1 : blocks.length, 0, quoteBlock(saveId));
      }),
    /**
     * Starts the "/" command after a block (an empty paragraph takes it), or at the end of the
     * note. Returns the paragraph holding it.
     */
    startQuote: (id: string, afterId?: string) => {
      let holder = '';
      edit(id, (blocks) => {
        const found = afterId ? at(blocks, afterId) : -1;
        const index = found >= 0 ? found : blocks.length - 1;
        const block = textAt(blocks, index);
        if (block && !block.text.trim()) {
          block.text = '/';
          holder = block.id;
          return;
        }
        const slash = textBlock('/');
        blocks.splice(index + 1, 0, slash);
        holder = slash.id;
      });
      return holder;
    },
  };
}

type Notes = ReturnType<typeof createNotes>;

const NotesContext = createContext<Notes>();

/** The notes for the signed-in pages; inside LibraryProvider, whose saves they quote. */
export function NotesProvider(props: { children: JSX.Element }) {
  const library = useLibrary();
  return (
    <NotesContext.Provider value={createNotes(library.saves)}>
      {props.children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const notes = useContext(NotesContext);
  if (!notes) throw new Error('useNotes needs a NotesProvider above it');
  return notes;
}
