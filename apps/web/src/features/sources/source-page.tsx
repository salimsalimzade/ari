import {
  Button,
  HighlightMark,
  Menu,
  type MenuItem,
  SegmentedControl,
  SourceAvatar,
  Tag,
} from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { A, createAsync, revalidate, useNavigate } from '@solidjs/router';
import { createSignal, For, Match, Show, Switch, startTransition } from 'solid-js';
import {
  CopyIcon,
  ExternalIcon,
  MessageIcon,
  RetryIcon,
  ScissorsIcon,
} from '~/features/library/icons';
import { useLibrary } from '~/features/library/library-store';
import type { SavePage } from '~/features/library/queries';
import { type Save, usePageLabel } from '~/features/library/saves';
import { MoreIcon } from '~/features/notes/icons';
import { BackIcon, LibraryIcon, NotesIcon } from '~/features/shell/icons';
import { MobileHeader } from '~/features/shell/mobile-header';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { ColorDots } from './color-dots';
import { createPagedList } from './paged-list';
import { getSource, getSourceSaves, type SaveOrder } from './queries';
import { useQuoted } from './quoted';
import { type SourceSummary, spotUrl, useKindLabel, useSaveDate } from './sources';
import styles from './sources.module.scss';

/** /sources/:id: one website or file, with its saves a page at a time. */
export function SourcePage(props: { id: string }) {
  const { t } = useI18n();
  const [order, setOrder] = createSignal<SaveOrder>('page');
  // Both at once, so the server asks ari-api for them side by side.
  const summary = createAsync(() => getSource(props.id), { deferStream: true });
  const first = createAsync(() => getSourceSaves(props.id, order()), { deferStream: true });
  return (
    <Switch
      fallback={
        <div class={styles.missing}>
          <Title>{t().sources.pageTitle}</Title>
          <h1 class={styles['missing-title']}>{t().sources.notFound}</h1>
          <p class={styles['missing-text']}>{t().sources.notFoundText}</p>
          <Button href="/sources" icon={<BackIcon />}>
            {t().sources.back}
          </Button>
        </div>
      }
    >
      <Match when={summary() === 'failed'}>
        <div role="alert" class={styles.missing}>
          <Title>{t().sources.pageTitle}</Title>
          <h1 class={styles['missing-title']}>{t().sources.sourceFailed}</h1>
          <p class={styles['missing-text']}>{t().library.loadFailedText}</p>
          <Button
            icon={<RetryIcon />}
            onClick={() =>
              startTransition(() => revalidate([getSource.keyFor(props.id), getSourceSaves.key]))
            }
          >
            {t().library.retry}
          </Button>
        </div>
      </Match>
      <Match when={summary()}>
        {(found) => (
          <SourceView
            summary={found() as SourceSummary}
            first={first}
            order={order()}
            // The saves stay until ari-api has answered in the new order.
            setOrder={(next) => startTransition(() => setOrder(next))}
          />
        )}
      </Match>
    </Switch>
  );
}

