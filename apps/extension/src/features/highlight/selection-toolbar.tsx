import { Button, type HighlightColor, highlightColors, Kbd, TextField } from '@ari/ui-kit';
import { type Accessor, createSignal, For, onMount } from 'solid-js';
import { fill, t } from '~/i18n/i18n';
import { CheckIcon, CommentIcon } from '~/icons';
import { type Anchor, createFloating } from '../page/floating';
import styles from './highlight.module.scss';

// A mousedown in Ari's UI would clear the page's selection before the click saves it.
const keepSelection = (event: MouseEvent) => event.preventDefault();

/** Above a selection: Save (S), the five colors (1–5) and Comment (C). Esc closes it. */
export function SelectionToolbar(props: {
  anchor: Accessor<Anchor | undefined>;
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
      <button type="button" class={styles.comment} onClick={() => props.onComment()}>
        <CommentIcon />
        {t.toolbar.comment}
        <Kbd>C</Kbd>
      </button>
    </div>
  );
}

/** The toolbar's Comment: the highlight is saved with what's written. Enter saves, Esc goes back. */
export function CommentBox(props: {
  anchor: Accessor<Anchor | undefined>;
  /** The color the highlight saves in, which tints the field. */
  color: HighlightColor;
  onSave: (comment: string) => void;
  onCancel: () => void;
}) {
  const floating = createFloating(props.anchor, 'below');
  const [comment, setComment] = createSignal('');
  let box!: HTMLDivElement;
  onMount(() => box.querySelector('textarea')?.focus());

  return (
    <div
      ref={(element) => {
        box = element;
        floating.ref(element);
      }}
      role="dialog"
      aria-label={t.toolbar.commentLabel}
      class={styles.box}
      style={{ ...floating.style(), '--highlight': `var(--ari-hl-${props.color})` }}
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLTextAreaElement)) keepSelection(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          props.onSave(comment().trim());
        } else if (event.key === 'Escape') {
          props.onCancel();
        }
      }}
    >
      <TextField
        label={t.toolbar.commentLabel}
        multiline
        class={styles['comment-field']}
        value={comment()}
        onChange={setComment}
      />
      <div class={styles.actions}>
        <Button variant="ghost" onClick={() => props.onCancel()}>
          {t.toolbar.cancel}
        </Button>
        <Button variant="primary" onClick={() => props.onSave(comment().trim())}>
          {t.toolbar.save}
        </Button>
      </div>
    </div>
  );
}
