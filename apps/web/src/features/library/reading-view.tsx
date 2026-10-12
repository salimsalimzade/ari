import {
  Button,
  ColorPicker,
  Dialog,
  HighlightMark,
  Menu,
  type MenuItem,
  SourceAvatar,
  Tag,
  TextField,
} from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { A, useNavigate } from '@solidjs/router';
import { createSignal, Match, Show, Switch } from 'solid-js';
import { useNotes } from '~/features/notes/notes-store';
import { BackIcon, ChevronRightIcon, NotesIcon } from '~/features/shell/icons';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { LanguageSelect } from '~/i18n/language-select';
import {
  ChevronLeftIcon,
  CopyIcon,
  ExternalIcon,
  ImageIcon,
  MessageIcon,
  PlusIcon,
  TrashIcon,
} from './icons';
import { useLibrary } from './library-store';
import styles from './reading.module.scss';
import type { Save } from './sample';

/** /library/:id: one save, large, with its source and what can be done with it. */
export function ReadingView(props: { id: string }) {
  const { t } = useI18n();
  const library = useLibrary();
  const save = () => library.saves().find((item) => item.id === props.id);
  return (
    <Show
      when={save()}
      fallback={
        <div class={styles.missing}>
          <Title>{t().library.pageTitle}</Title>
          <h1 class={styles['missing-title']}>{t().reading.notFound}</h1>
          <p class={styles['missing-text']}>{t().reading.notFoundText}</p>
          <Button href="/library" icon={<BackIcon />}>
            {t().reading.back}
          </Button>
        </div>
      }
    >
      {(save) => <Reading save={save()} />}
    </Show>
  );
}

