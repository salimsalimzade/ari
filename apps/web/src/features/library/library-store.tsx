import type { HighlightColor } from '@ari/ui-kit';
import { createAsync, revalidate, useAction } from '@solidjs/router';
import { endOfDay, endOfMonth, startOfToday } from 'date-fns';
import {
  batch,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  on,
  onCleanup,
  startTransition,
  useContext,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { isServer } from 'solid-js/web';
import { getMe } from '~/features/auth/queries';
import { useI18n } from '~/i18n/i18n';
import { type ImportFile, type ImportMark, standInMarks } from './imports';
import {
  changeSaveAction,
  deleteSaveAction,
  getSaveFacets,
  getSavePage,
  type SaveFilter,
  type SavePage,
} from './queries';
import type { Facets, Save, SaveKind } from './saves';

export type LibraryView = 'list' | 'grid';
export type TypeFilter = 'all' | SaveKind;
export type Facet = 'tags' | 'colors' | 'sources';

/** The free trial's upload space and its limit per file, in megabytes. */
export const trialMegabytes = 50;
export const fileLimitMegabytes = 5;
const importable = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'gif'];
export const importAccept = '.pdf,.doc,.docx,image/*';
// ari-api's page size: a month jump loads until at least this many saves are in view.
const pageSize = 40;
// How long a comment waits for more typing before it is saved.
const commentDelay = 700;

export type UploadSpace = {
  used: number;
  /** Being uploaded or read now. */
  pending: number;
  left: number;
  /** low from 80% used, full when nothing fits. */
  tone: 'ok' | 'low' | 'full';
};

export type Toast = {
  text: string;
  /** Offers "Show only this file" for this source's id. */
  source?: string;
};

const noFilter: SaveFilter = { type: 'all', tags: [], colors: [], sources: [], q: '' };
const noCounts: Facets['counts'] = { all: 0, highlight: 0, clip: 0, import: 0 };

const isBusy = (file: ImportFile) => file.status === 'uploading' || file.status === 'reading';
const megabytesOf = (files: ImportFile[]) => files.reduce((sum, file) => sum + file.megabytes, 0);

// Values worked out from others: memos in the browser, plain functions on the server, where a
// memo is worked out once, before the Library has loaded.
export const derive = <T,>(fn: () => T) => (isServer ? fn : createMemo(fn));

/** Whether a save matches the filters, for the ones this page made (imports) and no page has. */
function matches(save: Save, filter: SaveFilter) {
  const tags = filter.tags.map((tag) => tag.toLowerCase());
  const q = filter.q.trim().toLowerCase();
  return (
    (!q || save.text.toLowerCase().includes(q)) &&
    (filter.type === 'all' || save.kind === filter.type) &&
    (!tags.length || save.tags.some((tag) => tags.includes(tag.toLowerCase()))) &&
    (!filter.colors.length || (!!save.color && filter.colors.includes(save.color))) &&
    (!filter.sources.length || filter.sources.includes(save.source.id))
  );
}

/** Newest first, each save once. */
function newestFirst(saves: Save[]) {
  const seen = new Set<string>();
  return saves
    .filter((save) => !seen.has(save.id) && seen.add(save.id))
    .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
}

/**
 * The Library from ari-api: the first page of saves for the filters renders on the server, more
 * load as the list asks. Changes show at once and go to ari-api; one that fails is undone with a
 * toast. Imports stay in the page (`imports.ts`) until ari-api reads files.
 */
