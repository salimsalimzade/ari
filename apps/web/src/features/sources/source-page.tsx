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
import { A, useNavigate } from '@solidjs/router';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
} from 'solid-js';
import { CopyIcon, ExternalIcon, MessageIcon, ScissorsIcon } from '~/features/library/icons';
import { useLibrary } from '~/features/library/library-store';
import type { Save } from '~/features/library/sample';
import { MoreIcon } from '~/features/notes/icons';
import { useNotes } from '~/features/notes/notes-store';
import { BackIcon, LibraryIcon, NotesIcon } from '~/features/shell/icons';
import { MobileHeader } from '~/features/shell/mobile-header';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { ColorDots } from './color-dots';
import { type SourceSummary, spotUrl, useKindLabel, useSaveDate, useSources } from './sources';
import styles from './sources.module.scss';

type Order = 'page' | 'newest';

// Saves on the page at first, and how many more each time the end comes into view.
const pageSize = 30;
const pageNumber = (save: Save) => Number(save.page?.match(/\d+/)?.[0] ?? 0);

/** /sources/:slug: one website or file, with every save made from it. */
export function SourcePage(props: { slug: string }) {
  const { t } = useI18n();
  const sources = useSources();
  return (
    <Show
      when={sources.find(props.slug)}
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
      {(summary) => <SourceView summary={summary()} isQuoted={sources.isQuoted} />}
    </Show>
  );
}

function SourceView(props: { summary: SourceSummary; isQuoted: (saveId: string) => boolean }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const notes = useNotes();
  const navigate = useNavigate();
  const kindLabel = useKindLabel();
  const [order, setOrder] = createSignal<Order>('page');
  const [shown, setShown] = createSignal(pageSize);
  let sentinel!: HTMLDivElement;

  const source = () => props.summary.source;
  const saves = () => props.summary.saves;
  const savedCount = () =>
    fill(plural(saves().length, t().library.count), { n: format.number(saves().length) });
  // "meadowquarterly.example/honeybees-new-home", without the https://.
  const address = () => source().url?.replace(/^https?:\/\//, '');

  // Files go by page. Websites have no positions yet, so their saves keep the order they were
  // made in, which is usually the order they were read in.
  const ordered = createMemo(() =>
    order() === 'newest'
      ? saves()
      : [...saves()].reverse().sort((a, b) => pageNumber(a) - pageNumber(b)),
  );
  createEffect(on([() => props.summary.slug, order], () => setShown(pageSize), { defer: true }));

  // More saves while the end of the list is in view. Observing again after each step checks
  // whether the end is still in view, e.g. on a tall screen.
  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || shown() >= ordered().length) return;
        setShown((count) => count + pageSize);
        requestAnimationFrame(() => {
          observer.unobserve(sentinel);
          observer.observe(sentinel);
        });
      },
      { rootMargin: '0px 0px 240px 0px' },
    );
    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  const savedKinds = () =>
    (['highlight', 'clip', 'import'] as const)
      .flatMap((kind) => {
        const count = saves().filter((save) => save.kind === kind).length;
        return count
          ? [fill(plural(count, t().sources.savedKinds[kind]), { n: format.number(count) })]
          : [];
      })
      .join(', ');
  // The notes quoting this source, with how many of its saves each one quotes.
  const quotedIn = () =>
    notes
      .list()
      .map((note) => ({
        note,
        count: notes.quotesOf(note).filter((save) => save.source === source().name).length,
      }))
      .filter((item) => item.count);

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
          library.showSource(source().name);
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
          class={`${styles['hero-avatar']} ${props.summary.kind === 'file' ? styles['file-avatar'] : ''}`}
        />
        <p class={styles.kicker}>
          <span class={styles['kicker-name']}>{source().name}</span>
          <span class={styles['wide-only']}> · {kindLabel(props.summary)}</span>
          <span class={styles['phone-only']}>{savedCount()}</span>
        </p>
        <h1 class={styles['hero-title']}>{source().title}</h1>
        <p class={styles.byline}>
          {[
            source().author,
            fill(t().sources.firstSaved, {
              date: format.date(saves()[saves().length - 1].savedAt),
            }),
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
              {fill(plural(saves().length, t().sources.saves), {
                n: format.number(saves().length),
              })}
            </h2>
            <Show when={saves().length > 1}>
              <SegmentedControl
                size="sm"
                class={styles.order}
                label={t().sources.order}
                value={order()}
                onChange={(value) => setOrder(value as Order)}
                options={(['page', 'newest'] as const).map((value) => ({
                  value,
                  label: t().sources.orders[value],
                }))}
              />
            </Show>
          </div>
          <ol class={styles['save-list']}>
            <For each={ordered().slice(0, shown())}>
              {(save) => (
                <li>
                  <SaveItem save={save} url={source().url} quoted={props.isQuoted(save.id)} />
                </li>
              )}
            </For>
          </ol>
          <div ref={sentinel} />
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
            <Show when={quotedIn().length}>
              <div class={styles.fact}>
                <dt class={styles['fact-label']}>{t().sources.quotedIn}</dt>
                <dd class={styles['note-links']}>
                  <For each={quotedIn()}>
                    {(item) => (
                      <A href={`/notes/${item.note.id}`} class={styles['note-link']}>
                        <NotesIcon />
                        {fill(t().sources.quotedNote, {
                          title: item.note.title.trim() || t().notes.untitledNote,
                          n: format.number(item.count),
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
  return (
    <article class={styles.save}>
      <div class={styles['save-meta']}>
        <span class={styles['save-where']}>
          {props.save.section ?? props.save.page ?? t().library.kinds[props.save.kind]}
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
