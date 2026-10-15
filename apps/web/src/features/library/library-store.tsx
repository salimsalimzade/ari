import type { HighlightColor } from '@ari/ui-kit';
import { createAsync, revalidate, useAction } from '@solidjs/router';
import { endOfDay, endOfMonth } from 'date-fns';
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
import { type ImportFile, importAccept, isBusy, isImportable, titleOf, toSpace } from './imports';
import { isPhoto } from './photo-ocr';
import {
  changeSaveAction,
  deleteSaveAction,
  dismissImportAction,
  getImports,
  getSaveFacets,
  getSavePage,
  importPhotoFile,
  retryImportAction,
  type SaveFilter,
  type SavePage,
  uploadFile,
} from './queries';
import type { Facets, Save, SaveKind } from './saves';

export type LibraryView = 'list' | 'grid';
export type TypeFilter = 'all' | SaveKind;
export type Facet = 'tags' | 'colors' | 'sources';

// ari-api's page size: a month jump loads until at least this many saves are in view.
const pageSize = 40;
// How long a comment waits for more typing before it is saved.
const commentDelay = 700;

// How often the Imports list is asked again while ari-api reads a file.
const importPoll = 2000;

/** Upload space in megabytes: what the files take, what is being uploaded now, and the rest. */
export type UploadSpace = {
  used: number;
  /** Being uploaded now. */
  pending: number;
  left: number;
  limit: number;
  /** low from 80% used, full when nothing fits. */
  tone: 'ok' | 'low' | 'full';
};

export type Toast = {
  text: string;
  /** Offers "Show only this file" for this source's id. */
  source?: string;
};

/** The whole Library: no type, tag, color, source or search picked. */
export const noFilter: SaveFilter = { type: 'all', tags: [], colors: [], sources: [], q: '' };
const noCounts: Facets['counts'] = { all: 0, highlight: 0, clip: 0, import: 0 };

const megabytesOf = (files: ImportFile[]) => files.reduce((sum, file) => sum + file.megabytes, 0);