function Reading(props: { save: Save }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const notes = useNotes();
  const navigate = useNavigate();
  const [confirming, setConfirming] = createSignal(false);

  // Previous and next follow the Library's filters, while this save is among what they show.
  const list = () =>
    library.filtered().some((save) => save.id === props.save.id)
      ? library.filtered()
      : library.saves();
  const index = () => list().findIndex((save) => save.id === props.save.id);
  const previous = () => list()[index() - 1];
  const next = () => list()[index() + 1];
  const source = () => library.sourceOf(props.save.source);
  // "meadowquarterly.example/honeybees-new-home", without the https://.
  const address = () => source().url?.replace(/^https?:\/\//, '');
  const host = () => address()?.split('/')[0];

  const copy = async () => {
    const where = [source().author, source().title, props.save.page].filter(Boolean).join(', ');
    await navigator.clipboard.writeText(`“${props.save.text}” (${where})`);
    library.showToast({ text: t().reading.copied });
  };
  // Add to note: the newest notes, then a new note that starts with this quote.
  const noteChoices = (): MenuItem[][] => [
    notes
      .list()
      .slice(0, 5)
      .map((note) => ({
        label: note.title.trim() || t().notes.untitledNote,
        icon: <NotesIcon />,
        onSelect: () => {
          notes.appendQuote(note.id, props.save.id);
          library.showToast({
            text: fill(t().reading.addedToNote, {
              title: note.title.trim() || t().notes.untitledNote,
            }),
          });
        },
      })),
    [
      {
        label: t().notes.newNote,
        icon: <PlusIcon />,
        onSelect: () => navigate(`/notes/${notes.create([props.save.id])}`),
      },
    ],
  ];
  const addToNote = (size: 'md' | 'lg') => (
    <Menu
      groups={noteChoices()}
      trigger={(triggerProps: object) => (
        <Button {...triggerProps} size={size} icon={<PlusIcon />}>
          {t().reading.addToNote}
        </Button>
      )}
    />
  );

  const remove = () => {
    const after = next() ?? previous();
    library.deleteSave(props.save.id);
    setConfirming(false);
    library.showToast({ text: t().reading.deleted });
    navigate(after ? `/library/${after.id}` : '/library', { replace: true });
  };

  return (
    <div class={styles.page}>
      <Title>{`${props.save.text.slice(0, 60)} · Ari`}</Title>
      <header class={styles['phone-header']}>
        <A href="/library" class={styles['icon-button']} aria-label={t().reading.back}>
          <BackIcon />
        </A>
        <Tag tone="accent">{t().library.kinds[props.save.kind]}</Tag>
        <span class={styles['phone-actions']}>
          <LanguageSelect />
          <button
            type="button"
            class={styles['icon-button']}
            aria-label={t().reading.delete}
            onClick={() => setConfirming(true)}
          >
            <TrashIcon />
          </button>
        </span>
      </header>
      <div class={styles.panel}>
        <nav class={styles.top} aria-label={t().library.title}>
          <Button href="/library" icon={<BackIcon />}>
            {t().reading.back}
          </Button>
          <span class={styles.position}>
            {fill(t().reading.position, {
              n: format.number(index() + 1),
              total: format.number(list().length),
            })}
          </span>
          <Show
            when={previous()}
            fallback={
              <Button
                iconOnly
                disabled
                icon={<ChevronLeftIcon />}
                aria-label={t().reading.previous}
              />
            }
          >
            {(save) => (
              <Button
                iconOnly
                href={`/library/${save().id}`}
                icon={<ChevronLeftIcon />}
                aria-label={t().reading.previous}
              />
            )}
          </Show>
          <Show
            when={next()}
            fallback={
              <Button iconOnly disabled icon={<ChevronRightIcon />} aria-label={t().reading.next} />
            }
          >
            {(save) => (
              <Button
                iconOnly
                href={`/library/${save().id}`}
                icon={<ChevronRightIcon />}
                aria-label={t().reading.next}
              />
            )}
          </Show>
        </nav>
        <article class={styles.article}>
          <div class={styles.kind}>
            <Tag tone="accent">{t().library.kinds[props.save.kind]}</Tag>
            <span class={styles.saved}>
              {fill(t().reading.savedOn, { date: format.date(props.save.savedAt) })}
            </span>
          </div>
          <Switch>
            <Match when={props.save.kind !== 'clip'}>
              <p class={styles.quote}>
                <HighlightMark color={props.save.color ?? 'yellow'}>
                  {props.save.text}
                </HighlightMark>
              </p>
            </Match>
            <Match when={props.save.kind === 'clip'}>
              <div class={styles.clip} data-clip={props.save.clip} aria-hidden="true">
                <Show when={props.save.clip === 'image'} fallback={<ClipTable />}>
                  <ImageIcon />
                </Show>
              </div>
              <h1 class={styles['clip-title']}>{props.save.text}</h1>
            </Match>
          </Switch>
          <Show when={props.save.color}>
            {(color) => (
              <ColorPicker
                class={styles['phone-colors']}
                aria-label={t().reading.color}
                names={t().colors.names}
                value={color()}
                onChange={(next) => library.setColor(props.save.id, next)}
              />
            )}
          </Show>
          <Show when={props.save.comment}>
            <p class={styles.comment}>
              <MessageIcon />
              {props.save.comment}
            </p>
          </Show>
          <TextField
            label={t().library.comment}
            multiline
            class={styles['phone-comment']}
            value={props.save.comment}
            onChange={(comment) => library.setComment(props.save.id, comment)}
          />
          <div class={styles.source}>
            <SourceAvatar initial={source().name.charAt(0).toUpperCase()} size="lg" />
            <div class={styles['source-text']}>
              <span class={styles['source-title']}>{source().title}</span>
              <span class={`${styles['source-meta']} ${styles['wide-only']}`}>
                {[source().name, source().author, address()].filter(Boolean).join(' · ')}
              </span>
              <span class={`${styles['source-meta']} ${styles['phone-only']}`}>
                {[host() ?? source().name, format.shortDate(props.save.savedAt)].join(' · ')}
              </span>
            </div>
            <Show when={source().url}>
              {(url) => (
                <>
                  <span class={styles['wide-only']}>
                    <Button href={url()} newTab icon={<ExternalIcon />}>
                      {t().reading.openSource}
                    </Button>
                  </span>
                  <span class={styles['phone-only']}>
                    <Button
                      variant="ghost"
                      size="lg"
                      iconOnly
                      href={url()}
                      newTab
                      icon={<ExternalIcon />}
                      aria-label={t().reading.openSource}
                    />
                  </span>
                </>
              )}
            </Show>
          </div>
          <div class={styles.actions}>
            <Button variant="primary" icon={<CopyIcon />} onClick={copy}>
              {t().reading.copy}
            </Button>
            {addToNote('md')}
            <Show when={props.save.color}>
              {(color) => (
                <ColorPicker
                  size="sm"
                  class={styles.colors}
                  aria-label={t().reading.color}
                  names={t().colors.names}
                  value={color()}
                  onChange={(next) => library.setColor(props.save.id, next)}
                />
              )}
            </Show>
            <Button
              iconOnly
              icon={<TrashIcon />}
              class={styles.delete}
              aria-label={t().reading.delete}
              onClick={() => setConfirming(true)}
            />
          </div>
        </article>
        <div class={styles['phone-buttons']}>
          <Button variant="primary" size="lg" icon={<CopyIcon />} onClick={copy}>
            {t().reading.copy}
          </Button>
          {addToNote('lg')}
        </div>
      </div>
      <Dialog
        open={confirming()}
        onOpenChange={setConfirming}
        sheet
        title={t().reading.deleteTitle}
        description={t().reading.deleteText}
      >
        <div class={styles['confirm-actions']}>
          <Button onClick={() => setConfirming(false)}>{t().reading.cancel}</Button>
          <Button variant="primary" onClick={remove}>
            {t().reading.delete}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

// A clipped table, drawn as its rows.
function ClipTable() {
  return (
    <span class={styles.table}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
