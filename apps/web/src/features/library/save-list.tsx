import { Button, HighlightMark, Tag } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { isToday, isYesterday } from 'date-fns';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from 'solid-js';
import { links } from '~/features/marketing/links';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { ArrowUpIcon, ImageIcon, MessageIcon, SearchIcon } from './icons';
import styles from './library.module.scss';
import { useLibrary } from './library-store';
import type { Save } from './sample';
import { KindIcon, SaveBadge } from './save-badge';

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/**
 * The saves by day, newest first, as rows or as a grid of cards. More load as the end comes into
 * view.
 */
export function SaveList() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  let sentinel!: HTMLDivElement;
  const [nearEnd, setNearEnd] = createSignal(false);

  // The loaded saves by day. The keys are strings, so a day already on the page keeps its nodes.
  const days = createMemo(() => {
    const result = new Map<string, Save[]>();
    for (const save of library.visible()) {
      const key = dayKey(save.savedAt);
      const saves = result.get(key);
      if (saves) saves.push(save);
      else result.set(key, [save]);
    }
    return result;
  });
  // Each day's count across every save the filters let through, not only the loaded ones.
  const dayCounts = createMemo(() => {
    const counts = new Map<string, number>();
    for (const save of library.filtered()) {
      const key = dayKey(save.savedAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  });
  const heading = (date: Date) =>
    isToday(date)
      ? t().library.today
      : isYesterday(date)
        ? t().library.yesterday
        : format.dayHeading(date);

  onMount(() => {
    const observer = new IntersectionObserver(([entry]) => setNearEnd(entry.isIntersecting), {
      rootMargin: '0px 0px 240px 0px',
    });
    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });
  createEffect(() => {
    if (nearEnd() && !library.loadingMore() && library.hasMore()) library.loadMore();
  });

  return (
    <>
      <Show when={library.from()}>
        <button type="button" class={styles.newest} onClick={() => library.jumpTo()}>
          <ArrowUpIcon />
          {t().library.backToNewest}
        </button>
      </Show>
      <For each={[...days().keys()]}>
        {(key) => {
          const saves = () => days().get(key) ?? [];
          const date = () => saves()[0]?.savedAt ?? new Date();
          return (
            <section data-day={date().getTime()}>
              <h2 class={styles['day-heading']}>
                {heading(date())}
                <span class={styles['day-count']}>
                  · {fill(t().library.daySaved, { n: format.number(dayCounts().get(key) ?? 0) })}
                </span>
              </h2>
              <Show
                when={library.view() === 'grid'}
                fallback={<For each={saves()}>{(save) => <SaveRow save={save} />}</For>}
              >
                <div class={styles.cards}>
                  <For each={saves()}>{(save) => <SaveCard save={save} />}</For>
                </div>
              </Show>
            </section>
          );
        }}
      </For>
      <Show when={library.loadingMore()}>
        <div role="status" aria-label={t().library.loadingMore}>
          <For each={[1, 2, 3]}>
            {() => (
              <div class={styles['skeleton-row']} aria-hidden="true">
                <span class={styles.bone} data-shape="badge" />
                <span class={styles['skeleton-lines']}>
                  <span class={styles.bone} data-shape="line" />
                  <span class={styles.bone} data-shape="short" />
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div ref={sentinel} />
      <Show when={!library.hasMore() && library.visible().length > 0}>
        <p class={styles['end-note']}>
          {library.filtered().length < library.saves().length
            ? t().library.endFiltered
            : t().library.endAll}
        </p>
      </Show>
      <Switch>
        <Match when={library.saves().length === 0}>
          <div class={styles.state}>
            <span class={styles['state-icon']}>
              <SearchIcon />
            </span>
            <h2 class={styles['state-title']}>{t().library.emptyTitle}</h2>
            <p class={styles['state-text']}>{t().library.emptyText}</p>
            <Button variant="primary" href={links.chrome}>
              {t().library.emptyAction}
            </Button>
          </div>
        </Match>
        <Match when={library.filtered().length === 0}>
          <div class={styles.state}>
            <span class={styles['state-icon']}>
              <SearchIcon />
            </span>
            <h2 class={styles['state-title']}>{t().library.noResults}</h2>
            <Button onClick={library.clearFacets}>{t().library.clearFilters}</Button>
          </div>
        </Match>
      </Switch>
    </>
  );
}

// "Highlight · Meadow Quarterly", then " · p. 4" on wide screens.
function SaveMeta(props: { save: Save }) {
  const { t } = useI18n();
  return (
    <>
      {t().library.kinds[props.save.kind]} · {props.save.source}
      <Show when={props.save.page}>
        <span class={styles['wide-only']}> · {props.save.page}</span>
      </Show>
    </>
  );
}

function SaveRow(props: { save: Save }) {
  const { t } = useI18n();
  const library = useLibrary();
  return (
    <A
      href={`/library/${props.save.id}`}
      class={styles.row}
      data-save={props.save.id}
      data-picked={library.picked() === props.save.id ? '' : undefined}
    >
      <SaveBadge save={props.save} />
      <span class={styles['row-text']}>
        <span class={styles.excerpt} data-kind={props.save.kind}>
          {props.save.text}
        </span>
        <span class={styles.meta}>
          <span>
            <SaveMeta save={props.save} />
          </span>
          <Show when={props.save.isNew}>
            <Tag tone="accent">{t().library.new}</Tag>
          </Show>
          <For each={props.save.tags}>
            {(tag) => (
              <Tag tone="neutral" class={styles['wide-only']}>
                {tag}
              </Tag>
            )}
          </For>
          <Show when={props.save.comment}>
            <span class={`${styles['comment-mark']} ${styles['wide-only']}`}>
              <MessageIcon />
              {t().library.comment}
            </span>
          </Show>
        </span>
      </span>
    </A>
  );
}

function SaveCard(props: { save: Save }) {
  return (
    <A href={`/library/${props.save.id}`} class={styles.card} data-save={props.save.id}>
      <Switch>
        <Match when={props.save.kind !== 'clip'}>
          <span class={styles['card-quote']}>
            <HighlightMark color={props.save.color ?? 'yellow'}>{props.save.text}</HighlightMark>
          </span>
        </Match>
        <Match when={props.save.clip === 'table'}>
          <span class={styles['card-table']} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span class={styles['card-title']}>{props.save.text}</span>
        </Match>
        <Match when={props.save.clip === 'image'}>
          <span class={styles['card-image']} aria-hidden="true">
            <ImageIcon />
          </span>
          <span class={styles['card-title']}>{props.save.text}</span>
        </Match>
      </Switch>
      <span class={styles['card-meta']}>
        <KindIcon save={props.save} />
        <span class={styles['card-source']}>
          {props.save.source}
          <Show when={props.save.page}> · {props.save.page}</Show>
        </span>
      </span>
    </A>
  );
}
