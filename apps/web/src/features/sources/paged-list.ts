import { batch, createEffect, createSignal, on, onCleanup, onMount } from 'solid-js';

type Page = { nextCursor?: string; failed?: true };

/**
 * A list ari-api sends a page at a time: `first` is the first page (rendered on the server), and
 * the next ones come from `next` as the element given to `sentinel` nears the screen. The list
 * starts over when `first` changes.
 */
export function createPagedList<P extends Page, T>(options: {
  first: () => P | undefined;
  items: (page: P) => T[];
  next: (cursor: string) => Promise<P>;
}) {
  const [more, setMore] = createSignal<P[]>([]);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [loadFailed, setLoadFailed] = createSignal(false);
  const [nearEnd, setNearEnd] = createSignal(false);
  const nextCursor = () => (more().at(-1) ?? options.first())?.nextCursor;

  // A page that arrives after the list started over belongs to the old list.
  let generation = 0;
  createEffect(
    on(
      options.first,
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
    const page = await options.next(cursor);
    if (current !== generation) return;
    batch(() => {
      if (page.failed) setLoadFailed(true);
      else setMore((pages) => [...pages, page]);
      setLoadingMore(false);
    });
  };

  let sentinel: HTMLElement | undefined;
  onMount(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setNearEnd(entry.isIntersecting), {
      rootMargin: '0px 0px 240px 0px',
    });
    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });
  // Runs again when a page arrives, so a tall screen goes on loading while the end is in view.
  createEffect(() => {
    if (nearEnd() && nextCursor() && !loadingMore() && !loadFailed()) void loadMore();
  });

  return {
    /** Every item loaded so far. */
    items: () =>
      [options.first(), ...more()].flatMap((page) =>
        page && !page.failed ? options.items(page) : [],
      ),
    /** The first page didn't load. */
    failed: () => !!options.first()?.failed,
    hasMore: () => !!nextCursor(),
    loadingMore,
    /** A next page didn't load; `loadMore` tries again. */
    loadFailed,
    loadMore,
    /** For the element right after the list. */
    sentinel: (element: HTMLElement) => {
      sentinel = element;
    },
  };
}
