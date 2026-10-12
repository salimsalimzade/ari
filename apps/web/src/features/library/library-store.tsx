import { type HighlightColor, highlightColors } from '@ari/ui-kit';
import { endOfDay, endOfMonth, startOfToday } from 'date-fns';
import {
  batch,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  useContext,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import {
  type ImportFile,
  type ImportMark,
  type Save,
  type SaveKind,
  type Source,
  sampleImports,
  sampleMarks,
  sampleSaves,
  sampleSources,
} from './sample';

export type LibraryView = 'list' | 'grid';
export type TypeFilter = 'all' | SaveKind;
export type Facet = 'tags' | 'colors' | 'sources';

const firstPage = 40;
const nextPage = 30;
/** The free trial's upload space and its limit per file, in megabytes. */
export const trialMegabytes = 50;
export const fileLimitMegabytes = 5;
// What the account had used before this visit; ari-api will report it.
const usedBefore = 18.4;
const importable = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'gif'];
export const importAccept = '.pdf,.doc,.docx,image/*';

export type UploadSpace = {
  used: number;
  /** Being uploaded or read now. */
  pending: number;
  left: number;
  /** low from 80% used, full when nothing fits. */
  tone: 'ok' | 'low' | 'full';
};

export type Toast = { text: string /** Offers "Show only this file" for it. */; source?: string };

const isBusy = (file: ImportFile) => file.status === 'uploading' || file.status === 'reading';
const megabytesOf = (files: ImportFile[]) => files.reduce((sum, file) => sum + file.megabytes, 0);

/**
 * The Library, its imports and what the page shows of them. Everything stays in the page until
 * ari-api has the endpoints; it starts from the design's example library (`sample.ts`).
 */
