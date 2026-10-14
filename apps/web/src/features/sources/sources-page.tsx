import { Button, HighlightMark, SegmentedControl, SourceAvatar, Tag } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { createSignal, For, Show } from 'solid-js';
import { GlobeIcon, SearchIcon } from '~/features/library/icons';
import { useAppleKeyboard } from '~/features/library/keyboard';
import { useLibrary } from '~/features/library/library-store';
import { NotesIcon } from '~/features/shell/icons';
import { MobileHeader } from '~/features/shell/mobile-header';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { ColorDots } from './color-dots';
import {
  type SourceKind,
  type SourceSummary,
  useKindLabel,
  useSaveDate,
  useSources,
} from './sources';
import styles from './sources.module.scss';

type KindFilter = 'all' | SourceKind;

/** /sources: a card for every website and file in the Library, the latest saved from first. */
export function SourcesPage() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const sources = useSources();
  const apple = useAppleKeyboard();
  const [kind, setKind] = createSignal<KindFilter>('all');

  const ofKind = (filter: KindFilter) =>
    filter === 'all' ? sources.list() : sources.list().filter((item) => item.kind === filter);
  const count = () => {
    const total = sources.list().length;
    const saves = library.saves().length;
    return [
      fill(plural(total, t().sources.count), { n: format.number(total) }),
      fill(plural(saves, t().sources.saves), { n: format.number(saves) }),
    ].join(' · ');
  };

  return (
    <div class={styles.page}>
      <Title>{t().sources.pageTitle}</Title>
      <MobileHeader
        actions={
          <Show when={sources.list().length}>
            <button
              type="button"
              class={styles['icon-button']}
              aria-label={t().sources.search}
              onClick={() => library.setPaletteOpen(true)}
            >
              <SearchIcon />
            </button>
          </Show>
        }
      />
      <header class={styles.head}>
        <h1 class={styles.title}>{t().sources.title}</h1>
        <Show when={sources.list().length}>
          <p class={styles.count}>{count()}</p>
          <button type="button" class={styles.search} onClick={() => library.setPaletteOpen(true)}>
            <SearchIcon />
            <span class={styles['search-text']}>{t().sources.search}</span>
            <kbd class={styles.kbd}>{apple() ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
        </Show>
      </header>
      <Show
        when={sources.list().length}
        fallback={
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
        }
      >
        <SegmentedControl
          size="sm"
          class={styles.kinds}
          label={t().sources.kind}
          value={kind()}
          onChange={(value) => setKind(value as KindFilter)}
          options={(['all', 'website', 'file'] as const).map((value) => ({
            value,
            label: fill(t().sources.kindCount, {
              kind: t().sources.kinds[value],
              n: format.number(ofKind(value).length),
            }),
          }))}
        />
        <Show
          when={ofKind(kind()).length}
          fallback={<p class={styles.none}>{t().sources.noneOfKind}</p>}
        >
          <ul class={styles.grid}>
            <For each={ofKind(kind())}>
              {(summary) => (
                <li>
                  <SourceCard summary={summary} />
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}

function SourceCard(props: { summary: SourceSummary }) {
  const { t } = useI18n();
  const format = useFormat();
  const saveDate = useSaveDate();
  const kindLabel = useKindLabel();
  const source = () => props.summary.source;
  const saves = () => props.summary.saves;
  // A website's host; a file's import date.
  const site = () =>
    source()
      .url?.replace(/^https?:\/\//, '')
      .split('/')[0] ??
    fill(t().sources.imported, { date: saveDate(saves()[saves().length - 1].savedAt) });

  return (
    <A href={`/sources/${props.summary.id}`} class={styles.card}>
      <span class={styles['card-head']}>
        <SourceAvatar
          initial={source().name.charAt(0).toUpperCase()}
          size="lg"
          class={props.summary.kind === 'file' ? styles['file-avatar'] : undefined}
        />
        <span class={styles['card-name']}>
          <span class={styles['card-publisher']}>{source().name}</span>
          <span class={styles['card-site']}>{site()}</span>
        </span>
        <Tag tone="neutral">{kindLabel(props.summary)}</Tag>
      </span>
      <span class={styles['card-title']}>{source().title}</span>
      <Show when={props.summary.latest}>
        {(latest) => (
          <span class={styles['card-quote']}>
            <HighlightMark color={latest().color ?? 'yellow'}>{latest().text}</HighlightMark>
          </span>
        )}
      </Show>
      <span class={styles['card-foot']}>
        <ColorDots colors={props.summary.colors} />
        <span class={styles['card-count']}>
          {fill(plural(saves().length, t().library.count), { n: format.number(saves().length) })}
        </span>
        <span>· {saveDate(saves()[0].savedAt)}</span>
        <Show when={props.summary.quoted}>
          <Tag tone="sage" icon={<NotesIcon />} class={styles['in-note']}>
            {t().sources.inNote}
          </Tag>
        </Show>
      </span>
    </A>
  );
}
