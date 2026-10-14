import { useNavigate } from '@solidjs/router';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  on,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import type { NoteSummary } from '~/features/notes/notes';
import { useNoteMeta } from '~/features/notes/notes-list';
import { useNotes } from '~/features/notes/notes-store';
import { searchNotes } from '~/features/notes/queries';
import { NotesIcon } from '~/features/shell/icons';
import { searchSources } from '~/features/sources/queries';
import type { SourceSummary } from '~/features/sources/sources';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { ArrowRightIcon, CloseIcon, GlobeIcon, SearchIcon, TagIcon, UploadIcon } from './icons';
import { useLibrary } from './library-store';
import styles from './palette.module.scss';
import { searchSaves } from './queries';
import { SaveBadge } from './save-badge';
import { type Save, usePageLabel } from './saves';

type Result = {
  text: string;
  sub?: string;
  /** Shown in the serif, like a saved quote. */
  quote?: boolean;
  badge: () => JSX.Element;
  run: () => void;
};
type Group = { label: string; count?: string; results: Result[] };

// How long a search waits for more typing before it asks ari-api.
const searchDelay = 250;

// The part of `text` around the first match, so the match shows even in a long quote.
function excerpt(text: string, query: string, max: number) {
  const index = query ? text.toLowerCase().indexOf(query) : -1;
  if (index < 0) return { before: text, match: '', after: '' };
  let start = Math.max(0, index - Math.floor(max / 3));
  if (start > 0) {
    const space = text.lastIndexOf(' ', start);
    start = space > 0 ? space + 1 : 0;
  }
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, index),
    match: text.slice(index, index + query.length),
    after: text.slice(index + query.length),
  };
}

function IconBadge(props: { children: JSX.Element }) {
  return (
    <span class={styles['icon-badge']} aria-hidden="true">
      {props.children}
    </span>
  );
}

/**
 * Search and commands, opened from the Library's search or with ⌘K / Ctrl K on any signed-in page.
 * Arrow keys move, Enter opens, Escape closes.
 */
