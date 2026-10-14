import { type HighlightColor, highlightColors, Kbd, Tag } from '@ari/ui-kit';
import { type Accessor, createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { fill, t } from '~/i18n/i18n';
import { CheckIcon, CloseIcon, CommentIcon, HashIcon, PlusIcon } from '~/icons';
import { sendToBackground } from '~/messages';
import { type Anchor, createFloating } from '../page/floating';
import { recentTags } from '../saves/settings';
import styles from './highlight.module.scss';

// A mousedown in Ari's UI would clear the page's selection before the click saves it.
const keepSelection = (event: MouseEvent) => event.preventDefault();

// ari-api's limits for a save's tags, and how many known tags the comment offers at once.
const maxTags = 10;
const maxLength = 50;
const offered = 4;

const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** What the comment box holds until the highlight is saved. */
export type Draft = { comment: string; tags: string[] };

/**
 * Above a selection: Save (S), the five colors (1–5) and Comment (C). Esc closes it. While the
 * comment box is open, Save and the colors save with what is written in it.
 */
export function SelectionToolbar(props: {
  anchor: Accessor<Anchor | undefined>;
  commenting: boolean;
  onSave: (color?: HighlightColor) => void;
  onComment: () => void;
}) {
  const floating = createFloating(props.anchor, 'above');
  return (
    <div
      ref={floating.ref}
      role="toolbar"
      aria-label={t.toolbar.label}
      class={styles.toolbar}
      style={floating.style()}
      onMouseDown={keepSelection}
    >
      <button type="button" class={styles.save} onClick={() => props.onSave()}>
        <CheckIcon />
        {t.toolbar.save}
        <Kbd tone="accent">S</Kbd>
      </button>
      <For each={highlightColors}>
        {(color, index) => (
          <button
            type="button"
            class={styles.swatch}
            style={{ background: `var(--ari-hl-${color})` }}
            aria-label={fill(t.toolbar.saveIn, { color: t.colors[color] })}
            onClick={() => props.onSave(color)}
          >
            {index() + 1}
          </button>
        )}
      </For>
      <span class={styles.divider} />
      <button
        type="button"
        class={styles.comment}
        aria-pressed={props.commenting}
        onClick={() => props.onComment()}
      >
        <CommentIcon />
        {t.toolbar.comment}
        <Kbd>C</Kbd>
      </button>
    </div>
  );
}

/**
 * Under the selection while Comment is on: the comment, and tags typed as #name, picked from the
 * library's and the recent ones with ↑↓ and added with Enter. Enter otherwise saves, Esc closes.
 */
export function CommentBox(props: {
  anchor: Accessor<Anchor | undefined>;
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const floating = createFloating(props.anchor, 'below');
  const [known, setKnown] = createSignal<string[]>([]);
  // The tag being typed after "#", or null when the caret isn't in one.
  const [typed, setTyped] = createSignal<string | null>(null);
  const [active, setActive] = createSignal(0);
  let field!: HTMLTextAreaElement;

  onMount(async () => {
    field.focus();
    const [recent, library] = await Promise.all([
      recentTags.getValue(),
      sendToBackground<string[]>({ type: 'tags' }).catch(() => []),
    ]);
    const tags: string[] = [];
    for (const tag of [...recent, ...(library ?? [])]) {
      if (!tags.some((other) => sameTag(other, tag))) tags.push(tag);
    }
    setKnown(tags);
  });

  // The known tags that start with what's typed, then Create for a new name.
  const choices = createMemo(() => {
    const name = typed();
    if (name === null || props.draft.tags.length >= maxTags) return [];
    const lower = name.toLowerCase();
    const matches = known()
      .filter((tag) => tag.toLowerCase().startsWith(lower))
      .filter((tag) => !props.draft.tags.some((own) => sameTag(own, tag)))
      .slice(0, offered)
      .map((tag) => ({ name: tag, isNew: false }));
    const taken = [...known(), ...props.draft.tags].some((tag) => sameTag(tag, name));
    return name && !taken ? [...matches, { name, isNew: true }] : matches;
  });

  const readTyped = () => {
    const before = field.value.slice(0, field.selectionStart);
    setTyped(/(?:^|\s)#([^\s#]*)$/.exec(before)?.[1] ?? null);
    setActive(0);
  };

  const resize = () => {
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  };

  // The "#name" before the caret becomes a tag.
  const addTag = (name: string) => {
    const caret = field.selectionStart;
    const before = field.value.slice(0, caret).replace(/#[^\s#]*$/, '');
    const comment = `${before}${field.value.slice(caret)}`.replace(/ {2,}/g, ' ');
    props.onChange({ comment, tags: [...props.draft.tags, name.slice(0, maxLength)] });
    setTyped(null);
    queueMicrotask(() => {
      field.setSelectionRange(before.length, before.length);
      resize();
    });
  };

  const removeTag = (tag: string) =>
    props.onChange({ ...props.draft, tags: props.draft.tags.filter((own) => own !== tag) });

  const onKeyDown = (event: KeyboardEvent) => {
    const list = choices();
    if (list.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active() + step + list.length) % list.length);
    } else if (list.length && (event.key === 'Enter' || event.key === 'Tab')) {
      addTag(list[active()].name);
    } else if (event.key === 'Enter' && !event.shiftKey) {
      props.onSave();
    } else if (event.key === 'Escape' && typed() !== null) {
      setTyped(null);
    } else if (event.key === 'Escape') {
      props.onCancel();
    } else if (event.key === 'Backspace' && !field.value && props.draft.tags.length) {
      removeTag(props.draft.tags[props.draft.tags.length - 1]);
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <div
      ref={floating.ref}
      role="dialog"
      aria-label={t.toolbar.commentLabel}
      class={styles.box}
      style={floating.style()}
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLTextAreaElement)) keepSelection(event);
      }}
    >
      <div class={styles.field}>
        <textarea
          ref={field}
          class={styles.textarea}
          rows={2}
          aria-label={t.toolbar.commentLabel}
          value={props.draft.comment}
          onInput={(event) => {
            props.onChange({ ...props.draft, comment: event.currentTarget.value });
            readTyped();
            resize();
          }}
          onClick={readTyped}
          onKeyDown={onKeyDown}
        />
        <Show when={props.draft.tags.length}>
          <span class={styles['field-tags']}>
            <For each={props.draft.tags}>
              {(tag) => (
                <Tag tone="sage" icon={<CloseIcon />} onClick={() => removeTag(tag)}>
                  <span class={styles.hidden}>{t.tags.remove} </span>
                  {tag}
                </Tag>
              )}
            </For>
          </span>
        </Show>
      </div>
      <Show when={choices().length}>
        <div role="listbox" aria-label={t.toolbar.tagChoices} class={styles.choices}>
          <For each={choices()}>
            {(choice, index) => (
              <div
                role="option"
                tabIndex={-1}
                aria-selected={index() === active()}
                class={styles.choice}
                data-new={choice.isNew ? '' : undefined}
                onMouseEnter={() => setActive(index())}
                // On mousedown, so the field keeps the focus and the caret.
                onMouseDown={(event) => {
                  event.preventDefault();
                  addTag(choice.name);
                }}
              >
                {choice.isNew ? <PlusIcon /> : <HashIcon />}
                {choice.isNew ? fill(t.toolbar.createTag, { name: choice.name }) : choice.name}
              </div>
            )}
          </For>
        </div>
      </Show>
      <span class={styles.hint}>{t.toolbar.tagHint}</span>
    </div>
  );
}
