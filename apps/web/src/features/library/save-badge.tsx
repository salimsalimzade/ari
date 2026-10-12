import { Match, Switch } from 'solid-js';
import { FileIcon, HighlighterIcon, ScissorsIcon } from './icons';
import type { Save } from './sample';
import styles from './save-badge.module.scss';

/**
 * A save's round badge: a highlighter on its highlight color, scissors for a clip, a file for an
 * import. sm 30px (search), md 36px (lists; 32px on phones).
 */
export function SaveBadge(props: { save: Save; size?: 'sm' | 'md' }) {
  return (
    <span
      class={styles.badge}
      data-kind={props.save.kind}
      data-color={props.save.kind === 'highlight' ? props.save.color : undefined}
      data-size={props.size ?? 'md'}
      aria-hidden="true"
    >
      <KindIcon save={props.save} />
    </span>
  );
}

/** The bare icon of a save's kind, e.g. beside a grid card's source. */
export function KindIcon(props: { save: Save }) {
  return (
    <Switch>
      <Match when={props.save.kind === 'highlight'}>
        <HighlighterIcon />
      </Match>
      <Match when={props.save.kind === 'clip'}>
        <ScissorsIcon />
      </Match>
      <Match when={props.save.kind === 'import'}>
        <FileIcon />
      </Match>
    </Switch>
  );
}
