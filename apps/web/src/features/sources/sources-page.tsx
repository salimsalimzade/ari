import { Button, HighlightMark, SegmentedControl, SourceAvatar, Tag } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { A, createAsync, revalidate } from '@solidjs/router';
import { createSignal, For, Match, Show, Switch, startTransition } from 'solid-js';
import { AlertIcon, GlobeIcon, SearchIcon } from '~/features/library/icons';
import { useAppleKeyboard } from '~/features/library/keyboard';
import { useLibrary } from '~/features/library/library-store';
import { NotesIcon } from '~/features/shell/icons';
import { MobileHeader } from '~/features/shell/mobile-header';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { ColorDots } from './color-dots';
import { createPagedList } from './paged-list';
import { getSourceCounts, getSourcePage, type SourcePage } from './queries';
import { type SourceKind, type SourceSummary, useKindLabel, useSaveDate } from './sources';
import styles from './sources.module.scss';

type KindFilter = 'all' | SourceKind;

/** /sources: a card for every website and file in the Library, the latest saved from first. */
export function SourcesPage() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const apple = useAppleKeyboard();
  const [kind, setKind] = createSignal<KindFilter>('all');
  const counts = createAsync(() => getSourceCounts(), { deferStream: true });
  const first = createAsync(() => getSourcePage(kind()), { deferStream: true });

  const total = () => counts()?.all ?? 0;
  const failed = () => !!counts()?.failed || !!first()?.failed;
  const count = () =>
    [
      fill(plural(total(), t().sources.count), { n: format.number(total()) }),
      fill(plural(library.total(), t().sources.saves), { n: format.number(library.total()) }),
    ].join(' · ');
  const searchButton = () => (
    <button
      type="button"
      class={styles['icon-button']}
      aria-label={t().sources.search}
      onClick={() => library.setPaletteOpen(true)}
    >
      <SearchIcon />
    </button>
  );

  return (
    <div class={styles.page}>
      <Title>{t().sources.pageTitle}</Title>
      <MobileHeader actions={<Show when={total()}>{searchButton()}</Show>} />
      <header class={styles.head}>
        <h1 class={styles.title}>{t().sources.title}</h1>
        <Show when={total()}>
          <p class={styles.count}>{count()}</p>
          <button type="button" class={styles.search} onClick={() => library.setPaletteOpen(true)}>
            <SearchIcon />
            <span class={styles['search-text']}>{t().sources.search}</span>
            <kbd class={styles.kbd}>{apple() ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
        </Show>
      </header>
      <Switch>
        <Match when={failed()}>
          <div role="alert" class={styles.state}>
            <span class={styles['state-icon']} data-tone="error">
              <AlertIcon />
            </span>
            <h2 class={styles['state-title']}>{t().sources.loadFailed}</h2>
            <p class={styles['state-text']}>{t().library.loadFailedText}</p>
            <Button
              onClick={() =>
                startTransition(() => revalidate([getSourceCounts.key, getSourcePage.key]))
              }
            >
              {t().library.retry}
            </Button>
          </div>
        </Match>
        <Match when={!total()}>
          <div class={styles.state}>
            <span class={styles['state-icon']}>
              <GlobeIcon />
            </span>
            <h2 class={styles['state-title']}>{t().sources.emptyTitle}</h2>
            <p class={styles['state-text']}>{t().sources.emptyText}</p>
            <Button variant="primary" href="/library" class={styles['state-action']}>
              {t().sources.emptyAction}
            </Button>
          </div>
        </Match>
        <Match when={total()}>
          <SegmentedControl
            size="sm"
            class={styles.kinds}
            label={t().sources.kind}
            value={kind()}
            // The cards stay until ari-api has answered for the new kind.
            onChange={(value) => startTransition(() => setKind(value as KindFilter))}
            options={(['all', 'website', 'file'] as const).map((value) => ({
              value,
              label: fill(t().sources.kindCount, {
                kind: t().sources.kinds[value],
                n: format.number(counts()?.[value] ?? 0),
              }),
            }))}
          />
          <SourceGrid first={first} next={(cursor) => getSourcePage(kind(), cursor)} />
        </Match>
      </Switch>
    </div>
  );
}

// The cards, more as the end of the grid nears the screen.
function SourceGrid(props: {
  first: () => SourcePage | undefined;
  next: (cursor: string) => Promise<SourcePage>;
}) {
  const { t } = useI18n();
  const list = createPagedList({
    first: () => props.first(),
    items: (page) => page.sources,
    next: (cursor) => props.next(cursor),
  });

  return (
    <>
      <Show
        when={list.items().length}
        fallback={<p class={styles.none}>{t().sources.noneOfKind}</p>}
      >
        <ul class={styles.grid}>
          <For each={list.items()}>
            {(summary) => (
              <li>
                <SourceCard summary={summary} />
              </li>
            )}
          </For>
          <Show when={list.loadingMore()}>
            <For each={[1, 2, 3]}>
              {() => (
                <li aria-hidden="true">
                  <span class={styles.skeleton} data-shape="card">
                    <span class={styles.bone} data-shape="badge" />
                    <span class={styles.bone} />
                    <span class={styles.bone} data-shape="short" />
                  </span>
                </li>
              )}
            </For>
          </Show>
        </ul>
      </Show>
      <Show when={list.loadingMore()}>
        <p role="status" class={styles['visually-hidden']}>
          {t().sources.loadingMore}
        </p>
      </Show>
      <Show when={list.loadFailed()}>
        <p role="alert" class={styles['end-note']}>
          {t().sources.moreFailed}{' '}
          <button type="button" class={styles['text-button']} onClick={list.loadMore}>
            {t().library.retry}
          </button>
        </p>
      </Show>
      <div ref={list.sentinel} />
    </>
  );
}

function SourceCard(props: { summary: SourceSummary }) {
  const { t } = useI18n();
  const format = useFormat();
  const saveDate = useSaveDate();
  const kindLabel = useKindLabel();
  const source = () => props.summary.source;
  // A website's host; a file's import date.
  const site = () =>
    source()
      .url?.replace(/^https?:\/\//, '')
      .split('/')[0] ?? fill(t().sources.imported, { date: saveDate(props.summary.firstSavedAt) });

  return (
    <A href={`/sources/${source().id}`} class={styles.card}>
      <span class={styles['card-head']}>
        <SourceAvatar
          initial={source().name.charAt(0).toUpperCase()}
          size="lg"
          class={source().kind === 'file' ? styles['file-avatar'] : undefined}
        />
        <span class={styles['card-name']}>
          <span class={styles['card-publisher']}>{source().name}</span>
          <span class={styles['card-site']}>{site()}</span>
        </span>
        <Tag tone="neutral">{kindLabel(source())}</Tag>
      </span>
      <span class={styles['card-title']}>{source().title}</span>
      <Show when={props.summary.latest}>
        {(latest) => (
          <span class={styles['card-quote']}>
            <HighlightMark color={latest().color}>{latest().text}</HighlightMark>
          </span>
        )}
      </Show>
      <span class={styles['card-foot']}>
        <ColorDots colors={props.summary.colors} />
        <span class={styles['card-count']}>
          {fill(plural(props.summary.saves, t().library.count), {
            n: format.number(props.summary.saves),
          })}
        </span>
        <span>· {saveDate(props.summary.lastSavedAt)}</span>
        <Show when={props.summary.notes.length}>
          <Tag tone="sage" icon={<NotesIcon />} class={styles['in-note']}>
            {t().sources.inNote}
          </Tag>
        </Show>
      </span>
    </A>
  );
}