function createLibrary(openFilePicker: () => void) {
  // — Saves and their sources —

  const [saves, setSaves] = createSignal(sampleSaves());
  const [sources, setSources] = createStore<Record<string, Source>>({ ...sampleSources });

  // — What the Library page shows —

  const [filters, setFilters] = createStore({
    type: 'all' as TypeFilter,
    tags: [] as string[],
    colors: [] as string[],
    sources: [] as string[],
  });
  const [view, setView] = createSignal<LibraryView>('list');
  // The list starts from this moment back; undefined starts at the newest save.
  const [from, setFrom] = createSignal<Date>();
  const [shown, setShown] = createSignal(firstPage);
  const [loadingMore, setLoadingMore] = createSignal(false);
  // A save to tint after the palette jumps to it.
  const [picked, setPicked] = createSignal<string>();
  // Goes up each time the list starts over, so the page can scroll back to its top.
  const [restarts, setRestarts] = createSignal(0);
  let loadTimer: ReturnType<typeof setTimeout> | undefined;

  const matching = createMemo(() =>
    saves().filter(
      (save) =>
        (!filters.tags.length || filters.tags.some((tag) => save.tags.includes(tag))) &&
        (!filters.colors.length || (!!save.color && filters.colors.includes(save.color))) &&
        (!filters.sources.length || filters.sources.includes(save.source)),
    ),
  );
  const counts = createMemo(() => {
    const result: Record<TypeFilter, number> = { all: 0, highlight: 0, clip: 0, import: 0 };
    for (const save of matching()) {
      result.all++;
      result[save.kind]++;
    }
    return result;
  });
  const filtered = createMemo(() =>
    filters.type === 'all' ? matching() : matching().filter((save) => save.kind === filters.type),
  );
  const fromStart = createMemo(() => {
    const start = from();
    return start ? filtered().filter((save) => save.savedAt <= start) : filtered();
  });
  const visible = createMemo(() => fromStart().slice(0, shown()));
  const hasMore = () => visible().length < fromStart().length;

  // Each facet's values across the whole Library, most used first, with how many saves have them.
  const facetOptions = createMemo(() => {
    const tags = new Map<string, number>();
    const colors = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const add = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
    for (const save of saves()) {
      for (const tag of save.tags) add(tags, tag);
      if (save.color) add(colors, save.color);
      add(sourceCounts, save.source);
    }
    const byCount = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1]);
    return {
      tags: byCount(tags),
      colors: highlightColors.map((color): [string, number] => [color, colors.get(color) ?? 0]),
      sources: byCount(sourceCounts),
    } satisfies Record<Facet, [string, number][]>;
  });

  const restart = () => {
    clearTimeout(loadTimer);
    batch(() => {
      setLoadingMore(false);
      setShown(firstPage);
      setFrom(undefined);
      setPicked(undefined);
      setRestarts((count) => count + 1);
    });
  };
  const setAllFilters = (next: Partial<typeof filters>) => {
    setFilters({ type: 'all', tags: [], colors: [], sources: [], ...next });
    restart();
  };

  // — Imports —

  const [files, setFiles] = createStore<ImportFile[]>(sampleImports());
  const [trayHidden, setTrayHidden] = createSignal(false);
  const updateFile = (id: string, change: (file: ImportFile) => void) =>
    setFiles((file) => file.id === id, produce(change));

  const space = createMemo<UploadSpace>(() => {
    const thisVisit = files.filter((file) => !file.seeded);
    const used = usedBefore + megabytesOf(thisVisit.filter((file) => file.status === 'saved'));
    const pending = megabytesOf(
      thisVisit.filter((file) => isBusy(file) || file.status === 'ready'),
    );
    const left = Math.max(0, trialMegabytes - used - pending);
    const tone = left < 0.05 ? 'full' : (used + pending) / trialMegabytes >= 0.8 ? 'low' : 'ok';
    return { used, pending, left, tone };
  });

  // Files from this visit (and retried ones) until they're saved: the tray and pill show them.
  const session = createMemo(() =>
    files.filter(
      (file) =>
        (!file.seeded || file.retried) &&
        (isBusy(file) || file.status === 'ready' || file.status === 'rejected'),
    ),
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
        seeded: false,
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
              const seed = Math.round(file.megabytes * 7);
              file.marks = sampleMarks(2 + (Math.round(file.megabytes * 10) % 9), seed);
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
  const showToast = (next: Toast) => {
    clearTimeout(toastTimer);
    setToast(next);
    toastTimer = setTimeout(() => setToast(undefined), 9000);
  };

  // — Search palette —

  const [paletteOpen, setPaletteOpen] = createSignal(false);

  onCleanup(() => {
    clearTimeout(loadTimer);
    clearTimeout(toastTimer);
  });

  return {
    saves,
    sources,
    sourceOf: (name: string): Source => sources[name] ?? { name, title: name },
    setColor: (id: string, color: HighlightColor) =>
      setSaves((list) => list.map((save) => (save.id === id ? { ...save, color } : save))),
    setComment: (id: string, comment: string) =>
      setSaves((list) => list.map((save) => (save.id === id ? { ...save, comment } : save))),
    deleteSave: (id: string) => setSaves((list) => list.filter((save) => save.id !== id)),

    filters,
    counts,
    facetOptions,
    /** Every save the filters let through, newest first. */
    filtered,
    /** The saves on the page now. */
    visible,
    hasMore,
    loadingMore,
    from,
    picked,
    restarts,
    view,
    setView,
    setType: (type: TypeFilter) => {
      setFilters('type', type);
      restart();
    },
    toggleFacet: (facet: Facet, value: string) => {
      setFilters(facet, (values) =>
        values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      );
      restart();
    },
    /** Tags, colors and sources; the type tab stays. */
    clearFacets: () => setAllFilters({ type: filters.type }),
    clearFilters: () => setAllFilters({}),
    showSource: (source: string) => setAllFilters({ sources: [source] }),
    filterByTag: (tag: string) => {
      setFilters('tags', [tag]);
      restart();
    },
    /** Starts the list at the end of `month`; undefined goes back to the newest saves. */
    jumpTo: (month?: Date) => {
      restart();
      setFrom(month && endOfMonth(month));
    },
    /** Shows the list from a save's day, with the save tinted. */
    reveal: (save: Save) => {
      setAllFilters({});
      setView('list');
      setFrom(endOfDay(save.savedAt));
      setPicked(save.id);
    },
    // Stands in for fetching the next page from ari-api.
    loadMore: () => {
      if (loadingMore() || !hasMore()) return;
      setLoadingMore(true);
      loadTimer = setTimeout(() => {
        batch(() => {
          setLoadingMore(false);
          setShown((count) => count + nextPage);
        });
      }, 700);
    },

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
        file.retried = true;
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
      const saveOf = (mark: ImportMark): Save => ({
        id: `${file.id}-${mark.id}`,
        kind: mark.type === 'handwritten' ? 'clip' : 'import',
        color: mark.type === 'handwritten' ? undefined : (details.color ?? mark.color),
        clip: mark.type === 'handwritten' ? 'image' : undefined,
        text: mark.text,
        tags: tag ? [tag] : [],
        comment: mark.comment ?? '',
        savedAt,
        source: file.name,
        page: mark.page,
        isNew: true,
      });
      const adding = file.marks.filter((mark) => mark.on && !mark.saved);
      const removing = new Set(
        file.marks.filter((mark) => !mark.on && mark.saved).map((mark) => `${file.id}-${mark.id}`),
      );
      batch(() => {
        setSources(file.name, {
          name: file.name,
          title: details.title.trim() || file.name,
          author: details.author.trim() || undefined,
        });
        setSaves((list) => [
          ...adding.map(saveOf),
          ...list.filter((save) => !removing.has(save.id)),
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
      return { edit, added: adding.length, removed: removing.size, source: file.name };
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