function SourceView(props: {
  summary: SourceSummary;
  first: () => SavePage | undefined;
  order: SaveOrder;
  setOrder: (order: SaveOrder) => void;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const navigate = useNavigate();
  const kindLabel = useKindLabel();
  const quoted = useQuoted();
  const source = () => props.summary.source;
  const list = createPagedList({
    first: () => props.first(),
    items: (page) => page.saves,
    next: (cursor) => getSourceSaves(source().id, props.order, cursor),
  });
  const savedCount = () =>
    fill(plural(props.summary.saves, t().library.count), {
      n: format.number(props.summary.saves),
    });
  // "meadowquarterly.example/honeybees-new-home", without the https://.
  const address = () => source().url?.replace(/^https?:\/\//, '');
  // This visit's color and comment changes, which ari-api has or is getting.
  const saves = () => list.items().map(library.withChanges);

  const savedKinds = () =>
    (['highlight', 'clip', 'import'] as const)
      .flatMap((kind) => {
        const count = props.summary.kinds[kind];
        return count
          ? [fill(plural(count, t().sources.savedKinds[kind]), { n: format.number(count) })]
          : [];
      })
      .join(', ');

  const copyAddress = async () => {
    const url = source().url;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    library.showToast({ text: t().sources.copied });
  };
  const actions = (): MenuItem[][] => [
    [
      {
        label: t().sources.showInLibrary,
        icon: <LibraryIcon />,
        onSelect: () => {
          library.showSource(source().id);
          navigate('/library');
        },
      },
      ...(source().url
        ? [{ label: t().sources.copyAddress, icon: <CopyIcon />, onSelect: copyAddress }]
        : []),
    ],
  ];
  const actionsMenu = () => (
    <Menu
      placement="bottom-end"
      groups={actions()}
      trigger={(triggerProps: object) => (
        <Button
          {...triggerProps}
          iconOnly
          class={styles.more}
          icon={<MoreIcon />}
          aria-label={t().sources.actions}
          title={t().sources.actions}
        />
      )}
    />
  );

  return (
    <div class={styles['source-page']}>
      <Title>{`${source().title} · Ari`}</Title>
      <MobileHeader back={{ href: '/sources', label: t().sources.back }} actions={actionsMenu()} />
      <nav class={styles.bar} aria-label={t().sources.title}>
        <Button href="/sources" icon={<BackIcon />}>
          {t().sources.back}
        </Button>
        <span class={styles['bar-actions']}>
          {actionsMenu()}
          <Show when={source().url}>
            {(url) => (
              <Button variant="primary" href={url()} newTab icon={<ExternalIcon />}>
                {t().sources.openSource}
              </Button>
            )}
          </Show>
        </span>
      </nav>
      <header class={styles.hero}>
        <SourceAvatar
          initial={source().name.charAt(0).toUpperCase()}
          size="xl"
          class={`${styles['hero-avatar']} ${source().kind === 'file' ? styles['file-avatar'] : ''}`}
        />
        <p class={styles.kicker}>
          <span class={styles['kicker-name']}>{source().name}</span>
          <span class={styles['wide-only']}> · {kindLabel(source())}</span>
          <span class={styles['phone-only']}>{savedCount()}</span>
        </p>
        <h1 class={styles['hero-title']}>{source().title}</h1>
        <p class={styles.byline}>
          {[
            source().author,
            fill(t().sources.firstSaved, { date: format.date(props.summary.firstSavedAt) }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>
      <Show when={source().url}>
        {(url) => (
          <div class={styles['phone-open']}>
            <Button variant="primary" size="lg" block href={url()} newTab icon={<ExternalIcon />}>
              {t().sources.openSource}
            </Button>
          </div>
        )}
      </Show>
      <div class={styles.body}>
        <section class={styles.saves} aria-labelledby="source-saves">
          <div class={styles['saves-head']}>
            <h2 id="source-saves" class={styles['saves-count']}>
              {fill(plural(props.summary.saves, t().sources.saves), {
                n: format.number(props.summary.saves),
              })}
            </h2>
            <Show when={props.summary.saves > 1}>
              <SegmentedControl
                size="sm"
                class={styles.order}
                label={t().sources.order}
                value={props.order}
                onChange={(value) => props.setOrder(value as SaveOrder)}
                options={(['page', 'newest'] as const).map((value) => ({
                  value,
                  label: t().sources.orders[value],
                }))}
              />
            </Show>
          </div>
          <Show when={list.failed()}>
            <p role="alert" class={styles['end-note']}>
              {t().sources.savesFailed}{' '}
              <button
                type="button"
                class={styles['text-button']}
                onClick={() => startTransition(() => revalidate(getSourceSaves.key))}
              >
                {t().library.retry}
              </button>
            </p>
          </Show>
          <ol class={styles['save-list']}>
            <For each={saves()}>
              {(save) => (
                <li>
                  <SaveItem save={save} url={source().url} quoted={quoted(save.id)} />
                </li>
              )}
            </For>
          </ol>
          <Show when={list.loadingMore()}>
            <div role="status" aria-label={t().library.loadingMore}>
              <For each={[1, 2]}>
                {() => (
                  <span class={styles.skeleton} aria-hidden="true">
                    <span class={styles.bone} data-shape="short" />
                    <span class={styles.bone} />
                  </span>
                )}
              </For>
            </div>
          </Show>
          <Show when={list.loadFailed()}>
            <p role="alert" class={styles['end-note']}>
              {t().library.moreFailed}{' '}
              <button type="button" class={styles['text-button']} onClick={list.loadMore}>
                {t().library.retry}
              </button>
            </p>
          </Show>
          <div ref={list.sentinel} />
        </section>
        <aside class={styles.about} aria-labelledby="source-about">
          <h2 id="source-about" class={styles['about-title']}>
            {t().sources.about}
          </h2>
          <dl class={styles.facts}>
            <div class={styles.fact}>
              <dt class={styles['fact-label']}>{t().sources.saved}</dt>
              <dd>{savedKinds()}</dd>
            </div>
            <Show when={props.summary.colors.length}>
              <div class={styles.fact}>
                <dt class={styles['fact-label']}>{t().sources.colors}</dt>
                <dd>
                  <ColorDots colors={props.summary.colors} size="md" />
                </dd>
              </div>
            </Show>
            <Show when={props.summary.notes.length}>
              <div class={styles.fact}>
                <dt class={styles['fact-label']}>{t().sources.quotedIn}</dt>
                <dd class={styles['note-links']}>
                  <For each={props.summary.notes}>
                    {(note) => (
                      <A href={`/notes/${note.id}`} class={styles['note-link']}>
                        <NotesIcon />
                        {fill(t().sources.quotedNote, {
                          title: note.title.trim() || t().notes.untitledNote,
                          n: format.number(note.quotes),
                        })}
                      </A>
                    )}
                  </For>
                </dd>
              </div>
            </Show>
            <Show when={address()}>
              <div class={styles.fact}>
                <dt class={styles['fact-label']}>{t().sources.address}</dt>
                <dd class={styles.address}>{address()}</dd>
              </div>
            </Show>
          </dl>
        </aside>
      </div>
    </div>
  );
}

// One save: where it is on the page, then the text, then its comment.
function SaveItem(props: { save: Save; url?: string; quoted: boolean }) {
  const { t } = useI18n();
  const saveDate = useSaveDate();
  const pageLabel = usePageLabel();
  return (
    <article class={styles.save}>
      <div class={styles['save-meta']}>
        <span class={styles['save-where']}>
          {props.save.section ?? pageLabel(props.save) ?? t().library.kinds[props.save.kind]}
        </span>
        <span>· {saveDate(props.save.savedAt)}</span>
        <Show when={props.quoted}>
          <Tag tone="sage" icon={<NotesIcon />} class={styles['in-note']}>
            {t().sources.inNote}
          </Tag>
        </Show>
        <Show when={props.url}>
          {(url) => (
            <a
              href={spotUrl(url(), props.save.text)}
              target="_blank"
              rel="noopener"
              class={styles.spot}
              title={t().sources.openSpot}
            >
              <ExternalIcon />
              <span class={styles['spot-label']}>{t().sources.openSpot}</span>
            </a>
          )}
        </Show>
      </div>
      <Switch>
        <Match when={props.save.kind === 'clip'}>
          <p class={styles.clip}>
            <ScissorsIcon />
            {props.save.text}
          </p>
        </Match>
        <Match when={props.save.kind !== 'clip'}>
          <p class={styles.quote}>
            <HighlightMark color={props.save.color ?? 'yellow'}>{props.save.text}</HighlightMark>
          </p>
        </Match>
      </Switch>
      <Show when={props.save.comment}>
        <p class={styles.comment}>
          <MessageIcon />
          {props.save.comment}
        </p>
      </Show>
    </article>
  );
}
