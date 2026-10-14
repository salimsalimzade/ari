import { Button, Dialog, HighlightMark, Menu, type MenuItem } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { A, createAsync, revalidate, useNavigate } from '@solidjs/router';
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
  startTransition,
} from 'solid-js';
import {
  AlertIcon,
  CloseIcon,
  CopyIcon,
  FileIcon,
  GlobeIcon,
  RetryIcon,
  TrashIcon,
} from '~/features/library/icons';
import { useLibrary } from '~/features/library/library-store';
import { searchSaves } from '~/features/library/queries';
import { type Save, usePageLabel } from '~/features/library/saves';
import { BackIcon, NotesIcon } from '~/features/shell/icons';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { LanguageSelect } from '~/i18n/language-select';
import { DownloadIcon, MoreIcon, QuoteIcon } from './icons';
import { download, fileName, type NotePart, noteAsMarkdown, noteAsText } from './note-text';
import type { Block, Note } from './notes';
import styles from './notes.module.scss';
import { useNotes } from './notes-store';
import { getNote } from './queries';

type TextBlock = Extract<Block, { kind: 'text' }>;
type QuoteBlock = Extract<Block, { kind: 'quote' }>;

// How many saved highlights the "/" menu offers at once.
const pickCount = 6;
// How long the "/" menu waits for more typing before it asks ari-api.
const searchDelay = 250;
// Phones show one note at a time, so a deleted note goes back to the list there.
const phoneQuery = '(max-width: 720px)';

/** /notes/:id: one note, paragraphs of writing with saved quotes between them. */
export function NoteEditor(props: { id: string }) {
  const { t } = useI18n();
  const notes = useNotes();
  const fetched = createAsync(() => getNote(props.id), { deferStream: true });
  const found = () => {
    const note = fetched();
    return note && note !== 'failed' ? note : undefined;
  };
  // The editor changes a draft of the note. Making it once the note is on the screen, before
  // anything is typed, keeps each paragraph's field from being made again under the caret.
  createEffect(() => {
    const note = found();
    if (note) notes.track(note);
  });
  return (
    <Switch fallback={<NoteMissing />}>
      <Match when={fetched() === 'failed'}>
        <div role="alert" class={styles.missing}>
          <Title>{t().notes.pageTitle}</Title>
          <span class={styles['error-icon']}>
            <AlertIcon />
          </span>
          <h1 class={styles['state-title']}>{t().notes.noteFailed}</h1>
          <p class={styles['state-text']}>{t().library.loadFailedText}</p>
          <Button
            icon={<RetryIcon />}
            onClick={() => startTransition(() => revalidate(getNote.keyFor(props.id)))}
          >
            {t().library.retry}
          </Button>
        </div>
      </Match>
      <Match when={found()} keyed>
        {(note) => <Editor note={notes.open(note)} />}
      </Match>
    </Switch>
  );
}

function NoteMissing() {
  const { t } = useI18n();
  return (
    <div class={styles.missing}>
      <Title>{t().notes.pageTitle}</Title>
      <span class={styles['error-icon']}>
        <AlertIcon />
      </span>
      <h1 class={styles['state-title']}>{t().notes.notFound}</h1>
      <p class={styles['state-text']}>{t().notes.notFoundText}</p>
      <Button href="/notes" icon={<BackIcon />}>
        {t().notes.back}
      </Button>
    </div>
  );
}