// Values worked out from others: memos in the browser, plain functions on the server, where a
// memo is worked out once, before the Library has loaded.
export const derive = <T,>(fn: () => T) => (isServer ? fn : createMemo(fn));

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
 * toast. Imports come from ari-api too, apart from files still uploading or refused here.
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

  const withChanges = (save: Save): Save =>
    edits[save.id] ? { ...save, ...edits[save.id] } : save;
  const kept = (saves: Save[]) => {
    const gone = deleted();
    return saves.filter((save) => !gone.has(save.id)).map(withChanges);
  };

  /** Every save loaded for the filters, newest first, with this visit's changes. */
  const loaded = derive(() =>
    kept(newestFirst([first(), ...more()].flatMap((page) => page?.saves ?? []))),
  );
  /** Every save this page knows: what search, Sources and the notes look through. */
  const saves = derive(() => kept(newestFirst([...(newest()?.saves ?? []), ...loaded()])));
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

  // ari-api's list, on every signed-in page: the sidebar counts the files ready to review.
  const importList = createAsync(() => getImports());
  // Files this page is uploading or refused; once ari-api has one, its list's copy shows.
  const [uploads, setUploads] = createStore<ImportFile[]>([]);
  // Uploaded during this visit, by ari-api's id: the Library's tray follows them.
  const [uploaded, setUploaded] = createSignal<ReadonlySet<string>>(new Set());
  // Dismissed here, until ari-api's list leaves them out.
  const [dismissed, setDismissed] = createSignal<ReadonlySet<string>>(new Set());
  const [trayHidden, setTrayHidden] = createSignal(false);
  const retryImport = useAction(retryImportAction);
  const dismissImport = useAction(dismissImportAction);
  const refreshImports = () => startTransition(() => revalidate(getImports.key));

  /** This page's uploads first, then ari-api's files, newest first. */
  const files = derive(() => {
    const listed = importList()?.files ?? [];
    const known = new Set(listed.map((file) => file.id));
    const gone = dismissed();
    return [...uploads.filter((file) => !known.has(file.id)), ...listed].filter(
      (file) => !gone.has(file.id),
    );
  });

  const space = derive((): UploadSpace => {
    const { used, limit } = importList()?.space ?? toSpace();
    // Files this page is uploading, or photos it is reading, which take their space once sent.
    const pending = megabytesOf(
      uploads.filter((file) => file.id.startsWith('local-') && file.status !== 'rejected'),
    );
    const left = Math.max(0, limit - used - pending);
    const tone = left < 0.05 ? 'full' : (used + pending) / limit >= 0.8 ? 'low' : 'ok';
    return { used, pending, left, limit, tone };
  });

  // This visit's files until they're reviewed: the tray and pill show them.
  const session = derive(() =>
    files().filter(
      (file) =>
        (uploaded().has(file.id) || uploads.some((upload) => upload.id === file.id)) &&
        (isBusy(file) || file.status === 'ready' || file.status === 'rejected'),
    ),
  );

  // While ari-api reads a file, its list is asked again until it's done. (A photo being read here
  // isn't in ari-api's list yet.)
  createEffect(() => {
    const listed = importList()?.files ?? [];
    if (!listed.some((file) => file.status === 'queued' || file.status === 'reading')) return;
    const timer = setInterval(() => void refreshImports(), importPoll);
    onCleanup(() => clearInterval(timer));
  });

  const progressOf = (localId: string) => (share: number) =>
    setUploads((item) => item.id === localId, 'progress', Math.round(share * 100));

  const uploadOne = async (localId: string, file: File) => {
    const answer = await uploadFile(file, progressOf(localId)).catch(() => ({
      rejected: 'failed' as const,
    }));
    settle(localId, answer);
  };

  // Photos are read one at a time: each reading takes the whole reader.
  let photos = Promise.resolve();
  const readOne = (localId: string, file: File) => {
    photos = photos.then(async () => {
      const answer = await importPhotoFile(file, progressOf(localId)).catch(() => ({
        rejected: 'failed' as const,
      }));
      settle(localId, answer);
    });
  };

  /** ari-api's import takes the place of the file this page sent, or the file shows why not. */
  const settle = (localId: string, answer: Awaited<ReturnType<typeof uploadFile>>) => {
    if ('rejected' in answer) {
      setUploads((item) => item.id === localId, {
        status: 'rejected',
        rejected: answer.rejected,
        spaceLeft: space().left,
      });
      return;
    }
    batch(() => {
      setUploads((item) => item.id === localId, answer);
      setUploaded((ids) => new Set(ids).add(answer.id));
    });
    void refreshImports();
  };

  const addFiles = (list: FileList | File[] | null | undefined) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    let left = space().left;
    const added = picked.map((file, index): ImportFile => {
      const megabytes = file.size / 1048576;
      const base: ImportFile = {
        id: `local-${Date.now()}-${index}`,
        name: file.name,
        megabytes,
        status: 'uploading',
        progress: 0,
        title: titleOf(file.name),
        author: '',
        found: 0,
        kept: 0,
      };
      if (!isImportable(file.name) && !isPhoto(file.name))
        return { ...base, status: 'rejected', rejected: 'type' };
      if (megabytes > left)
        return { ...base, status: 'rejected', rejected: 'noSpace', spaceLeft: left };
      left -= megabytes;
      return base;
    });
    // A photo is read here, and only what is marked on it goes to ari-api.
    const photo = (index: number) =>
      added[index].status === 'uploading' && isPhoto(picked[index].name);
    const listed = added.map(
      (entry, index): ImportFile => (photo(index) ? { ...entry, status: 'reading' } : entry),
    );
    batch(() => {
      setUploads((current) => [...listed, ...current]);
      setTrayHidden(false);
    });
    listed.forEach((entry, index) => {
      if (photo(index)) readOne(entry.id, picked[index]);
      else if (entry.status === 'uploading') void uploadOne(entry.id, picked[index]);
    });
  };

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

    /** Every import not dismissed: this page's uploads, then ari-api's, newest first. */
    files,
    /** The Imports list didn't load. */
    importsFailed: () => !!importList()?.failed,
    space,
    session,
    trayHidden,
    setTrayHidden,
    addFiles,
    pickFiles: () => {
      if (space().tone !== 'full') openFilePicker();
    },
    /** Reads a failed file again. */
    retry: (id: string) =>
      void retryImport(id).catch(() => showToast({ text: t().imports.changeFailed })),
    /** Hides a refused, failed, empty or discarded file. */
    dismiss: (id: string) => {
      if (uploads.some((file) => file.id === id && file.status === 'rejected')) {
        setUploads((list) => list.filter((file) => file.id !== id));
        return;
      }
      setDismissed((ids) => new Set(ids).add(id));
      void dismissImport(id).catch(() => {
        setDismissed((ids) => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
        showToast({ text: t().imports.changeFailed });
      });
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
