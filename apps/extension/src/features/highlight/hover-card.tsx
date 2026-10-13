import { Button, ColorPicker, type HighlightColor, Tag } from '@ari/ui-kit';
import { type Accessor, For, Show } from 'solid-js';
import { fill, t } from '~/i18n/i18n';
import { CommentIcon, ExternalIcon, TrashIcon } from '~/icons';
import { type Anchor, createFloating } from '../page/floating';
import type { Save } from '../saves/store';
import styles from './highlight.module.scss';

const commentLength = 90;
const shownTags = 3;

/** Under a saved highlight while the pointer is on it: its color, comment and tags. */
export function HoverCard(props: {
  save: Save;
  anchor: Accessor<Anchor | undefined>;
  onColor: (color: HighlightColor) => void;
  onDelete: () => void;
  onOpen: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const floating = createFloating(props.anchor, 'below');
  const comment = () => {
    const text = props.save.comment ?? '';
    return text.length > commentLength ? `${text.slice(0, commentLength - 4).trim()}…` : text;
  };
  const hiddenTags = () => props.save.tags.length - shownTags;

  return (
    <div
      ref={floating.ref}
      role="dialog"
      aria-label={t.hoverCard.label}
      class={styles.card}
      style={floating.style()}
      onMouseEnter={() => props.onMouseEnter()}
      onMouseLeave={() => props.onMouseLeave()}
    >
      <ColorPicker
        size="sm"
        aria-label={t.hoverCard.color}
        names={t.colors}
        value={props.save.color ?? 'yellow'}
        onChange={(color) => props.onColor(color)}
      />
      <Show when={comment()}>
        <p class={styles['card-comment']}>
          <CommentIcon />
          {comment()}
        </p>
      </Show>
      <Show when={props.save.tags.length}>
        <div class={styles['card-tags']}>
          <For each={props.save.tags.slice(0, shownTags)}>{(tag) => <Tag>{tag}</Tag>}</For>
          <Show when={hiddenTags() > 0}>
            <Tag tone="outline">{fill(t.hoverCard.moreTags, { n: hiddenTags() })}</Tag>
          </Show>
        </div>
      </Show>
      <div class={styles['card-actions']}>
        <Button variant="ghost" icon={<TrashIcon />} onClick={() => props.onDelete()}>
          {t.hoverCard.delete}
        </Button>
        <Button iconAfter={<ExternalIcon />} onClick={() => props.onOpen()}>
          {t.hoverCard.openInAri}
        </Button>
      </div>
    </div>
  );
}