function Editor(props: { note: Note }) {
  const { t } = useI18n();
  const format = useFormat();
  const notes = useNotes();
  const library = useLibrary();
  const pageLabel = usePageLabel();
  const navigate = useNavigate();
  const listId = createUniqueId();
  // Each block's textarea or quote, to move the caret between them.
  const fields = new Map<string, HTMLElement>();
  // Hydration leaves server-rendered textareas empty (`value` isn't an attribute of theirs), so
  // each ref puts its text in as well.
  let titleField!: HTMLTextAreaElement;
  const [focused, setFocused] = createSignal<string>();
  // Where Add quote puts the "/": after the block written in last.
  let lastFocused: string | undefined;
  // The paragraph whose "/" menu Escape closed, until it loses focus.
  const [dismissed, setDismissed] = createSignal<string>();
  const [active, setActive] = createSignal(0);
  const [confirming, setConfirming] = createSignal(false);
  // What a menu item does once its menu has closed and focus is back on the menu's button.
  let afterMenu: (() => void) | undefined;

  const id = () => props.note.id;
  const blocks = () => notes.blocksOf(props.note);
  // Nothing changed since it was started.
  const fresh = () => props.note.updatedAt.getTime() === props.note.createdAt.getTime();
  const saveState = () => notes.saveState(id());
  const title = () => props.note.title.trim() || t().notes.untitledNote;
  const neighbor = (blockId: string, step: -1 | 1) => {
    const list = blocks();
    const index = list.findIndex((block) => block.id === blockId);
    return index < 0 ? undefined : list[index + step];
  };

  /** Puts the caret in a paragraph (or on a quote); no block means the title. */
  const focus = (blockId: string | undefined, caret: 'start' | 'end' | number = 'end') => {
    const field = blockId ? fields.get(blockId) : titleField;
    if (!field) return;
    field.focus();
    if (field instanceof HTMLTextAreaElement) {
      const at = caret === 'start' ? 0 : caret === 'end' ? field.value.length : caret;
      field.setSelectionRange(at, at);
    }
  };

  onMount(() => {
    if (fresh() && notes.isEmpty(props.note)) titleField.focus();
  });

  // — The "/" menu —

  const slashBlock = createMemo(() => {
    const blockId = focused();
    if (!blockId || dismissed() === blockId) return;
    const block = blocks().find((item) => item.id === blockId);
    return block?.kind === 'text' && block.text.startsWith('/') ? block : undefined;
  });
  // "/no single" and "/quote no single" both look for "no single"; "/quo" is still the command.
  const words = createMemo(() => {
    const block = slashBlock();
    const list = block ? block.text.slice(1).toLowerCase().split(/\s+/).filter(Boolean) : [];
    const command = (word: string) =>
      ['quote', t().notes.slashCommand].some(
        (name) => name === word || (list.length === 1 && name.startsWith(word)),
      );
    return list.length && command(list[0]) ? list.slice(1) : list;
  });
  // What ari-api found for the words after "/"; until it answers, the saves this page has loaded
  // stand in.
  const [searched, setSearched] = createSignal<{ q: string; saves: Save[] }>();
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on(words, (list) => {
      clearTimeout(searchTimer);
      const q = list.join(' ');
      if (!q) return;
      searchTimer = setTimeout(async () => {
        const found = await searchSaves(q);
        if (found && words().join(' ') === q) setSearched({ q, saves: found.saves });
      }, searchDelay);
    }),
  );
  onCleanup(() => clearTimeout(searchTimer));
  // The newest matching highlights, each text once (clips have no text to quote).
  const picks = createMemo(() => {
    if (!slashBlock()) return [];
    const search = words();
    const answer = searched()?.q === search.join(' ') ? searched() : undefined;
    const seen = new Set<string>();
    const found: Save[] = [];
    for (const save of answer ? answer.saves.map(library.withChanges) : library.saves()) {
      if (save.kind === 'clip' || seen.has(save.text) || library.isDeleted(save.id)) continue;
      seen.add(save.text);
      const text = `${save.text} ${save.source.name}`.toLowerCase();
      if (answer || search.every((word) => text.includes(word))) found.push(save);
      if (found.length === pickCount) break;
    }
    return found;
  });
  createEffect(on(words, () => setActive(0)));
  const quoted = createMemo(() => new Set(notes.quotesOf(props.note).map((save) => save.text)));
  const optionId = (index: number) => `${listId}-${index}`;

  const insert = (blockId: string, save: Save) =>
    focus(notes.insertQuote(id(), blockId, save), 'start');

  // — Keys —

  const onTitleKey = (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const field = event.currentTarget;
    const atEnd = field.selectionStart === field.value.length;
    if (event.isComposing) return;
    if (event.key === 'Enter' || (event.key === 'ArrowDown' && atEnd)) {
      event.preventDefault();
      focus(blocks()[0]?.id, 'start');
    }
  };

  const onTextKey = (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
    block: TextBlock,
  ) => {
    if (event.isComposing) return;
    const field = event.currentTarget;
    const collapsed = field.selectionStart === field.selectionEnd;
    const atStart = collapsed && field.selectionStart === 0;
    const atEnd = collapsed && field.selectionEnd === field.value.length;

    if (slashBlock()?.id === block.id) {
      const count = picks().length;
      if (count && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : count - 1)) % count);
        return;
      }
      if (count && event.key === 'Enter') {
        event.preventDefault();
        insert(block.id, picks()[active()]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissed(block.id);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      focus(notes.split(id(), block.id, field.selectionStart, field.selectionEnd), 'start');
    } else if (event.key === 'Backspace' && atStart) {
      const previous = neighbor(block.id, -1);
      if (!previous) return;
      event.preventDefault();
      if (previous.kind === 'text') {
        const caret = previous.text.length;
        notes.merge(id(), previous.id, block.id);
        focus(previous.id, caret);
      } else {
        // An empty paragraph between two quotes goes; the quote before is selected.
        if (!block.text && neighbor(block.id, 1)) notes.removeBlock(id(), block.id);
        focus(previous.id);
      }
    } else if (event.key === 'Delete' && atEnd) {
      const next = neighbor(block.id, 1);
      if (!next) return;
      event.preventDefault();
      if (next.kind === 'text') {
        const caret = block.text.length;
        notes.merge(id(), block.id, next.id);
        focus(block.id, caret);
      } else focus(next.id);
    } else if (event.key === 'ArrowUp' && atStart) {
      event.preventDefault();
      focus(neighbor(block.id, -1)?.id, 'end');
    } else if (event.key === 'ArrowDown' && atEnd) {
      const next = neighbor(block.id, 1);
      if (!next) return;
      event.preventDefault();
      focus(next.id, 'start');
    }
  };

  const removeQuote = (block: QuoteBlock) => {
    const previous = neighbor(block.id, -1);
    const next = neighbor(block.id, 1);
    notes.removeBlock(id(), block.id);
    focus(previous?.id ?? next?.id, previous ? 'end' : 'start');
  };

  const onQuoteKey = (event: KeyboardEvent, block: QuoteBlock) => {
    // Keys on the remove button are the button's own.
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      removeQuote(block);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const next = neighbor(block.id, 1);
      focus(next?.kind === 'text' ? next.id : notes.addText(id(), block.id), 'start');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focus(neighbor(block.id, -1)?.id, 'end');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      focus(neighbor(block.id, 1)?.id, 'start');
    }
  };

  const enter = (blockId: string) => {
    setFocused(blockId);
    lastFocused = blockId;
  };
  const leave = (blockId: string) => {
    setFocused((current) => (current === blockId ? undefined : current));
    setDismissed((current) => (current === blockId ? undefined : current));
  };

  // — The note's actions —

  const parts = () =>
    blocks().flatMap((block): NotePart[] => {
      if (block.kind === 'text') return [{ kind: 'text', text: block.text }];
      const save = notes.saveOf(props.note, block.saveId);
      return save ? [{ kind: 'quote', save, source: save.source, page: pageLabel(save) }] : [];
    });

  const copy = async () => {
    await navigator.clipboard.writeText(noteAsText(title(), parts()));
    library.showToast({ text: t().notes.copied });
  };
  const duplicate = async () => {
    const copied = await notes.duplicate(props.note, fill(t().notes.copyTitle, { title: title() }));
    if (!copied) return;
    library.showToast({ text: t().notes.duplicated });
    navigate(`/notes/${copied}`);
  };
  const remove = () => {
    const list = notes.list();
    const index = list.findIndex((note) => note.id === id());
    const after = window.matchMedia(phoneQuery).matches
      ? undefined
      : (list[index + 1] ?? list[index - 1]);
    const removed = id();
    setConfirming(false);
    navigate(after ? `/notes/${after.id}` : '/notes', { replace: true });
    notes.remove(removed);
    library.showToast({ text: t().notes.deleted });
  };

  const actions = (): MenuItem[][] => [
    [
      {
        label: t().notes.addQuote,
        icon: <QuoteIcon />,
        hint: '/',
        onSelect: () => {
          afterMenu = () => focus(notes.startQuote(id(), lastFocused));
        },
      },
    ],
    [
      { label: t().notes.copyText, icon: <CopyIcon />, onSelect: copy },
      {
        label: t().notes.exportMarkdown,
        icon: <DownloadIcon />,
        onSelect: () =>
          download(
            `${fileName(title()) || 'note'}.md`,
            noteAsMarkdown(title(), parts()),
            'text/markdown',
          ),
      },
      {
        label: t().notes.exportPdf,
        icon: <FileIcon />,
        // The browser's print dialog saves PDFs; the menu is gone by the next frame.
        onSelect: () => requestAnimationFrame(() => window.print()),
      },
      { label: t().notes.duplicate, icon: <NotesIcon />, onSelect: duplicate },
    ],
    [
      {
        label: t().notes.delete,
        icon: <TrashIcon />,
        danger: true,
        // Once focus is back on the menu's button, where the dialog returns it.
        onSelect: () => {
          afterMenu = () => setConfirming(true);
        },
      },
    ],
  ];

  const actionsMenu = () => (
    <Menu
      placement="bottom-end"
      class={styles.menu}
      groups={actions()}
      onClosed={() => {
        const run = afterMenu;
        afterMenu = undefined;
        run?.();
      }}
      trigger={(triggerProps: object) => (
        <Button
          {...triggerProps}
          iconOnly
          class={styles.more}
          icon={<MoreIcon />}
          aria-label={t().notes.actions}
          title={t().notes.actions}
        />
      )}
    />
  );

  // — Blocks —

  const renderText = (block: TextBlock) => {
    onCleanup(() => fields.delete(block.id));
    const open = () => slashBlock()?.id === block.id;
    return (
      <div class={styles.paragraph}>
        <span class={styles.grow} data-value={block.text} data-slash={open() ? '' : undefined}>
          <textarea
            ref={(field) => {
              fields.set(block.id, field);
              field.value = block.text;
            }}
            class={styles.input}
            rows={1}
            value={block.text}
            placeholder={blocks().length === 1 ? t().notes.placeholder : undefined}
            aria-label={t().notes.paragraph}
            aria-autocomplete={open() ? 'list' : undefined}
            aria-controls={open() ? listId : undefined}
            aria-activedescendant={open() && picks().length ? optionId(active()) : undefined}
            onInput={(event) => {
              const text = event.currentTarget.value;
              if (!text.startsWith('/')) setDismissed(undefined);
              notes.setText(id(), block.id, text);
            }}
            onKeyDown={(event) => onTextKey(event, block)}
            onFocus={() => enter(block.id)}
            onBlur={() => leave(block.id)}
          />
        </span>
        <Show when={open()}>{renderPicker(block)}</Show>
      </div>
    );
  };

  const renderPicker = (block: TextBlock) => (
    <div class={styles.slash}>
      <div class={styles['slash-head']}>
        <span class={`${styles['slash-title']} ${styles['wide-only']}`}>
          {t().notes.slashTitle}
        </span>
        <span class={`${styles['slash-title']} ${styles['phone-only']}`}>
          {t().notes.slashTitleShort}
        </span>
        <span class={`${styles['slash-hint']} ${styles['wide-only']}`}>{t().notes.slashHint}</span>
      </div>
      <div id={listId} role="listbox" aria-label={t().notes.slashTitle}>
        <For each={picks()}>
          {(save, index) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the paragraph's arrow keys and Enter choose
            <div
              id={optionId(index())}
              role="option"
              tabIndex={-1}
              aria-selected={active() === index()}
              class={styles.pick}
              // Keeps the caret in the paragraph, which closes the menu when it loses focus.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(block.id, save)}
              onMouseMove={() => setActive(index())}
            >
              <span class={styles.dot} data-color={save.color} />
              <span class={styles['pick-text']}>
                <span class={styles['pick-quote']}>{save.text}</span>
                <span class={styles['pick-source']}>
                  {save.source.name}
                  <Show when={quoted().has(save.text)}>
                    <span class={styles['in-note']}>· {t().notes.inNote}</span>
                  </Show>
                </span>
              </span>
            </div>
          )}
        </For>
      </div>
      <Show when={!picks().length}>
        <p class={styles['slash-empty']}>{fill(t().notes.slashEmpty, { q: words().join(' ') })}</p>
      </Show>
    </div>
  );

  const renderQuote = (block: QuoteBlock) => {
    onCleanup(() => fields.delete(block.id));
    return (
      <Show when={notes.saveOf(props.note, block.saveId)}>
        {(save) => {
          const source = () => save().source;
          return (
            <figure
              ref={(figure) => fields.set(block.id, figure)}
              class={styles.quote}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: arrow keys reach a quote, Backspace removes it
              tabIndex={0}
              onKeyDown={(event) => onQuoteKey(event, block)}
              onFocus={() => enter(block.id)}
              onBlur={() => leave(block.id)}
            >
              <p class={styles['quote-text']}>
                <HighlightMark color={save().color ?? 'yellow'}>{save().text}</HighlightMark>
              </p>
              <figcaption class={styles.caption}>
                <Show when={source().url} fallback={<FileIcon />}>
                  <GlobeIcon />
                </Show>
                {[source().name, source().title, pageLabel(save())].filter(Boolean).join(' · ')}
              </figcaption>
              <button
                type="button"
                class={styles.remove}
                aria-label={t().notes.removeQuote}
                title={t().notes.removeQuote}
                onClick={() => removeQuote(block)}
              >
                <CloseIcon />
              </button>
            </figure>
          );
        }}
      </Show>
    );
  };

  return (
    <div class={styles.editor}>
      <Title>{`${title()} · Ari`}</Title>
      <header class={styles['phone-bar']}>
        <A href="/notes" class={styles['icon-link']} aria-label={t().notes.back}>
          <BackIcon />
        </A>
        <span class={styles.status}>
          {saveState() === 'saving'
            ? t().notes.saving
            : saveState() === 'failed'
              ? t().notes.notSaved
              : fresh()
                ? t().notes.newShort
                : t().notes.saved}
        </span>
        <span class={styles['phone-actions']}>
          <LanguageSelect />
          {actionsMenu()}
        </span>
      </header>
      <div class={styles.panel}>
        <div class={styles.bar}>
          <span class={styles.status} role="status">
            <Switch
              fallback={fill(t().notes.savedStatus, {
                when: format.ago(props.note.updatedAt, notes.now()),
              })}
            >
              <Match when={saveState() === 'saving'}>{t().notes.saving}</Match>
              <Match when={saveState() === 'failed'}>
                {t().notes.notSaved} ·{' '}
                <button type="button" class={styles.retry} onClick={() => notes.retry(id())}>
                  {t().library.retry}
                </button>
              </Match>
              <Match when={fresh()}>{t().notes.newStatus}</Match>
            </Switch>
          </span>
          {actionsMenu()}
        </div>
        <div class={styles.body}>
          <h1 class={styles.title}>
            <span class={styles.grow} data-value={props.note.title}>
              <textarea
                ref={(field) => {
                  titleField = field;
                  field.value = props.note.title;
                }}
                class={styles.input}
                rows={1}
                value={props.note.title}
                placeholder={t().notes.untitled}
                aria-label={t().notes.titleLabel}
                onInput={(event) =>
                  notes.setTitle(id(), event.currentTarget.value.replace(/\n/g, ' '))
                }
                onKeyDown={onTitleKey}
              />
            </span>
          </h1>
          <For each={blocks()}>
            {(block) => (block.kind === 'text' ? renderText(block) : renderQuote(block))}
          </For>
          <Show when={notes.isEmpty(props.note)}>
            <aside class={styles.tips}>
              <span class={styles['tips-title']}>{t().notes.tipsTitle}</span>
              <div class={styles.tip}>
                <span class={styles['tip-icon']} data-tip="slash" aria-hidden="true">
                  /
                </span>
                <span class={styles['tip-text']}>
                  <span class={styles['tip-title']}>{t().notes.tipSlash}</span>
                  <span class={styles['tip-body']}>{t().notes.tipSlashText}</span>
                </span>
              </div>
              <div class={styles.tip}>
                <span class={styles['tip-icon']} aria-hidden="true">
                  <MoreIcon />
                </span>
                <span class={styles['tip-text']}>
                  <span class={styles['tip-title']}>{t().notes.tipMenu}</span>
                  <span class={styles['tip-body']}>{t().notes.tipMenuText}</span>
                </span>
              </div>
              <span class={styles['tips-note']}>{t().notes.tipsNote}</span>
            </aside>
          </Show>
        </div>
      </div>
      <Dialog
        open={confirming()}
        onOpenChange={setConfirming}
        sheet
        title={t().notes.deleteTitle}
        description={t().notes.deleteText}
      >
        <div class={styles['confirm-actions']}>
          <Button onClick={() => setConfirming(false)}>{t().notes.cancel}</Button>
          <Button variant="primary" onClick={remove}>
            {t().notes.delete}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
