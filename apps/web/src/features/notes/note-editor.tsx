import { Button, Dialog, HighlightMark, Menu, type MenuItem } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { A, createAsync, revalidate, useNavigate } from '@solidjs/router';
import {
  batch,
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
import {
  download,
  fileName,
  type NotePart,
  noteAsMarkdown,
  noteAsText,
  partsAsText,
} from './note-text';
import type { Block, Note } from './notes';
import styles from './notes.module.scss';
import { useNotes } from './notes-store';
import { getNote } from './queries';

type TextBlock = Extract<Block, { kind: 'text' }>;
type QuoteBlock = Extract<Block, { kind: 'quote' }>;

// How many saved highlights the "/" menu offers at once.
const pickCount = 6;
// How much can be typed after a "/" before it is taken as writing rather than a search.
const commandLength = 60;
// How long the "/" menu waits for more typing before it asks ari-api.
const searchDelay = 250;
// Phones show one note at a time, so a deleted note goes back to the list there.
const phoneQuery = '(max-width: 720px)';

// The blocks copied or cut last, with the text that went to the clipboard: pasting that text in a
// note puts the blocks back, quotes and all. Kept for the visit, across notes.
let copied: { text: string; blocks: Block[]; saves: Save[] } | undefined;

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
  // The caret's place in the focused paragraph; undefined while text is selected.
  const [caret, setCaret] = createSignal<number>();
  // Where Add quote puts the "/": after the block written in last.
  let lastFocused: string | undefined;
  // The "/" whose menu Escape closed (or that found nothing), until its paragraph loses focus.
  const [dismissed, setDismissed] = createSignal<{ blockId: string; start: number }>();
  const [active, setActive] = createSignal(0);
  // Whole blocks picked together, from `anchor` to `head`: by dragging from one block into
  // another, Shift+↑ / ↓ past a paragraph's end, or ⌘A / Ctrl A twice.
  const [picked, setPicked] = createSignal<{ anchor: string; head: string }>();
  let body!: HTMLDivElement;
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
  const focus = (blockId: string | undefined, place: 'start' | 'end' | number = 'end') => {
    const field = blockId ? fields.get(blockId) : titleField;
    if (!field) return;
    field.focus();
    if (field instanceof HTMLTextAreaElement) {
      const at = place === 'start' ? 0 : place === 'end' ? field.value.length : place;
      field.setSelectionRange(at, at);
      setCaret(at);
    }
  };
  const trackCaret = (field: HTMLTextAreaElement) =>
    setCaret(field.selectionStart === field.selectionEnd ? field.selectionEnd : undefined);

  onMount(() => {
    if (fresh() && notes.isEmpty(props.note)) titleField.focus();
  });

  // — The "/" menu —

  // The "/" command before the caret: a "/" that starts the paragraph or a word ("and/or" and
  // addresses don't count), then what is typed up to the caret, on one line and starting with no
  // space ("either / or" isn't a command).
  const slash = createMemo(() => {
    const blockId = focused();
    const end = caret();
    if (!blockId || end === undefined) return;
    const block = blocks().find((item) => item.id === blockId);
    if (block?.kind !== 'text') return;
    const before = block.text.slice(0, end);
    const start = before.lastIndexOf('/');
    if (start < 0 || (start > 0 && !/\s/.test(before[start - 1]))) return;
    const typed = before.slice(start + 1);
    if (/^\s|\n/.test(typed) || typed.length > commandLength) return;
    const closed = dismissed();
    if (closed?.blockId === blockId && closed.start === start) return;
    return { blockId, start, end, typed };
  });
  // "/no single" and "/quote no single" both look for "no single"; "/quo" is still the command.
  const words = createMemo(() => {
    const list = slash()?.typed.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
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
    if (!slash()) return [];
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
  // A search that found nothing closes once a space shows the writing went on.
  createEffect(() => {
    const command = slash();
    if (!command || picks().length || !/\s$/.test(command.typed)) return;
    const q = words().join(' ');
    if (searched()?.q === q) setDismissed({ blockId: command.blockId, start: command.start });
  });
  // The menu sits under the line with the command: the line of the tinted copy of it.
  let token: HTMLElement | undefined;
  const [pickerTop, setPickerTop] = createSignal<number>();
  createEffect(() => {
    const command = slash();
    setPickerTop(command && token?.isConnected ? token.offsetTop + token.offsetHeight : undefined);
  });
  const quoted = createMemo(() => new Set(notes.quotesOf(props.note).map((save) => save.text)));
  const optionId = (index: number) => `${listId}-${index}`;

  const insert = (save: Save) => {
    const command = slash();
    if (command)
      focus(notes.insertQuote(id(), command.blockId, save, command.start, command.end), 'start');
  };

  // — Picking whole blocks —

  const pickedIds = createMemo(() => {
    const range = picked();
    if (!range) return new Set<string>();
    const ids = blocks().map((block) => block.id);
    const anchor = ids.indexOf(range.anchor);
    const head = ids.indexOf(range.head);
    if (anchor < 0 || head < 0) return new Set<string>();
    return new Set(ids.slice(Math.min(anchor, head), Math.max(anchor, head) + 1));
  });
  // The note's blocks as parts of its text, quotes with their saves.
  const partOf = (block: Block): NotePart[] => {
    if (block.kind === 'text') return [{ kind: 'text', text: block.text }];
    const save = notes.saveOf(props.note, block.saveId);
    return save ? [{ kind: 'quote', save, source: save.source, page: pageLabel(save) }] : [];
  };

  /** Picks the blocks from `anchor` to `head`; the keys go to the note's body meanwhile. */
  const pick = (anchor: string, head: string) => {
    if (!picked()) body.focus({ preventScroll: true });
    window.getSelection()?.removeAllRanges();
    setPicked({ anchor, head });
  };
  const pickAll = () => {
    const list = blocks();
    if (list.length) pick(list[0].id, list[list.length - 1].id);
  };
  /** Back to writing, with the caret at the start of the first picked block or the end of the last. */
  const unpick = (place: 'start' | 'end') => {
    const list = blocks().filter((block) => pickedIds().has(block.id));
    setPicked(undefined);
    focus(place === 'start' ? list[0]?.id : list.at(-1)?.id, place);
  };
  const copyPicked = async () => {
    const list = blocks().filter((block) => pickedIds().has(block.id));
    const parts = list.flatMap(partOf);
    const text = partsAsText(parts);
    copied = {
      text,
      blocks: list.map((block) => ({ ...block })),
      saves: parts.flatMap((part) => (part.kind === 'quote' ? [part.save] : [])),
    };
    await navigator.clipboard.writeText(text);
  };
  const removePicked = () => {
    const list = blocks();
    const ids = pickedIds();
    const first = list.findIndex((block) => ids.has(block.id));
    const before = list[first - 1];
    setPicked(undefined);
    notes.removeBlocks(id(), [...ids]);
    if (before) focus(before.id, 'end');
    else focus(blocks()[0]?.id, 'start');
  };

  // Keys while blocks are picked: copy, cut, delete, Shift+↑ / ↓ to pick more or fewer, and any
  // other arrow or Escape to go back to writing.
  const onBodyKey = (event: KeyboardEvent) => {
    const range = picked();
    if (!range || event.target !== body) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (mod && (key === 'c' || key === 'x')) {
      event.preventDefault();
      void copyPicked();
      if (key === 'x') removePicked();
    } else if (mod && key === 'a') {
      event.preventDefault();
      pickAll();
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      removePicked();
    } else if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      const next = neighbor(range.head, event.key === 'ArrowUp' ? -1 : 1);
      if (next) setPicked({ ...range, head: next.id });
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      unpick('start');
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'Escape') {
      event.preventDefault();
      unpick('end');
    }
  };

  // A drag that starts in one block and reaches another picks the blocks between.
  let dragFrom: string | undefined;
  const blockAt = (target: EventTarget | null) =>
    target instanceof Element
      ? target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId
      : undefined;
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const at = blockAt(event.target);
    // Shift-click picks from the block being written in (or the picked ones) to this one.
    const from = picked()?.anchor ?? focused();
    if (event.shiftKey && at && from && at !== from) {
      event.preventDefault();
      pick(from, at);
      return;
    }
    setPicked(undefined);
    // A finger moving across paragraphs scrolls the note instead.
    dragFrom = event.pointerType === 'mouse' ? at : undefined;
  };
  onMount(() => {
    const move = (event: PointerEvent) => {
      if (!dragFrom || !(event.buttons & 1)) return;
      const over = blockAt(document.elementFromPoint(event.clientX, event.clientY));
      if (over && (over !== dragFrom || picked())) pick(dragFrom, over);
    };
    const up = () => {
      dragFrom = undefined;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    onCleanup(() => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    });
  });

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

    const command = slash();
    if (command?.blockId === block.id) {
      const count = picks().length;
      if (count && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : count - 1)) % count);
        return;
      }
      if (count && event.key === 'Enter') {
        event.preventDefault();
        insert(picks()[active()]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissed({ blockId: block.id, start: command.start });
        return;
      }
    }

    // Past the paragraph's first or last letter, Shift+↑ / ↓ picks whole blocks; so does a second
    // ⌘A / Ctrl A once the paragraph is all selected.
    const all = field.selectionStart === 0 && field.selectionEnd === field.value.length;
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'a' &&
      all &&
      blocks().length > 1
    ) {
      event.preventDefault();
      pickAll();
      return;
    }
    if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const up = event.key === 'ArrowUp';
      const next = neighbor(block.id, up ? -1 : 1);
      const atEdge = up ? field.selectionStart === 0 : field.selectionEnd === field.value.length;
      if (next && atEdge) {
        event.preventDefault();
        pick(block.id, next.id);
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

  // Text copied from picked blocks goes back in as those blocks; any other text as it is.
  const onTextPaste = (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
    block: TextBlock,
  ) => {
    const text = event.clipboardData?.getData('text/plain').replace(/\r\n/g, '\n');
    if (!copied || text !== copied.text) return;
    event.preventDefault();
    const field = event.currentTarget;
    const at = notes.pasteBlocks(
      id(),
      block.id,
      field.selectionStart,
      field.selectionEnd,
      copied.blocks,
      copied.saves,
    );
    if (at) focus(at.blockId, at.at);
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
    if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      const next = neighbor(block.id, event.key === 'ArrowUp' ? -1 : 1);
      pick(block.id, next?.id ?? block.id);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
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
    setDismissed((current) => (current?.blockId === blockId ? undefined : current));
  };

  // — The note's actions —

  const parts = () => blocks().flatMap(partOf);

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
    const command = () => (slash()?.blockId === block.id ? slash() : undefined);
    const open = () => !!command();
    return (
      <div
        class={styles.paragraph}
        data-block-id={block.id}
        data-picked={pickedIds().has(block.id) ? '' : undefined}
      >
        <span class={styles.grow} data-value={block.text}>
          {/* While the "/" menu is open, a copy of the text behind the field tints the command. */}
          <Show when={command()}>
            {(shown) => (
              <span class={styles.backdrop} aria-hidden="true">
                {block.text.slice(0, shown().start)}
                <mark
                  ref={(element) => {
                    token = element;
                  }}
                  class={styles.token}
                >
                  {block.text.slice(shown().start, shown().end)}
                </mark>
                {block.text.slice(shown().end)}
              </span>
            )}
          </Show>
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
              const field = event.currentTarget;
              const closed = dismissed();
              batch(() => {
                // A "/" Escape closed that is gone: one typed there again opens the menu.
                if (closed?.blockId === block.id && field.value[closed.start] !== '/')
                  setDismissed(undefined);
                notes.setText(id(), block.id, field.value);
                trackCaret(field);
              });
            }}
            onKeyDown={(event) => onTextKey(event, block)}
            onKeyUp={(event) => trackCaret(event.currentTarget)}
            onClick={(event) => trackCaret(event.currentTarget)}
            onSelect={(event) => trackCaret(event.currentTarget)}
            onPaste={(event) => onTextPaste(event, block)}
            onFocus={(event) => {
              enter(block.id);
              trackCaret(event.currentTarget);
            }}
            onBlur={() => leave(block.id)}
          />
        </span>
        <Show when={open()}>{renderPicker()}</Show>
      </div>
    );
  };

  const renderPicker = () => (
    <div
      class={styles.slash}
      style={{ top: pickerTop() === undefined ? undefined : `${(pickerTop() ?? 0) + 10}px` }}
    >
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
              onClick={() => insert(save)}
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
              data-block-id={block.id}
              data-picked={pickedIds().has(block.id) ? '' : undefined}
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
        {/* biome-ignore lint/a11y/noStaticElementInteractions: takes the keys while whole blocks are picked, and the drags that pick them */}
        <div
          ref={body}
          class={styles.body}
          tabIndex={-1}
          data-picking={picked() ? '' : undefined}
          onKeyDown={onBodyKey}
          onPointerDown={onPointerDown}
          // Focus moving elsewhere on the page ends the picking; going to another app keeps it.
          onFocusOut={(event) => {
            if (event.target === body && event.relatedTarget) setPicked(undefined);
          }}
        >
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