function createLibrary(openFilePicker: () => void) {
  const { t } = useI18n();

  // — What the Library page shows —

  const [filters, setFilters] = createStore<SaveFilter>({ ...noFilter });
  // A copy for ari-api: a new object each time the filters change.
  const filter = derive(
    (): SaveFilter => ({
      type: filters.type,
      tags: [...filters.tags],
      colors: [...filters.colors],
      sources: [...filters.sources],
      q: filters.q,
    }),
  );
  const [view, setView] = createSignal<LibraryView>('list');
  // The list starts from this moment back; undefined starts at the newest save.
  const [from, setFrom] = createSignal<Date>();
  // A save to tint after the palette jumps to it.
  const [picked, setPicked] = createSignal<string>();
  // Goes up each time the list starts over, so the page can scroll back to its top.
  const [restarts, setRestarts] = createSignal(0);

  // — Saves, from ari-api —

  // The first page for the filters, and the Library's own first page for search, Sources and
  // notes (the same request while nothing is filtered).
  const first = createAsync(() => getSavePage(filter()), { deferStream: true });
  const newest = createAsync(() => getSavePage(noFilter), { deferStream: true });
  const facets = createAsync(() => getSaveFacets(filter()), { deferStream: true });
  const me = createAsync(() => getMe());
  const [more, setMore] = createSignal<SavePage[]>([]);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [loadFailed, setLoadFailed] = createSignal(false);
  // Changes made since the pages loaded, and deletions; ari-api has them, or is getting them.
  const [edits, setEdits] = createStore<Record<string, Partial<Save>>>({});
  const [deleted, setDeleted] = createSignal<ReadonlySet<string>>(new Set());
  // Saved from imports during this visit; only this page has them.
  const [imported, setImported] = createSignal<Save[]>([]);

  const withChanges = (save: Save): Save =>
    edits[save.id] ? { ...save, ...edits[save.id] } : save;
  const kept = (saves: Save[]) => {
    const gone = deleted();
    return saves.filter((save) => !gone.has(save.id)).map(withChanges);
  };

  /** Every save loaded for the filters, newest first, with this visit's changes. */
  const loaded = derive(() =>
    kept(
      newestFirst([
        ...imported().filter((save) => matches(save, filter())),
        ...[first(), ...more()].flatMap((page) => page?.saves ?? []),
      ]),
    ),
  );
  /** Every save this page knows: what search, Sources and the notes look through. */
  const saves = derive(() =>
    kept(newestFirst([...imported(), ...(newest()?.saves ?? []), ...loaded()])),
  );
  const visible = derive(() => {
    const start = from();
    return start ? loaded().filter((save) => save.savedAt <= start) : loaded();
  });
  const nextCursor = () => (more().at(-1) ?? first())?.nextCursor;

  // A page that arrives after the filters changed belongs to the old list.
  let generation = 0;
  createEffect(
    on(
      filter,
      () => {
        generation++;
        batch(() => {
          setMore([]);
          setLoadingMore(false);
          setLoadFailed(false);
        });
      },
      { defer: true },
    ),
  );
  const loadMore = async () => {
    const cursor = nextCursor();
    if (!cursor || loadingMore()) return;
    const current = generation;
    setLoadingMore(true);
    setLoadFailed(false);
    const page = await getSavePage(filter(), cursor);
    if (current !== generation) return;
    batch(() => {
      if (page.failed) setLoadFailed(true);
      else setMore((pages) => [...pages, page]);
      setLoadingMore(false);
    });
  };
  // ari-api can't start a page at a date, so a jump back loads pages until the month is there.
  createEffect(() => {
    if (from() && nextCursor() && !loadingMore() && !loadFailed() && visible().length < pageSize)
      void loadMore();
  });

  const restart = () =>
    batch(() => {
      setFrom(undefined);
      setPicked(undefined);
      setRestarts((count) => count + 1);
    });
  // In a transition: the list stays as it is until ari-api has answered for the new filters.
  const refilter = (change: () => void) =>
    startTransition(() => {
      change();
      restart();
    });
  const setAllFilters = (next: Partial<SaveFilter>) =>
    refilter(() => setFilters({ ...noFilter, ...next }));

  // — Changing and deleting —

  const change = useAction(changeSaveAction);
  const remove = useAction(deleteSaveAction);
  // A comment is saved once the typing stops; what it was before, in case ari-api says no.
  const commentTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const commentsBefore = new Map<string, Partial<Save>>();

  /** Sends a change already on the page; puts back `before` when ari-api says no. */
  const send = (id: string, before: Partial<Save>, request: () => Promise<unknown>) =>
    void request().catch(() => {
      setEdits(
        produce((all) => {
          all[id] = before;
        }),
      );
      showToast({ text: t().library.changeFailed });
    });

  // — Imports —

  const [files, setFiles] = createStore<ImportFile[]>([]);
  const [trayHidden, setTrayHidden] = createSignal(false);
  const updateFile = (id: string, change: (file: ImportFile) => void) =>
    setFiles((file) => file.id === id, produce(change));

  const space = createMemo<UploadSpace>(() => {
    const used = megabytesOf(files.filter((file) => file.status === 'saved'));
    const pending = megabytesOf(files.filter((file) => isBusy(file) || file.status === 'ready'));
    const left = Math.max(0, trialMegabytes - used - pending);
    const tone = left < 0.05 ? 'full' : (used + pending) / trialMegabytes >= 0.8 ? 'low' : 'ok';
    return { used, pending, left, tone };
  });

  // Files until they're saved: the tray and pill show them.
  const session = createMemo(() =>
    files.filter((file) => isBusy(file) || file.status === 'ready' || file.status === 'rejected'),
  );

  const addFiles = (list: FileList | File[] | null | undefined) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    let left = space().left;
    const added = picked.map((file, index): ImportFile => {
      const megabytes = file.size / 1048576;
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const base = {
        id: `u${Date.now()}-${index}`,
        name: file.name,
        megabytes,
        progress: 0,
        title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        author: '',
      };
      if (!importable.includes(extension)) return { ...base, status: 'rejected', rejected: 'type' };
      if (megabytes > fileLimitMegabytes)
        return { ...base, status: 'rejected', rejected: 'tooBig' };
      if (megabytes > left)
        return { ...base, status: 'rejected', rejected: 'noSpace', spaceLeft: left };
      left -= megabytes;
      return { ...base, status: 'uploading' };
    });
    batch(() => {
      setFiles((list) => [...added, ...list]);
      setTrayHidden(false);
    });
  };

  // Stands in for the upload and for ari-api reading the file: a few seconds each.
  const tick = () =>
    setFiles(
      produce((list) => {
        for (const file of list) {
          if (file.status === 'uploading') {
            file.progress += Math.max(4, 22 / Math.max(0.3, file.megabytes));
            if (file.progress >= 100) {
              file.status = 'reading';
              file.progress = 0;
            }
          } else if (file.status === 'reading') {
            file.progress = Math.min(100, file.progress + 7);
            if (file.progress === 100 && file.megabytes === 0) file.status = 'failed';
            else if (file.progress === 100) {
              file.status = 'ready';
              file.marks = standInMarks();
            }
          }
        }
      }),
    );
  createEffect(() => {
    if (!files.some(isBusy)) return;
    const timer = setInterval(tick, 250);
    onCleanup(() => clearInterval(timer));
  });

  // — Toast —

  const [toast, setToast] = createSignal<Toast>();
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  function showToast(next: Toast) {
    clearTimeout(toastTimer);
    setToast(next);
    toastTimer = setTimeout(() => setToast(undefined), 9000);
  }

  // — Search palette —

  const [paletteOpen, setPaletteOpen] = createSignal(false);

  onCleanup(() => {
    clearTimeout(toastTimer);
    for (const timer of commentTimers.values()) clearTimeout(timer);
  });

  return {
    /** Every save this page knows, newest first: search, Sources and notes look through them. */
    saves,
    /** How many saves the Library has, from the signed-in user. */
    total: () => me()?.savesCount ?? 0,
    withChanges,
    /** Deleted during this visit; ari-api has it gone, or is getting there. */
    isDeleted: (id: string) => deleted().has(id),
    /** A source's name from the saves known, or the filters' choices. */
    sourceName: (id: string) =>
      saves().find((save) => save.source.id === id)?.source.name ??
      facets()?.sources.find((source) => source.value === id)?.name ??
      '',
    setColor: (id: string, color: HighlightColor) => {
      const before = { ...edits[id] };
      setEdits(id, (current) => ({ ...current, color }));
      send(id, before, () =>
        change(id, { color: color.toUpperCase() as Uppercase<HighlightColor> }),
      );
    },
    setComment: (id: string, comment: string) => {
      if (!commentTimers.has(id)) commentsBefore.set(id, { ...edits[id] });
      setEdits(id, (current) => ({ ...current, comment }));
      clearTimeout(commentTimers.get(id));
      commentTimers.set(
        id,
        setTimeout(() => {
          const before = commentsBefore.get(id) ?? {};
          commentTimers.delete(id);
          commentsBefore.delete(id);
          send(id, before, () => change(id, { comment }));
        }, commentDelay),
      );
    },
    /** Takes the save off the page at once; it comes back with a toast when ari-api says no. */
    deleteSave: (id: string) => {
      setDeleted((ids) => new Set(ids).add(id));
      if (imported().some((save) => save.id === id)) return;
      void remove(id).catch(() => {
        setDeleted((ids) => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
        showToast({ text: t().library.deleteFailed });
      });
    },

    filters,
    /** The first page for the filters didn't load. */
    failed: () => !!first()?.failed,
    /** Loads the first page again after it failed. */
    reload: () => startTransition(() => revalidate([getSavePage.key, getSaveFacets.key])),
    /** Whether tags, colors or sources are picked, or a search is on. */
    narrowed: () =>
      !!(filters.tags.length || filters.colors.length || filters.sources.length || filters.q),
    counts: () => facets()?.counts ?? noCounts,
    facetOptions: (facet: Facet) => facets()?.[facet] ?? [],
    /** The saves loaded for the filters, newest first. */
    loaded,
    /** The saves on the page now: those loaded, from the month jumped to. */
    visible,
    hasMore: () => !!nextCursor(),
    loadingMore,
    loadFailed,
    loadMore,
    from,
    picked,
    restarts,
    view,
    setView,
    setType: (type: TypeFilter) => refilter(() => setFilters('type', type)),
    toggleFacet: (facet: Facet, value: string) =>
      refilter(() =>
        setFilters(facet, (values: string[]) =>
          values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
        ),
      ),
    /** Tags, colors, sources and the search; the type tab stays. */
    clearFacets: () => setAllFilters({ type: filters.type }),
    /** Shows only what a search finds, through ari-api. */
    search: (q: string) => setAllFilters({ q: q.trim() }),
    clearSearch: () => refilter(() => setFilters('q', '')),
    clearFilters: () => setAllFilters({}),
    /** Shows only the saves from a source, by its id. */
    showSource: (source: string) => setAllFilters({ sources: [source] }),
    filterByTag: (tag: string) => refilter(() => setFilters('tags', [tag])),
    /** Starts the list at the end of `month`; undefined goes back to the newest saves. */
    jumpTo: (month?: Date) => {
      restart();
      setFrom(month && endOfMonth(month));
    },
    /**
     * Shows the list from a save's day, with the save tinted. All in one transition: a
     * transition runs a moment later, so a restart in its own would undo the day and the tint.
     */
    reveal: (save: Save) =>
      startTransition(() => {
        setFilters({ ...noFilter });
        restart();
        setView('list');
        setFrom(endOfDay(save.savedAt));
        setPicked(save.id);
      }),

    files,
    space,
    session,
    trayHidden,
    setTrayHidden,
    addFiles,
    pickFiles: () => {
      if (space().tone !== 'full') openFilePicker();
    },
    retry: (id: string) =>
      updateFile(id, (file) => {
        file.status = 'reading';
        file.progress = 0;
      }),
    dismiss: (id: string) =>
      updateFile(id, (file) => {
        file.status = 'dismissed';
      }),
    discard: (id: string) =>
      updateFile(id, (file) => {
        file.status = 'discarded';
      }),
    toggleMark: (fileId: string, markId: number) =>
      updateFile(fileId, (file) => {
        const mark = file.marks?.find((item) => item.id === markId);
        if (mark) mark.on = !mark.on;
      }),
    setMarks: (fileId: string, markIds: number[], on: boolean) =>
      updateFile(fileId, (file) => {
        for (const mark of file.marks ?? []) if (markIds.includes(mark.id)) mark.on = on;
      }),
    /** Undoes unsaved ticks on a saved file's review. */
    resetMarks: (fileId: string) =>
      updateFile(fileId, (file) => {
        for (const mark of file.marks ?? []) mark.on = !!mark.saved;
      }),
    /**
     * Saves a review: ticked marks join the Library (unticked ones that were saved leave it).
     * Returns what changed, for the toast.
     */
    saveReview: (
      fileId: string,
      details: { title: string; author: string; tag: string; color?: HighlightColor },
    ) => {
      const file = files.find((item) => item.id === fileId);
      if (!file?.marks) return;
      const edit = file.status === 'saved';
      const savedAt = startOfToday();
      const tag = details.tag.trim();
      const source = {
        id: `file:${file.id}`,
        kind: 'file' as const,
        name: file.name,
        title: details.title.trim() || file.name,
        author: details.author.trim() || undefined,
      };
      const saveOf = (mark: ImportMark): Save => ({
        id: `${file.id}-${mark.id}`,
        kind: mark.type === 'handwritten' ? 'clip' : 'import',
        color: mark.type === 'handwritten' ? undefined : (details.color ?? mark.color),
        clip: mark.type === 'handwritten' ? 'image' : undefined,
        text: mark.text,
        tags: tag ? [tag] : [],
        comment: mark.comment ?? '',
        savedAt,
        source,
        page: Number.parseInt(mark.page.replace(/\D/g, ''), 10) || undefined,
        isNew: true,
      });
      const adding = file.marks.filter((mark) => mark.on && !mark.saved);
      const removing = new Set(
        file.marks.filter((mark) => !mark.on && mark.saved).map((mark) => `${file.id}-${mark.id}`),
      );
      batch(() => {
        setImported((list) => [
          ...adding.map(saveOf),
          ...list
            .filter((save) => !removing.has(save.id))
            .map((save) => (save.source.id === source.id ? { ...save, source } : save)),
        ]);
        updateFile(file.id, (item) => {
          item.status = 'saved';
          item.title = details.title;
          item.author = details.author;
          if (!edit) item.savedOn = savedAt;
          for (const mark of item.marks ?? []) mark.saved = mark.on;
          item.kept = item.marks?.filter((mark) => mark.on).length ?? 0;
        });
        if (!edit) setAllFilters({});
      });
      return { edit, added: adding.length, removed: removing.size, source: source.id };
    },

    toast,
    showToast,
    closeToast: () => {
      clearTimeout(toastTimer);
      setToast(undefined);
    },

    paletteOpen,
    setPaletteOpen,
  };
}

type Library = ReturnType<typeof createLibrary>;

const LibraryContext = createContext<Library>();

/** The Library's state for the signed-in pages, and the file picker that imports go through. */
export function LibraryProvider(props: { children: JSX.Element }) {
  let input!: HTMLInputElement;
  const library = createLibrary(() => input.click());
  return (
    <LibraryContext.Provider value={library}>
      {props.children}
      <input
        ref={input}
        type="file"
        multiple
        accept={importAccept}
        hidden
        onChange={(event) => {
          library.addFiles(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
      />
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const library = useContext(LibraryContext);
  if (!library) throw new Error('useLibrary needs a LibraryProvider above it');
  return library;
}