export function CommandPalette() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const notes = useNotes();
  const noteMeta = useNoteMeta();
  const pageLabel = usePageLabel();
  const navigate = useNavigate();
  let dialog!: HTMLDialogElement;
  const [query, setQuery] = createSignal('');
  const [active, setActive] = createSignal(0);
  const search = () => query().trim().toLowerCase();

  // What ari-api found for a search: saves, sources and notes, each undefined when its request
  // failed. Until it answers, what this page has loaded stands in.
  const [searched, setSearched] = createSignal<{
    q: string;
    saves?: { saves: Save[]; total: number };
    sources?: { sources: SourceSummary[]; more: boolean };
    notes?: NoteSummary[];
  }>();
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on(search, (q) => {
      clearTimeout(searchTimer);
      if (!q) return;
      searchTimer = setTimeout(async () => {
        const [saves, sources, found] = await Promise.all([
          searchSaves(q),
          searchSources(q),
          searchNotes(q),
        ]);
        if (search() === q) setSearched({ q, saves, sources, notes: found });
      }, searchDelay);
    }),
  );
  onCleanup(() => clearTimeout(searchTimer));

  const close = () => library.setPaletteOpen(false);
  const go = (path: string) => {
    close();
    navigate(path);
  };

  const groups = createMemo(() => {
    const q = search();
    const result: Group[] = [];

    // A few saves: the newest without a query, else the first matches (each text once): ari-api's
    // once it has answered, the loaded ones' until then.
    const answers = searched()?.q === q ? searched() : undefined;
    const answer = answers?.saves;
    const found: Save[] = [];
    const seen = new Set<string>();
    let total = 0;
    for (const save of answer ? answer.saves.map(library.withChanges) : library.saves()) {
      const matches =
        !q ||
        !!answer ||
        save.text.toLowerCase().includes(q) ||
        save.source.name.toLowerCase().includes(q) ||
        save.tags.some((tag) => tag.includes(q));
      if (!matches || library.isDeleted(save.id)) continue;
      total++;
      if (!seen.has(save.text) && found.length < (q ? 4 : 3)) {
        seen.add(save.text);
        found.push(save);
      }
      if (!q && found.length === 3) break;
    }
    if (answer) total = answer.total;
    if (found.length)
      result.push({
        label: q ? t().palette.saves : t().palette.recent,
        count: q ? format.number(total) : undefined,
        results: found.map((save) => ({
          text: save.text,
          sub: [t().library.kinds[save.kind], save.source.name, pageLabel(save)]
            .filter(Boolean)
            .join(' · '),
          quote: save.kind !== 'clip',
          badge: () => <SaveBadge save={save} size="sm" />,
          run: () => {
            library.reveal(save);
            go('/library');
          },
        })),
      });
    if (q && total > found.length)
      result.push({
        label: t().palette.allResultsLabel,
        results: [
          {
            text: fill(t().palette.allResults, { q: query().trim(), n: format.number(total) }),
            badge: () => (
              <IconBadge>
                <SearchIcon />
              </IconBadge>
            ),
            run: () => {
              library.search(query());
              go('/library');
            },
          },
        ],
      });

    if (q) {
      // ari-api's sources by name, title or author; until it answers, the Library's by name, or by
      // title when the page knows it.
      const titles = new Map(library.saves().map((save) => [save.source.id, save.source.title]));
      const found = answers?.sources;
      const sources = found
        ? found.sources.map((summary) => ({ value: summary.source.id, name: summary.source.name }))
        : library
            .facetOptions('sources')
            .filter((source) =>
              [source.name ?? '', titles.get(source.value) ?? ''].some((text) =>
                text.toLowerCase().includes(q),
              ),
            );
      if (sources.length)
        result.push({
          label: t().palette.sources,
          count: `${format.number(sources.length)}${found?.more ? '+' : ''}`,
          results: sources.slice(0, 3).map((source) => ({
            text: source.name ?? '',
            sub: t().palette.showSource,
            badge: () => (
              <IconBadge>
                <GlobeIcon />
              </IconBadge>
            ),
            run: () => go(`/sources/${source.value}`),
          })),
        });
    }

    if (q) {
      // ari-api's notes by title and writing, as this page has them now; until it answers, the
      // titles of the notes here.
      const byId = new Map(notes.list().map((note) => [note.id, note]));
      const found = answers?.notes
        ? answers.notes.flatMap((note) => byId.get(note.id) ?? [])
        : notes
            .list()
            .filter((note) => (note.title || t().notes.untitledNote).toLowerCase().includes(q));
      if (found.length)
        result.push({
          label: t().palette.notes,
          count: String(found.length),
          results: found.slice(0, 3).map((note) => ({
            text: note.title.trim() || t().notes.untitledNote,
            sub: noteMeta(note),
            badge: () => (
              <IconBadge>
                <NotesIcon />
              </IconBadge>
            ),
            run: () => go(`/notes/${note.id}`),
          })),
        });
    }

    const actions: Result[] = [
      {
        text: t().palette.importFile,
        badge: () => (
          <IconBadge>
            <UploadIcon />
          </IconBadge>
        ),
        run: () => {
          close();
          library.pickFiles();
        },
      },
      {
        text: t().palette.goToImports,
        badge: () => (
          <IconBadge>
            <ArrowRightIcon />
          </IconBadge>
        ),
        run: () => go('/imports'),
      },
      {
        text: t().palette.goToNotes,
        badge: () => (
          <IconBadge>
            <NotesIcon />
          </IconBadge>
        ),
        run: () => go('/notes'),
      },
      {
        text: t().palette.clearFilters,
        badge: () => (
          <IconBadge>
            <CloseIcon />
          </IconBadge>
        ),
        run: () => {
          library.clearFilters();
          go('/library');
        },
      },
    ].filter((action) => !q || action.text.toLowerCase().includes(q));
    const tags = q
      ? library
          .facetOptions('tags')
          .map((option) => option.value)
          .filter((tag) => tag.toLowerCase().includes(q))
          .map(
            (tag): Result => ({
              text: fill(t().palette.filterTag, { tag }),
              badge: () => (
                <IconBadge>
                  <TagIcon />
                </IconBadge>
              ),
              run: () => {
                library.filterByTag(tag);
                go('/library');
              },
            }),
          )
      : [];
    const commands = [...actions, ...tags].slice(0, q ? 4 : 3);
    if (commands.length) result.push({ label: t().palette.actions, results: commands });
    return result;
  });
  const flat = () => groups().flatMap((group) => group.results);
  const optionId = (index: number) => `palette-option-${index}`;

  createEffect(() => {
    if (library.paletteOpen()) {
      if (dialog.open) return;
      setQuery('');
      setActive(0);
      dialog.showModal();
    } else if (dialog.open) dialog.close();
  });
  // Keeps the active result in view while the arrow keys move through a long list.
  createEffect(() => {
    if (library.paletteOpen())
      document.getElementById(optionId(active()))?.scrollIntoView({ block: 'nearest' });
  });
  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        library.setPaletteOpen(!library.paletteOpen());
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const count = flat().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (count)
        setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : count - 1)) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      flat()[active()]?.run();
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes the dialog by itself
    <dialog
      ref={dialog}
      class={styles.palette}
      aria-label={t().palette.label}
      onClose={close}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog itself.
        if (event.target === dialog) close();
      }}
    >
      <div class={styles.field}>
        <SearchIcon />
        <input
          class={styles.input}
          type="text"
          role="combobox"
          autofocus
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={flat().length ? optionId(active()) : undefined}
          aria-label={t().palette.placeholder}
          placeholder={t().palette.placeholder}
          value={query()}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <kbd class={styles.key} data-wide="">
          esc
        </kbd>
        <button type="button" class={styles.cancel} onClick={close}>
          {t().palette.cancel}
        </button>
      </div>
      <div id="palette-results" role="listbox" class={styles.results}>
        <For each={groups()}>
          {(group) => (
            // biome-ignore lint/a11y/useSemanticElements: a listbox groups its options with role group
            <div role="group" aria-label={group.label}>
              <div class={styles['group-label']} aria-hidden="true">
                {group.label}
                <span class={styles['group-count']}>{group.count}</span>
              </div>
              <For each={group.results}>
                {(result) => {
                  const index = () => flat().indexOf(result);
                  const parts = () => excerpt(result.text, search(), 70);
                  return (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: the input's arrow keys and Enter choose results
                    <div
                      id={optionId(index())}
                      role="option"
                      tabIndex={-1}
                      aria-selected={active() === index()}
                      class={styles.option}
                      onClick={() => result.run()}
                      onMouseMove={() => setActive(index())}
                    >
                      {result.badge()}
                      <span class={styles['option-text']}>
                        <span
                          class={styles['option-title']}
                          data-quote={result.quote ? '' : undefined}
                        >
                          {parts().before}
                          <Show when={parts().match}>
                            <b class={styles.match}>{parts().match}</b>
                          </Show>
                          {parts().after}
                        </span>
                        <Show when={result.sub}>
                          <span class={styles['option-sub']}>{result.sub}</span>
                        </Show>
                      </span>
                    </div>
                  );
                }}
              </For>
            </div>
          )}
        </For>
        <Show when={!flat().length}>
          <p class={styles.empty}>{fill(t().palette.noResults, { q: query().trim() })}</p>
        </Show>
      </div>
      <footer class={styles.footer}>
        <span class={styles.hint}>
          <kbd class={styles.key}>↑↓</kbd>
          {t().palette.move}
        </span>
        <span class={styles.hint}>
          <kbd class={styles.key}>↵</kbd>
          {t().palette.open}
        </span>
        <span class={styles.hint}>
          <kbd class={styles.key}>esc</kbd>
          {t().palette.close}
        </span>
      </footer>
    </dialog>
  );
}
