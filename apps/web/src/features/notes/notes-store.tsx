import { createAsync, revalidate, useAction } from '@solidjs/router';
import {
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  startTransition,
  useContext,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { derive, useLibrary } from '~/features/library/library-store';
import type { Save } from '~/features/library/saves';
import { useI18n } from '~/i18n/i18n';
import { type Block, type Note, type NoteSummary, toNoteRequest } from './notes';
import { createNoteAction, deleteNoteAction, getNote, getNotes, saveNoteAction } from './queries';

// How long the editor waits for more typing before it saves.
const saveDelay = 700;
// How long a note whose save failed waits before it goes again.
const retryDelay = 15_000;

let lastId = 0;
// Unique within the page: a block's id only tells the editor's fields apart.
const newId = () => `b${Date.now().toString(36)}${(lastId++).toString(36)}`;

const textBlock = (text = ''): Extract<Block, { kind: 'text' }> => ({
  id: newId(),
  kind: 'text',
  text,
});
const quoteBlock = (saveId: string): Block => ({ id: newId(), kind: 'quote', saveId });

/** Not saving, saving (a change waits or is on its way), or the last save failed. */
export type SaveState = 'saving' | 'failed' | undefined;

/**
 * The notes from ari-api. A note opened in the editor becomes a draft that the page changes at
 * once and sends as a whole once the typing stops, one save at a time per note, so a slow one
 * never overwrites a newer one. Quotes point at saves, so a quote shows its save's current color
 * and goes away when the save is deleted.
 */
function createNotes() {
  const { t } = useI18n();
  const library = useLibrary();
  const listed = createAsync(() => getNotes(), { deferStream: true });
  // The notes opened during this visit, with their changes; ahead of ari-api while a save is due.
  const [drafts, setDrafts] = createStore<Record<string, Note>>({});
  // Notes created during this visit, until the list from ari-api has them.
  const [created, setCreated] = createSignal<NoteSummary[]>([]);
  const [deleted, setDeleted] = createSignal<ReadonlySet<string>>(new Set());
  const [states, setStates] = createStore<Record<string, SaveState>>({});
  // Moves on every half minute, so "10 min ago" stays true.
  const [now, setNow] = createSignal(new Date());

  const createRequest = useAction(createNoteAction);
  const saveRequest = useAction(saveNoteAction);
  const deleteRequest = useAction(deleteNoteAction);

  const known = derive(() => new Map(library.saves().map((save) => [save.id, save])));

  /** The save a quote shows: the Library's when loaded (with this visit's changes), else the note's. */
  const saveOf = (note: Note, saveId: string) => {
    if (library.isDeleted(saveId)) return;
    const save = known().get(saveId) ?? note.quoted[saveId];
    return save && library.withChanges(save);
  };
  /** The note's blocks, without quotes of saves that were deleted from the Library. */
  const blocksOf = (note: Note) =>
    note.blocks.filter((block) => block.kind === 'text' || saveOf(note, block.saveId));
  const quotesOf = (note: Note) =>
    note.blocks.flatMap((block) => {
      const save = block.kind === 'quote' ? saveOf(note, block.saveId) : undefined;
      return save ? [save] : [];
    });
  const isEmpty = (note: Note) =>
    !note.title.trim() &&
    blocksOf(note).every((block) => block.kind === 'text' && !block.text.trim());
  const summaryOf = (note: Note): NoteSummary => ({
    id: note.id,
    title: note.title,
    saveIds: quotesOf(note).map((save) => save.id),
    empty: isEmpty(note),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  });

  // — Saving —

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const sending = new Map<string, Promise<void>>();

  /** Sends the note as the page has it now, once the save before it has arrived. */
  const flush = (id: string) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    const run = (sending.get(id) ?? Promise.resolve()).then(async () => {
      const note = drafts[id];
      if (!note || deleted().has(id)) return;
      try {
        await saveRequest(id, toNoteRequest(note));
        if (!timers.has(id) && sending.get(id) === run) setStates(id, undefined);
      } catch {
        setStates(id, 'failed');
        // ari-api may be back in a moment: the note goes again on its own.
        if (!timers.has(id))
          timers.set(
            id,
            setTimeout(() => void flush(id), retryDelay),
          );
      }
    });
    sending.set(id, run);
    void run.finally(() => {
      if (sending.get(id) === run) sending.delete(id);
    });
    return run;
  };

  // Changes one note's draft, marks it edited and saves it once the typing stops. The note keeps a
  // paragraph at its end.
  const edit = (id: string, change: (note: Note) => void) => {
    if (!drafts[id]) return;
    setDrafts(
      id,
      produce((note) => {
        change(note);
        if (note.blocks.at(-1)?.kind !== 'text') note.blocks.push(textBlock());
        note.updatedAt = new Date();
      }),
    );
    clearTimeout(timers.get(id));
    setStates(id, 'saving');
    timers.set(
      id,
      setTimeout(() => void flush(id), saveDelay),
    );
  };
  const at = (blocks: Block[], blockId: string) =>
    blocks.findIndex((block) => block.id === blockId);
  const textAt = (blocks: Block[], index: number) => {
    const block = blocks[index];
    return block?.kind === 'text' ? block : undefined;
  };

  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    // A tab that goes away saves what it has at once.
    const hide = () => {
      if (document.visibilityState === 'hidden') for (const id of [...timers.keys()]) flush(id);
    };
    document.addEventListener('visibilitychange', hide);
    // Back online: notes waiting to go again go now.
    const online = () => {
      for (const id of [...timers.keys()]) flush(id);
    };
    window.addEventListener('online', online);
    onCleanup(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('online', online);
      for (const id of [...timers.keys()]) flush(id);
    });
  });

  /** Makes a draft of a note ari-api sent, unless the page has one already. */
  const track = (note: Note) => {
    if (drafts[note.id]) return;
    setDrafts(note.id, {
      ...note,
      blocks: note.blocks.map((block) => ({ ...block })),
      quoted: { ...note.quoted },
    });
  };

  /** Starts a note from a title and blocks, and lists it; returns its id. */
  const start = async (title: string, blocks: Block[]) => {
    try {
      const note = await createRequest(toNoteRequest({ title, blocks }));
      setCreated((list) => [...list, summaryOf(note)]);
      return note.id;
    } catch {
      library.showToast({ text: t().notes.createFailed });
    }
  };

  return {
    /** Newest change first. */
    list: derive(() => {
      const gone = deleted();
      const byId = new Map<string, NoteSummary>();
      for (const summary of [...(listed()?.notes ?? []), ...created()]) {
        if (gone.has(summary.id)) continue;
        const draft = drafts[summary.id];
        byId.set(
          summary.id,
          draft
            ? summaryOf(draft)
            : {
                ...summary,
                saveIds: summary.saveIds.filter((saveId) => !library.isDeleted(saveId)),
              },
        );
      }
      return [...byId.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }),
    /** The list didn't load. */
    failed: () => !!listed()?.failed,
    reload: () => startTransition(() => revalidate(getNotes.key)),
    /** The note as the page has it: its draft, or as ari-api sent it until the draft is made. */
    open: (note: Note) => drafts[note.id] ?? note,
    track,
    now,
    saveOf,
    blocksOf,
    quotesOf,
    isEmpty,
    /** Whether the note's latest change is saved. */
    saveState: (id: string) => states[id],
    /** Sends the note again after a save failed. */
    retry: (id: string) => {
      setStates(id, 'saving');
      void flush(id);
    },

    /** Starts a note, empty or quoting the given saves; returns its id, undefined if it failed. */
    create: (saves: Save[] = []) =>
      start('', [...saves.map((save) => quoteBlock(save.id)), textBlock()]),
    duplicate: (note: Note, title: string) =>
      start(
        title,
        note.blocks.map((block) => ({ ...block })),
      ),
    /** Takes the note off the page at once; it comes back with a toast when ari-api says no. */
    remove: (id: string) => {
      clearTimeout(timers.get(id));
      timers.delete(id);
      setDeleted((ids) => new Set(ids).add(id));
      void deleteRequest(id).catch(() => {
        setDeleted((ids) => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
        library.showToast({ text: t().notes.deleteFailed });
      });
    },

    setTitle: (id: string, title: string) =>
      edit(id, (note) => {
        note.title = title;
      }),
    setText: (id: string, blockId: string, text: string) =>
      edit(id, (note) => {
        const block = textAt(note.blocks, at(note.blocks, blockId));
        if (block) block.text = text;
      }),
    /** Splits a paragraph at the caret (dropping the selection); returns the new paragraph's id. */
    split: (id: string, blockId: string, start: number, end: number) => {
      const next = textBlock();
      edit(id, ({ blocks }) => {
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
      edit(id, ({ blocks }) => {
        blocks.splice(at(blocks, afterId) + 1, 0, next);
      });
      return next.id;
    },
    /** Joins the paragraph `fromId` onto the end of the paragraph `intoId`. */
    merge: (id: string, intoId: string, fromId: string) =>
      edit(id, ({ blocks }) => {
        const into = textAt(blocks, at(blocks, intoId));
        const from = textAt(blocks, at(blocks, fromId));
        if (!into || !from) return;
        into.text += from.text;
        blocks.splice(at(blocks, fromId), 1);
      }),
    removeBlock: (id: string, blockId: string) =>
      edit(id, ({ blocks }) => {
        const index = at(blocks, blockId);
        if (index >= 0) blocks.splice(index, 1);
      }),
    /**
     * Puts a quote of the save in place of the "/" command, `start` to `end` of the paragraph:
     * the writing before the command stays, the writing after it goes on in a paragraph after the
     * quote, and a paragraph with nothing else in it becomes the quote. Returns the paragraph after
     * the quote, where writing goes on.
     */
    insertQuote: (id: string, blockId: string, save: Save, start: number, end: number) => {
      let after = '';
      edit(id, (note) => {
        const { blocks } = note;
        const index = at(blocks, blockId);
        const block = textAt(blocks, index);
        if (!block) return;
        note.quoted[save.id] = save;
        const before = block.text.slice(0, start).trimEnd();
        const rest = block.text.slice(end).trimStart();
        block.text = before;
        const quoteAt = before ? index + 1 : index;
        blocks.splice(quoteAt, before ? 0 : 1, quoteBlock(save.id));
        const next = rest ? textBlock(rest) : (textAt(blocks, quoteAt + 1) ?? textBlock());
        if (next !== blocks[quoteAt + 1]) blocks.splice(quoteAt + 1, 0, next);
        after = next.id;
      });
      return after;
    },
    /** Takes several blocks out at once, e.g. the ones picked and cut. */
    removeBlocks: (id: string, blockIds: string[]) =>
      edit(id, ({ blocks }) => {
        for (let index = blocks.length - 1; index >= 0; index--)
          if (blockIds.includes(blocks[index].id)) blocks.splice(index, 1);
      }),
    /**
     * Puts copied blocks (with the saves their quotes show) in a paragraph, in place of `start` to
     * `end` of it: the writing before joins the first copied paragraph, the writing after the last.
     * Returns where the caret goes, at the end of what was put in.
     */
    pasteBlocks: (
      id: string,
      blockId: string,
      start: number,
      end: number,
      pasted: Block[],
      saves: Save[],
    ) => {
      let caret: { blockId: string; at: number } | undefined;
      edit(id, (note) => {
        const { blocks } = note;
        const index = at(blocks, blockId);
        const block = textAt(blocks, index);
        if (!block || !pasted.length) return;
        for (const save of saves) note.quoted[save.id] = save;
        const before = block.text.slice(0, start);
        const after = block.text.slice(end);
        const list = pasted.map((item): Block => ({ ...item, id: newId() }));
        const first = list[0];
        if (first.kind === 'text') first.text = before + first.text;
        else if (before) list.unshift(textBlock(before));
        const last = list[list.length - 1];
        if (last.kind === 'text') {
          caret = { blockId: last.id, at: last.text.length };
          last.text += after;
        } else if (after) {
          const tail = textBlock(after);
          list.push(tail);
          caret = { blockId: tail.id, at: 0 };
        } else caret = { blockId: last.id, at: 0 };
        blocks.splice(index, 1, ...list);
      });
      return caret;
    },
    /**
     * Quotes a save at the end of a note, e.g. from the Library's "Add to note", and saves it at
     * once. False when the note couldn't be loaded or saved.
     */
    appendQuote: async (id: string, save: Save) => {
      if (!drafts[id]) {
        const note = await getNote(id);
        if (!note || note === 'failed') {
          library.showToast({ text: t().notes.addFailed });
          return false;
        }
        track(note);
      }
      edit(id, (note) => {
        const last = note.blocks.at(-1);
        const trailing = last?.kind === 'text' && !last.text.trim();
        note.quoted[save.id] = save;
        note.blocks.splice(
          trailing ? note.blocks.length - 1 : note.blocks.length,
          0,
          quoteBlock(save.id),
        );
      });
      await flush(id);
      if (states[id] !== 'failed') return true;
      library.showToast({ text: t().notes.addFailed });
      return false;
    },
    /**
     * Starts the "/" command after a block (an empty paragraph takes it), or at the end of the
     * note. Returns the paragraph holding it.
     */
    startQuote: (id: string, afterId?: string) => {
      let holder = '';
      edit(id, ({ blocks }) => {
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
  return <NotesContext.Provider value={createNotes()}>{props.children}</NotesContext.Provider>;
}

export function useNotes() {
  const notes = useContext(NotesContext);
  if (!notes) throw new Error('useNotes needs a NotesProvider above it');
  return notes;
}
